#!/usr/bin/env node
/**
 * signed-commit.mjs — publish the staged docs-sync change set as a commit
 * that GitHub signs.
 *
 * Why: `master` requires verified signatures. A local `git commit` made by
 * the workflow is unsigned, so every sync PR was blocked. Commits created
 * through GraphQL `createCommitOnBranch` are signed by GitHub and attributed
 * to the token's identity (github-actions[bot] for GITHUB_TOKEN).
 *
 * Security posture (unchanged from the previous `git push -f`):
 *   - Same credential: the job's GITHUB_TOKEN (contents: write).
 *   - Same host: api.github.com. No new secrets, keys, or third-party actions.
 *   - Same path allowlist, re-checked here as defense in depth.
 *   - Only regular 100644 files are accepted (no symlinks, executables,
 *     or submodules), since the API would silently write them as 100644.
 *
 * Flow:
 *   1. Read the staged change set from the index (`git diff --cached --raw`).
 *   2. Reset refs/heads/<branch> to <base sha> (create it if absent). This is
 *      the API equivalent of `git checkout -B <branch> && git push -f`.
 *   3. createCommitOnBranch with expectedHeadOid=<base sha>, so a concurrent
 *      push between steps 2 and 3 fails closed instead of being overwritten.
 *
 * Usage (from the workflow, after `git add`):
 *   node scripts/lib/signed-commit.mjs --branch <name> --message <msg>
 * Env: GITHUB_TOKEN, GITHUB_REPOSITORY, optional GITHUB_API_URL,
 *      GITHUB_GRAPHQL_URL, GITHUB_OUTPUT.
 */

import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// Keep in sync with the allowlist in .github/workflows/base-std-docs-sync.yml.
export const ALLOWED_PATH_RE =
  /^(docs\/[A-Za-z0-9._/-]+\.(md|mdx|txt)|docs\/docs\.json)$/;
// Branch names produced by sync-from-base-std: docs/sync-<kind>-<suffix>.
export const ALLOWED_BRANCH_RE = /^docs\/sync-[A-Za-z0-9._-]+$/;
// Total raw bytes of added/modified file contents. Keeps the GraphQL request
// well under GitHub's request-size limits; docs syncs are far smaller.
export const MAX_COMMIT_BYTES = 8 * 1024 * 1024;

const REGULAR_FILE_MODE = "100644";
const ZERO_MODE = "000000";

export class SignedCommitError extends Error {}

export function assertSafePath(p) {
  if (
    typeof p !== "string" ||
    p.startsWith("/") ||
    p.includes("..") ||
    /[\r\n]/.test(p) ||
    !ALLOWED_PATH_RE.test(p)
  ) {
    throw new SignedCommitError(
      `path '${p}' is outside the docs allowlist (${ALLOWED_PATH_RE})`,
    );
  }
  return p;
}

export function assertSafeBranch(branch) {
  if (
    typeof branch !== "string" ||
    branch.includes("..") ||
    !ALLOWED_BRANCH_RE.test(branch)
  ) {
    throw new SignedCommitError(
      `branch '${branch}' does not match ${ALLOWED_BRANCH_RE}`,
    );
  }
  return branch;
}

/**
 * Parse `git diff --cached --raw --no-renames -z` output into additions
 * (added/modified) and deletions. Each record is
 *   ":<oldmode> <newmode> <oldsha> <newsha> <status>\0<path>\0".
 */
export function parseRawDiff(raw) {
  const parts = raw.split("\0");
  const additions = [];
  const deletions = [];
  for (let i = 0; i < parts.length; i++) {
    const header = parts[i];
    if (header === "") continue;
    const m = /^:(\d{6}) (\d{6}) [0-9a-f]+ [0-9a-f]+ ([A-Z])\d*$/.exec(header);
    if (!m) {
      throw new SignedCommitError(`unparseable diff record '${header}'`);
    }
    const [, oldMode, newMode, status] = m;
    const p = parts[++i];
    if (p === undefined) {
      throw new SignedCommitError(`diff record '${header}' has no path`);
    }
    assertSafePath(p);
    if (status === "A" || status === "M") {
      if (newMode !== REGULAR_FILE_MODE) {
        throw new SignedCommitError(
          `path '${p}' has mode ${newMode}; only regular ${REGULAR_FILE_MODE} files are allowed`,
        );
      }
      if (status === "M" && oldMode !== REGULAR_FILE_MODE) {
        throw new SignedCommitError(
          `path '${p}' changes mode ${oldMode} -> ${newMode}; mode changes are not allowed`,
        );
      }
      additions.push(p);
    } else if (status === "D") {
      if (newMode !== ZERO_MODE) {
        throw new SignedCommitError(`deleted path '${p}' has unexpected mode ${newMode}`);
      }
      deletions.push(p);
    } else {
      throw new SignedCommitError(
        `path '${p}' has unsupported status '${status}' (only A, M, D are allowed)`,
      );
    }
  }
  return { additions, deletions };
}

/**
 * Build the createCommitOnBranch `fileChanges` input. `readContent(path)`
 * returns a Buffer of the staged blob.
 */
