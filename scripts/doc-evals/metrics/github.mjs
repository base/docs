/**
 * github.mjs — thin, dependency-free REST client for Lane C's metrics
 * scripts (merge-rate.mjs, mine-feedback.mjs, report.mjs).
 *
 * Deliberately REST + `fetch`, not GraphQL: the plan calls out that
 * base/docs's PR volume (1000+) makes GraphQL node-limit errors likely.
 * Every list call here paginates via the `Link: rel="next"` header instead
 * of GraphQL cursors.
 *
 * All network calls take an injectable `fetchImpl` (default: global
 * `fetch`) so unit tests can pass a fake and stay fully offline — no
 * network, no `gh`, per the ground rules.
 *
 * GitHub access from these scripts is read-only: every function here is a
 * GET. The one write path in this lane (create/update the tracking issue)
 * lives in report.mjs, not here.
 */

import { execFileSync } from "node:child_process";

const API_ROOT = "https://api.github.com";

/**
 * Resolve a GitHub token: prefer GITHUB_TOKEN from the environment, fall
 * back to `gh auth token`. Never logs the token itself.
 * @param {NodeJS.ProcessEnv} [env]
 * @param {(cmd: string, args: string[], opts: object) => string} [execFileSyncImpl]
 * @returns {string}
 */
