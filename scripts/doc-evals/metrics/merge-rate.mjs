#!/usr/bin/env node
/**
 * merge-rate.mjs — pipeline-level merge-rate metrics for the base-std docs
 * sync bot. PLAN.md Lane C §1.
 *
 * CLI:
 *   node scripts/doc-evals/metrics/merge-rate.mjs \
 *     [--owner <org>] [--repo <name>] [--since <ISO date>] \
 *     [--json-out <path>] [--md-out <path>]
 *
 * Without --json-out/--md-out, both the JSON report and its markdown
 * rendering print to stdout (handy for a local smoke run). With them, the
 * report is written to disk and only a one-line summary prints — this is
 * what the report workflow uses.
 *
 * GitHub access here is entirely read-only (GET). Token: GITHUB_TOKEN env
 * var, else `gh auth token`.
 */

import fs from "node:fs/promises";
import {
  resolveToken,
  listBotPullRequests,
  listMergedPullRequestsSince,
  fetchPRCommits,
  fetchCommitStats,
  fetchPRFiles,
} from "./github.mjs";
import { median, rate, hoursBetween, isStale, humanRewriteRatio, findSupersedingPRs } from "./stats.mjs";
import { isBotLogin } from "./taxonomy.mjs";

const DEFAULT_OWNER = "base";
const DEFAULT_REPO = "docs";
const STALE_DAYS = 7;

/**
 * Fetch everything `buildMergeRateReport` needs for one bot PR beyond the
 * PR object itself: ordered commits (with bot/human + line stats for the
 * tail after the first bot commit) and changed file paths.
 * @param {string} owner
 * @param {string} repo
 * @param {any} pr Raw PR object from listBotPullRequests.
 * @param {string} token
 * @param {{fetchImpl?: Function}} [opts]
 */
export async function gatherPRDetail(owner, repo, pr, token, { fetchImpl } = {}) {
  const commits = await fetchPRCommits(owner, repo, pr.number, token, { fetchImpl });
  const firstBotIndex = commits.findIndex((c) => isBotLogin(c.login));
  const tail = firstBotIndex === -1 ? [] : commits.slice(firstBotIndex + 1);
  const tailWithStats = await Promise.all(
    tail.map(async (c) => {
      const stats = await fetchCommitStats(owner, repo, c.sha, token, { fetchImpl });
      return { ...c, isBot: isBotLogin(c.login), ...stats };
    }),
  );
  const commitsForRatio = [
    ...commits.slice(0, firstBotIndex + 1).map((c) => ({ ...c, isBot: isBotLogin(c.login) })),
    ...tailWithStats,
  ];
  const files = await fetchPRFiles(owner, repo, pr.number, token, { fetchImpl });
  return { commits: commitsForRatio, files };
}

/**
 * Pure aggregation over already-fetched PR + detail data. No network.
 * @param {any[]} prs Bot PR objects (from listBotPullRequests), optionally
 *   pre-filtered by `--since`.
 * @param {Map<number, {commits: any[], files: string[]}>} detailByNumber
 * @param {{number: number, files: string[]}[]} mergedCandidates PRs (any
 *   author) merged after the earliest bot PR in `prs`, for the superseded
 *   check.
 * @param {{nowMs?: number, staleDays?: number}} [opts]
 */
export function buildMergeRateReport(prs, detailByNumber, mergedCandidates, { nowMs = Date.now(), staleDays = STALE_DAYS } = {}) {
  const opened = prs.length;
  const merged = prs.filter((pr) => pr.merged_at);
  const closedUnmerged = prs.filter((pr) => pr.state === "closed" && !pr.merged_at);
  const open = prs.filter((pr) => pr.state === "open");
  const openAndStale = open.filter((pr) => isStale(pr.updated_at, staleDays, nowMs));

  const mergeTimesHours = merged.map((pr) => hoursBetween(pr.created_at, pr.merged_at));
  const medianTimeToMergeHours = median(mergeTimesHours);

  const rewriteRatios = merged
    .map((pr) => {
      const detail = detailByNumber.get(pr.number);
      if (!detail) return null;
      const totalChangedLines = (pr.additions ?? 0) + (pr.deletions ?? 0);
      const ratio = humanRewriteRatio(detail.commits, totalChangedLines);
      return ratio === null ? null : { number: pr.number, ratio };
    })
    .filter(Boolean);

  const superseded = open
    .map((pr) => {
      const detail = detailByNumber.get(pr.number);
      if (!detail) return null;
      const candidates = mergedCandidates.filter((m) => m.mergedAt > pr.created_at);
      const overlapping = findSupersedingPRs({ number: pr.number, files: detail.files }, candidates);
      return overlapping.length ? { number: pr.number, supersededBy: overlapping.map((m) => m.number) } : null;
    })
    .filter(Boolean);

  return {
    opened,
    merged: merged.length,
    closedUnmerged: closedUnmerged.length,
    open: open.length,
    openAndStale: openAndStale.length,
    mergeRate: rate(merged.length, opened),
    medianTimeToMergeHours,
    humanRewriteRatios: rewriteRatios,
    superseded,
    prNumbers: {
      opened: prs.map((p) => p.number),
      merged: merged.map((p) => p.number),
      closedUnmerged: closedUnmerged.map((p) => p.number),
      open: open.map((p) => p.number),
      openAndStale: openAndStale.map((p) => p.number),
    },
  };
}