export function buildFileChanges({ additions, deletions }, readContent, maxBytes = MAX_COMMIT_BYTES) {
  let total = 0;
  const adds = additions.map((p) => {
    const buf = readContent(p);
    total += buf.length;
    if (total > maxBytes) {
      throw new SignedCommitError(
        `staged content exceeds ${maxBytes} bytes; refusing to build an oversized commit`,
      );
    }
    return { path: p, contents: buf.toString("base64") };
  });
  return {
    additions: adds,
    deletions: deletions.map((p) => ({ path: p })),
  };
}

export const CREATE_COMMIT_MUTATION = `
mutation($input: CreateCommitOnBranchInput!) {
  createCommitOnBranch(input: $input) {
    commit { oid url }
  }
}`;

export function buildCommitInput({ repo, branch, baseSha, message, fileChanges }) {
  return {
    branch: { repositoryNameWithOwner: repo, branchName: branch },
    expectedHeadOid: baseSha,
    message: { headline: message },
    fileChanges,
  };
}

async function api(method, url, token, body) {
  const res = await fetch(url, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

/** Point refs/heads/<branch> at baseSha, creating the ref if needed. */
export async function resetBranch({ apiUrl, repo, branch, baseSha, token, request = api }) {
  const refUrl = `${apiUrl}/repos/${repo}/git/refs/heads/${branch}`;
  const patched = await request("PATCH", refUrl, token, { sha: baseSha, force: true });
  if (patched.status === 200) return "reset";
  // 422 "Reference does not exist" (or 404) → create it.
  if (patched.status === 422 || patched.status === 404) {
    const created = await request("POST", `${apiUrl}/repos/${repo}/git/refs`, token, {
      ref: `refs/heads/${branch}`,
      sha: baseSha,
    });
    if (created.status === 201) return "created";
    throw new SignedCommitError(
      `creating ref ${branch} failed (HTTP ${created.status}): ${JSON.stringify(created.json)}`,
    );
  }
  throw new SignedCommitError(
    `resetting ref ${branch} failed (HTTP ${patched.status}): ${JSON.stringify(patched.json)}`,
  );
}

export async function createSignedCommit({ graphqlUrl, token, input, request = api }) {
  const res = await request("POST", graphqlUrl, token, {
    query: CREATE_COMMIT_MUTATION,
    variables: { input },
  });
  const commit = res.json?.data?.createCommitOnBranch?.commit;
  if (res.status !== 200 || res.json?.errors || !commit?.oid) {
    throw new SignedCommitError(
      `createCommitOnBranch failed (HTTP ${res.status}): ${JSON.stringify(res.json?.errors ?? res.json)}`,
    );
  }
  return commit;
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--branch" || a === "--message") {
      out[a.slice(2)] = argv[++i];
    } else {
      throw new SignedCommitError(`unknown argument '${a}'`);
    }
  }
  return out;
}

function git(args, opts = {}) {
  return execFileSync("git", args, { maxBuffer: 64 * 1024 * 1024, ...opts });
}

async function main() {
  const { branch, message } = parseArgs(process.argv.slice(2));
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  const apiUrl = process.env.GITHUB_API_URL || "https://api.github.com";
  const graphqlUrl = process.env.GITHUB_GRAPHQL_URL || `${apiUrl}/graphql`;

  if (!token) throw new SignedCommitError("GITHUB_TOKEN is not set");
  if (!repo || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
    throw new SignedCommitError(`GITHUB_REPOSITORY '${repo}' is invalid`);
  }
  if (!message || /[\r\n]/.test(message)) {
    throw new SignedCommitError("--message is required and must be a single line");
  }
  assertSafeBranch(branch);

  const baseSha = git(["rev-parse", "HEAD"]).toString().trim();
  if (!/^[0-9a-f]{40}$/.test(baseSha)) {
    throw new SignedCommitError(`HEAD '${baseSha}' is not a commit sha`);
  }

  const raw = git(["diff", "--cached", "--raw", "--no-renames", "--no-abbrev", "-z"]).toString();
  const changes = parseRawDiff(raw);
  if (changes.additions.length + changes.deletions.length === 0) {
    throw new SignedCommitError("no staged changes to commit");
  }
  // Read the staged blob (index stage 0), not the working tree.
  const fileChanges = buildFileChanges(changes, (p) => git(["show", `:${p}`]));

  const refAction = await resetBranch({ apiUrl, repo, branch, baseSha, token });
  console.log(`[signed-commit] ${refAction} ${branch} at ${baseSha.slice(0, 7)}`);

  const commit = await createSignedCommit({
    graphqlUrl,
    token,
    input: buildCommitInput({ repo, branch, baseSha, message, fileChanges }),
  });
  console.log(
    `[signed-commit] committed ${commit.oid.slice(0, 7)} (+${changes.additions.length} -${changes.deletions.length}) ${commit.url}`,
  );

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `commit_sha=${commit.oid}\n`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((err) => {
    const msg = String(err?.message ?? err).replace(/\r/g, "%0D").replace(/\n/g, "%0A");
    console.error(`::error title=Signed commit failed::${msg}`);
    process.exit(1);
  });
}
