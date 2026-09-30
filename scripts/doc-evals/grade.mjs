#!/usr/bin/env node
/**
 * Grader CLI. See PLAN.md, "Lane B: graders", item 4.
 *
 *   node scripts/doc-evals/grade.mjs <run-dir> [--no-judge] [--no-pairwise] [--variance]
 *                                    [--cases-dir <dir>]
 *
 * `<run-dir>` is `scripts/doc-evals/runs/<run-id>/` (see PLAN.md, "Replay
 * output"): one subdirectory per case id, each holding `rep-<n>/`
 * directories. For every rep this loads the matching case file (default
 * `scripts/doc-evals/cases/<caseId>.json`; `--cases-dir` overrides where —
 * needed because Lane A owns `cases/**` and this lane's own tests use tiny
 * fixtures instead of real case files), grades it with `gradeRep` (the
 * reusable core in `graders/gradeRep.mjs`, exported for the hillclimb),
 * and writes `grade.json` next to `meta.json`. Then writes `summary.md` +
 * `summary.json` for the whole run: a per-case table, train/test split
 * means, and total grading cost (the judge + pairwise calls this CLI
 * made — the replay's own generation cost lives separately in each rep's
 * `bench.jsonl`).
 *
 * `--variance` additionally runs the judge twice per touched page on the
 * same after-content and reports per-claim agreement (PLAN.md item 4) as a
 * report-only section appended to `summary.md` — it is not part of the
 * `grade.json` contract shape.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { gradeRep, buildRunSummary, loadRun } from "./graders/gradeRep.mjs";
import { isDocPage } from "./graders/checks/shared.mjs";
import { roleForPage } from "./graders/pageRole.mjs";
import { judgePage } from "./graders/judge.mjs";
import { CLAIMS } from "./graders/judge/prompt.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CASES_DIR = path.join(__dirname, "cases");

function parseArgs(argv) {
  const args = { runDir: null, noJudge: false, noPairwise: false, variance: false, casesDir: DEFAULT_CASES_DIR };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--no-judge") args.noJudge = true;
    else if (a === "--no-pairwise") args.noPairwise = true;
    else if (a === "--variance") args.variance = true;
    else if (a === "--cases-dir") args.casesDir = argv[++i];
    else if (!args.runDir) args.runDir = a;
  }
  return args;
}

/**
 * Judge every touched page twice on the same after-content and report, per
 * claim, the fraction of pages where both runs agreed on pass/fail.
 * Disagreement on a claim that's supposed to be a deterministic yes/no
 * check is exactly the signal `--variance` exists to surface (PLAN.md item 4).
 *
 * @param {object} caseDef
 * @param {string} repDir
 * @returns {Promise<string>} a markdown fragment
 */
async function runVarianceCheck(caseDef, repDir) {
  const run = await loadRun(repDir);
  const perClaim = new Map(CLAIMS.map((c) => [c.id, { agree: 0, total: 0 }]));

  for (const [page, afterText] of run.after) {
    if (!isDocPage(page)) continue;
    const ctx = {
      page,
      pageRole: roleForPage(page),
      sourceDiff: caseDef?.payload?.diff,
      beforePage: run.before.get(page) ?? "",
      afterPage: afterText,
      reviewFindings: (caseDef?.review_findings || []).filter((f) => f?.page === page),
    };
    const [a, b] = await Promise.all([judgePage(ctx), judgePage(ctx)]);
    for (const claim of CLAIMS) {
      const passA = a.checks.find((c) => c.id === `judge.${claim.id}`)?.pass;
      const passB = b.checks.find((c) => c.id === `judge.${claim.id}`)?.pass;
      const bucket = perClaim.get(claim.id);
      bucket.total++;
      if (passA === passB) bucket.agree++;
    }
  }

  const lines = ["| Claim | Agreement |", "|---|---|"];
  for (const [id, { agree, total }] of perClaim) {
    lines.push(`| ${id} | ${total === 0 ? "n/a" : `${agree}/${total} (${((agree / total) * 100).toFixed(0)}%)`} |`);
  }
  return lines.join("\n");
}

function renderSummaryMd(runId, runSummary, varianceReport) {
  const lines = [`# Grade summary: ${runId}`, ""];
  lines.push("| Case | Split | Reps | Mean overall |", "|---|---|---|---|");
  for (const c of runSummary.casesTable) {
    lines.push(`| ${c.caseId} | ${c.split ?? "-"} | ${c.reps} | ${c.meanOverall?.toFixed(3) ?? "-"} |`);
  }
  lines.push(
    "",
    `Train mean: ${runSummary.splitMeans.train?.toFixed(3) ?? "n/a"}`,
    `Test mean: ${runSummary.splitMeans.test?.toFixed(3) ?? "n/a"}`,
    `Grading cost: ${runSummary.totalCost.inputTokens} input / ${runSummary.totalCost.outputTokens} output tokens`,
  );
  if (varianceReport) lines.push("", "## Judge variance (--variance)", "", varianceReport);
  return lines.join("\n") + "\n";
}

async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (!args.runDir) {
    console.error("usage: node grade.mjs <run-dir> [--no-judge] [--no-pairwise] [--variance] [--cases-dir <dir>]");
    return 1;
  }
  const runDir = path.resolve(args.runDir);
  const runId = path.basename(runDir);
  const caseIds = (await fs.readdir(runDir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);

  const entries = [];
  const varianceSections = [];
  for (const caseId of caseIds) {
    const caseDef = JSON.parse(await fs.readFile(path.join(args.casesDir, `${caseId}.json`), "utf8"));
    const caseDir = path.join(runDir, caseId);
    const repNames = (await fs.readdir(caseDir, { withFileTypes: true }))
      .filter((e) => e.isDirectory() && e.name.startsWith("rep-"))
      .map((e) => e.name);
    for (const repName of repNames) {
      const repDir = path.join(caseDir, repName);
      const grade = await gradeRep(caseDef, repDir, { noJudge: args.noJudge, noPairwise: args.noPairwise });
      entries.push({ caseId, rep: grade.rep, split: caseDef.split ?? null, grade });
      console.log(`[grade] ${caseId}/${repName}: overall=${grade.summary.overall.toFixed(3)}`);
      if (args.variance && !args.noJudge) {
        varianceSections.push(`### ${caseId}/${repName}\n\n${await runVarianceCheck(caseDef, repDir)}`);
      }
    }
  }

  const runSummary = buildRunSummary(entries);
  await fs.writeFile(path.join(runDir, "summary.json"), JSON.stringify(runSummary, null, 2) + "\n", "utf8");
  await fs.writeFile(
    path.join(runDir, "summary.md"),
    renderSummaryMd(runId, runSummary, varianceSections.length ? varianceSections.join("\n\n") : null),
    "utf8",
  );
  console.log(`[grade] wrote summary.md + summary.json to ${runDir}`);
  return 0;
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().then((code) => process.exit(code ?? 0));
}