/** @param {ReturnType<typeof buildMergeRateReport>} report */
export function renderMergeRateMarkdown(report, { owner = DEFAULT_OWNER, repo = DEFAULT_REPO } = {}) {
  const pct = (r) => (r === null ? "n/a" : `${(r * 100).toFixed(1)}%`);
  const hours = (h) => (h === null ? "n/a" : `${h.toFixed(1)}h`);
  const lines = [];
  lines.push(`## Merge rate (${owner}/${repo})`);
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|---|---|");
  lines.push(`| Opened | ${report.opened} |`);
  lines.push(`| Merged | ${report.merged} |`);
  lines.push(`| Closed, unmerged | ${report.closedUnmerged} |`);
  lines.push(`| Open | ${report.open} |`);
  lines.push(`| Open and stale (>7d no activity) | ${report.openAndStale} |`);
  lines.push(`| Merge rate | ${pct(report.mergeRate)} |`);
  lines.push(`| Median time to merge | ${hours(report.medianTimeToMergeHours)} |`);
  lines.push("");
  if (report.humanRewriteRatios.length) {
    lines.push("### Human rewrite ratio (merged PRs)");
    lines.push("");
    lines.push("Share of lines changed by non-bot commits after the bot's first commit.");
    lines.push("");
    lines.push("| PR | Ratio |");
    lines.push("|---|---|");
    for (const r of report.humanRewriteRatios) {
      lines.push(`| #${r.number} | ${pct(r.ratio)} |`);
    }
    lines.push("");
  }
  if (report.superseded.length) {
    lines.push("### Superseded open PRs");
    lines.push("");
    lines.push("Open bot PRs whose files were later touched by a merged PR (likely obsolete).");
    lines.push("");
    for (const s of report.superseded) {
      lines.push(`- #${s.number} — superseded by ${s.supersededBy.map((n) => `#${n}`).join(", ")}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

/**
 * End-to-end run: fetch, then aggregate. Exported for reuse by report.mjs
 * so the workflow doesn't shell out twice.
 * @param {{owner?: string, repo?: string, since?: string, fetchImpl?: Function, token?: string}} [opts]
 */
export async function run({ owner = DEFAULT_OWNER, repo = DEFAULT_REPO, since, fetchImpl, token } = {}) {
  const tok = token ?? resolveToken();
  const allBotPRs = await listBotPullRequests(owner, repo, tok, { fetchImpl });
  const prs = since ? allBotPRs.filter((pr) => pr.created_at >= since) : allBotPRs;

  const detailByNumber = new Map();
  for (const pr of prs) {
    // eslint-disable-next-line no-await-in-loop -- sequential to stay
    // well under GitHub's rate limit; this list is small (~tens of PRs).
    detailByNumber.set(pr.number, await gatherPRDetail(owner, repo, pr, tok, { fetchImpl }));
  }

  const earliestCreatedAt = prs.reduce((min, pr) => (min === null || pr.created_at < min ? pr.created_at : min), null);
  let mergedCandidates = [];
  if (earliestCreatedAt) {
    const mergedSince = await listMergedPullRequestsSince(owner, repo, tok, { fetchImpl, sinceIso: earliestCreatedAt });
    mergedCandidates = await Promise.all(
      mergedSince.map(async (pr) => ({
        number: pr.number,
        mergedAt: pr.merged_at,
        files: await fetchPRFiles(owner, repo, pr.number, tok, { fetchImpl }),
      })),
    );
  }

  return buildMergeRateReport(prs, detailByNumber, mergedCandidates);
}

function parseArgs(argv) {
  const args = { owner: DEFAULT_OWNER, repo: DEFAULT_REPO };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--owner") args.owner = argv[++i];
    else if (a === "--repo") args.repo = argv[++i];
    else if (a === "--since") args.since = argv[++i];
    else if (a === "--json-out") args.jsonOut = argv[++i];
    else if (a === "--md-out") args.mdOut = argv[++i];
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const report = await run(args);
  const markdown = renderMergeRateMarkdown(report, args);

  if (args.jsonOut) {
    await fs.writeFile(args.jsonOut, `${JSON.stringify(report, null, 2)}\n`);
  }
  if (args.mdOut) {
    await fs.writeFile(args.mdOut, `${markdown}\n`);
  }
  if (!args.jsonOut && !args.mdOut) {
    console.log(JSON.stringify(report, null, 2));
    console.log("");
    console.log(markdown);
  } else {
    console.log(`Merge rate: opened=${report.opened} merged=${report.merged} open=${report.open} closedUnmerged=${report.closedUnmerged}`);
  }
}

const isMain = process.argv[1] && new URL(import.meta.url).pathname === process.argv[1];
if (isMain) {
  main().catch((err) => {
    console.error(err.stack || err.message);
    process.exitCode = 1;
  });
}
