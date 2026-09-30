#!/usr/bin/env node
/**
 * report.mjs — assembles the weekly "Docs sync quality report" issue body
 * from merge-rate.mjs + mine-feedback.mjs and creates/updates that issue.
 * PLAN.md Lane C §3, run by .github/workflows/doc-quality-report.yml.
 *
 * This is the one place in Lane C that writes to GitHub. Everything else
 * in scripts/doc-evals/metrics/** only does GET requests.
 *
 * CLI:
 *   node scripts/doc-evals/metrics/report.mjs [--owner <org>] [--repo <name>] [--dry-run]
 *
 * `--dry-run` prints the issue title + body and does not touch GitHub —
 * this is the flag PLAN.md's Lane C acceptance step calls for ("Do not
 * create the issue; add a --dry-run that prints the issue body and use
 * it").
 *
 * Runs both underlying analyses in heuristic mode only (mine-feedback's
 * `--llm` flag is never passed here), and never writes candidate case
 * files — report.mjs only needs the taxonomy counts for the issue body,
 * not the drafted cases themselves (those come from running
 * mine-feedback.mjs directly, as its own CLI).
 */

import { resolveToken, paginateAll, API_ROOT } from "./github.mjs";
import { run as runMergeRate, renderMergeRateMarkdown } from "./merge-rate.mjs";
import { run as runMineFeedback, renderTaxonomyMarkdown } from "./mine-feedback.mjs";

const DEFAULT_OWNER = "base";
const DEFAULT_REPO = "docs";
export const ISSUE_TITLE = "Docs sync quality report";

/**
 * Pure: combine both analyses' markdown into the final issue body.
 * @param {ReturnType<typeof import("./merge-rate.mjs").buildMergeRateReport>} mergeRateReport
 * @param {{counts: Record<string, number>}} feedback
 */
export function buildIssueBody(mergeRateReport, feedback, { owner = DEFAULT_OWNER, repo = DEFAULT_REPO } = {}) {
  const generatedAt = new Date().toISOString();
  const body = [
    "_Non-blocking pipeline metrics for the base-std docs sync bot. Nothing here gates a merge._",
    "",
    renderMergeRateMarkdown(mergeRateReport, { owner, repo }),
    "",
    renderTaxonomyMarkdown(feedback.counts, { owner, repo }),
    "",
    `_Generated ${generatedAt} by \`.github/workflows/doc-quality-report.yml\`._`,
  ].join("\n");
  return { title: ISSUE_TITLE, body };
}

/**
 * Find the report issue by exact title (never by search — a title
 * substring match could hit an unrelated issue). Returns its number, or
 * null when no open issue has that exact title yet.
 */
export async function findExistingIssue(owner, repo, token, { fetchImpl } = {}) {
  const issues = await paginateAll(`${API_ROOT}/repos/${owner}/${repo}/issues?state=open&creator=app%2Fgithub-actions`, token, { fetchImpl });
  const match = issues.find((issue) => !issue.pull_request && issue.title === ISSUE_TITLE);
  return match ? match.number : null;
}

/** Create the issue, or update it in place if one with the exact title already exists. */
export async function upsertIssue(owner, repo, token, { title, body }, { fetchImpl = fetch } = {}) {
  const existing = await findExistingIssue(owner, repo, token, { fetchImpl });
  const url = existing
    ? `${API_ROOT}/repos/${owner}/${repo}/issues/${existing}`
    : `${API_ROOT}/repos/${owner}/${repo}/issues`;
  const res = await fetchImpl(url, {
    method: existing ? "PATCH" : "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title, body }),
  });
  if (!res.ok) {
    const text = typeof res.text === "function" ? await res.text() : "";
    throw new Error(`GitHub API ${existing ? "PATCH" : "POST"} issue failed: HTTP ${res.status} ${text}`);
  }
  const json = await res.json();
  return { number: json.number, htmlUrl: json.html_url, updated: Boolean(existing) };
}

function parseArgs(argv) {
  const args = { owner: DEFAULT_OWNER, repo: DEFAULT_REPO };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--owner") args.owner = argv[++i];
    else if (a === "--repo") args.repo = argv[++i];
    else if (a === "--dry-run") args.dryRun = true;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const token = resolveToken();
  const [mergeRateReport, feedback] = await Promise.all([
    runMergeRate({ owner: args.owner, repo: args.repo, token }),
    runMineFeedback({ owner: args.owner, repo: args.repo, token, llm: false }),
  ]);
  const { title, body } = buildIssueBody(mergeRateReport, feedback, args);

  if (args.dryRun) {
    console.log(`# ${title}\n`);
    console.log(body);
    return;
  }

  const result = await upsertIssue(args.owner, args.repo, token, { title, body });
  console.log(`${result.updated ? "Updated" : "Created"} issue #${result.number}: ${result.htmlUrl}`);
}

const isMain = process.argv[1] && new URL(import.meta.url).pathname === process.argv[1];
if (isMain) {
  main().catch((err) => {
    console.error(err.stack || err.message);
    process.exitCode = 1;
  });
}