export function resolveToken(env = process.env, execFileSyncImpl = execFileSync) {
  const fromEnv = env.GITHUB_TOKEN && env.GITHUB_TOKEN.trim();
  if (fromEnv) return fromEnv;
  try {
    const out = execFileSyncImpl("gh", ["auth", "token"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const token = out.trim();
    if (token) return token;
  } catch {
    // fall through to the error below
  }
  throw new Error(
    "No GitHub token available: set GITHUB_TOKEN or run `gh auth login` so `gh auth token` works.",
  );
}

/**
 * Parse the `rel="next"` URL out of a GitHub `Link` response header value.
 * Pure function — works whether the header was read via fetch's
 * `Headers#get` or a plain string in a test fixture.
 * @param {string|null|undefined} linkHeader
 * @returns {string|null}
 */
export function parseNextLink(linkHeader) {
  if (!linkHeader) return null;
  for (const part of linkHeader.split(",")) {
    const match = part.match(/<([^>]+)>\s*;\s*rel="next"/);
    if (match) return match[1];
  }
  return null;
}

function headerValue(headers, name) {
  if (!headers) return null;
  if (typeof headers.get === "function") return headers.get(name);
  return headers[name] ?? headers[name.toLowerCase()] ?? null;
}

/**
 * One authenticated GET against the GitHub REST API.
 * @param {string} url
 * @param {string} token
 * @param {{fetchImpl?: Function}} [opts]
 * @returns {Promise<{status: number, ok: boolean, json: any, headers: any}>}
 */
export async function ghGet(url, token, { fetchImpl = fetch } = {}) {
  const res = await fetchImpl(url, {
    method: "GET",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  const text = typeof res.text === "function" ? await res.text() : "";
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }
  const ok = res.ok !== undefined ? res.ok : res.status < 400;
  return { status: res.status, ok, json, headers: res.headers ?? {} };
}

/**
 * Follow `Link: rel="next"` pagination until exhausted, concatenating
 * array responses (a non-array single-object response is wrapped in a
 * one-element array). Throws on any non-2xx response — fail closed,
 * because a swallowed page failure would silently understate every
 * metric downstream.
 * @param {string} url First page URL.
 * @param {string} token
 * @param {{fetchImpl?: Function, perPage?: number, maxPages?: number}} [opts]
 * @returns {Promise<any[]>}
 */
export async function paginateAll(url, token, { fetchImpl = fetch, perPage = 100, maxPages = 100 } = {}) {
  let next = url.includes("per_page=") ? url : `${url}${url.includes("?") ? "&" : "?"}per_page=${perPage}`;
  const items = [];
  let pages = 0;
  while (next && pages < maxPages) {
    const { status, ok, json, headers } = await ghGet(next, token, { fetchImpl });
    if (!ok) {
      throw new Error(`GitHub API GET ${next} failed: HTTP ${status} ${JSON.stringify(json)}`);
    }
    if (Array.isArray(json)) {
      items.push(...json);
    } else if (json) {
      items.push(json);
    }
    next = parseNextLink(headerValue(headers, "link"));
    pages += 1;
  }
  return items;
}

/** Matches the bot's PR head-branch naming scheme, per PLAN.md Lane C §1. */
export const BOT_HEAD_BRANCH_RE = /^docs\/sync-(code-change|release)-/;

/**
 * List every PR opened by the base-std sync bot on a repo: those whose
 * head branch matches `docs/sync-code-change-*` or `docs/sync-release-*`.
 * Paginated REST list (`state=all`), filtered client-side — the list
 * endpoint has no head-branch-prefix filter.
 * @param {string} owner
 * @param {string} repo
 * @param {string} token
 * @param {{fetchImpl?: Function, state?: string}} [opts]
 * @returns {Promise<any[]>}
 */
export async function listBotPullRequests(owner, repo, token, { fetchImpl = fetch, state = "all" } = {}) {
  const url = `${API_ROOT}/repos/${owner}/${repo}/pulls?state=${state}&sort=created&direction=asc`;
  const prs = await paginateAll(url, token, { fetchImpl });
  return prs.filter((pr) => BOT_HEAD_BRANCH_RE.test(pr.head?.ref ?? ""));
}

/**
 * List every merged PR on a repo created/merged at or after `sinceIso`
 * (both filters applied client-side since the list endpoint only supports
 * sorting, not a date filter). Used for the "superseded" check, which
 * needs to know what merged elsewhere after a given bot PR opened.
 * @param {string} owner
 * @param {string} repo
 * @param {string} token
 * @param {{fetchImpl?: Function, sinceIso?: string, maxPages?: number}} [opts]
 * @returns {Promise<any[]>}
 */
export async function listMergedPullRequestsSince(owner, repo, token, { fetchImpl = fetch, sinceIso, maxPages = 20 } = {}) {
  const url = `${API_ROOT}/repos/${owner}/${repo}/pulls?state=closed&sort=updated&direction=desc`;
  const closed = await paginateAll(url, token, { fetchImpl, maxPages });
  return closed.filter((pr) => pr.merged_at && (!sinceIso || pr.merged_at >= sinceIso));
}

/**
 * Ordered list of commits on a PR (author login + sha only — the list
 * endpoint doesn't include per-commit line stats).
 * @returns {Promise<{sha: string, login: string|null}[]>}
 */
export async function fetchPRCommits(owner, repo, prNumber, token, { fetchImpl = fetch } = {}) {
  const url = `${API_ROOT}/repos/${owner}/${repo}/pulls/${prNumber}/commits`;
  const commits = await paginateAll(url, token, { fetchImpl });
  return commits.map((c) => ({ sha: c.sha, login: c.author?.login ?? null }));
}

/**
 * Additions/deletions for one commit, via the single-commit endpoint (the
 * PR-commits list above omits stats).
 * @returns {Promise<{additions: number, deletions: number}>}
 */
export async function fetchCommitStats(owner, repo, sha, token, { fetchImpl = fetch } = {}) {
  const { status, ok, json } = await ghGet(`${API_ROOT}/repos/${owner}/${repo}/commits/${sha}`, token, { fetchImpl });
  if (!ok) throw new Error(`GitHub API GET commit ${sha} failed: HTTP ${status}`);
  return { additions: json?.stats?.additions ?? 0, deletions: json?.stats?.deletions ?? 0 };
}

/**
 * Changed file paths for a PR (paginated `/files`).
 * @returns {Promise<string[]>}
 */
export async function fetchPRFiles(owner, repo, prNumber, token, { fetchImpl = fetch } = {}) {
  const url = `${API_ROOT}/repos/${owner}/${repo}/pulls/${prNumber}/files`;
  const files = await paginateAll(url, token, { fetchImpl });
  return files.map((f) => f.filename);
}

/**
 * Additions/deletions for a whole PR. The list endpoint used by
 * `listBotPullRequests` (`GET /pulls`) does not include these fields —
 * only the single-PR endpoint does — so callers that need a PR's total
 * changed-line count (e.g. the human rewrite ratio) must fetch it here
 * per PR, not read `pr.additions`/`pr.deletions` off a list-endpoint item.
 * @param {string} owner
 * @param {string} repo
 * @param {number} prNumber
 * @param {string} token
 * @param {{fetchImpl?: Function}} [opts]
 * @returns {Promise<{additions: number, deletions: number}>}
 */
export async function fetchPRTotals(owner, repo, prNumber, token, { fetchImpl = fetch } = {}) {
  const { status, ok, json } = await ghGet(`${API_ROOT}/repos/${owner}/${repo}/pulls/${prNumber}`, token, { fetchImpl });
  if (!ok) throw new Error(`GitHub API GET pull ${prNumber} failed: HTTP ${status}`);
  return { additions: json?.additions ?? 0, deletions: json?.deletions ?? 0 };
}

/**
 * Unified feed of a PR's human-facing discussion: review summaries,
 * inline review comments, and top-level issue comments. Each entry is
 * normalized to `{login, body, url, path}` (`path` is null for
 * PR-level/issue comments and review summaries).
 * @returns {Promise<{login: string, body: string, url: string, path: string|null}[]>}
 */
export async function fetchPRDiscussion(owner, repo, prNumber, token, { fetchImpl = fetch } = {}) {
  const [reviews, reviewComments, issueComments] = await Promise.all([
    paginateAll(`${API_ROOT}/repos/${owner}/${repo}/pulls/${prNumber}/reviews`, token, { fetchImpl }),
    paginateAll(`${API_ROOT}/repos/${owner}/${repo}/pulls/${prNumber}/comments`, token, { fetchImpl }),
    paginateAll(`${API_ROOT}/repos/${owner}/${repo}/issues/${prNumber}/comments`, token, { fetchImpl }),
  ]);
  const normalize = (path) => (item) => ({
    login: item.user?.login ?? null,
    body: item.body ?? "",
    url: item.html_url ?? item.url ?? "",
    path: path(item),
  });
  return [
    ...reviews.filter((r) => r.body).map(normalize(() => null)),
    ...reviewComments.map(normalize((c) => c.path ?? null)),
    ...issueComments.map(normalize(() => null)),
  ];
}

export { API_ROOT };
