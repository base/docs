/**
 * Core per-rep grading logic — the part of `grade.mjs` the hillclimb lane
 * needs to import directly (PLAN.md, "Export gradeRep() for the
 * hillclimb"), kept separate from the CLI (argv parsing, run-directory
 * walking, summary.md rendering) so importing it never pulls in `process`-
 * level CLI concerns.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

import { runCodeChecks } from "./code.mjs";
import { isDocPage } from "./checks/shared.mjs";
import { roleForPage } from "./pageRole.mjs";
import { judgePage as defaultJudgePage } from "./judge.mjs";
import { pairwiseCompare as defaultPairwiseCompare } from "./pairwise.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");

/**
 * Overall-score weights from PLAN.md's "Overall score" section. Exported so
 * `calibrate.mjs` and report tooling quote the same numbers rather than
 * hardcoding them a second time.
 */
export const OVERALL_WEIGHTS = { code: 0.5, judge: 0.3, pairwise: 0.2 };

/** @returns {Map<string,string>} repo-relative path -> file content, recursively under `rootDir` */
async function loadContentDir(rootDir) {
  const map = new Map();
  async function walk(dir, prefix) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return; // absent (e.g. `before/` for a page that didn't exist yet)
    }
    for (const entry of entries) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full, rel);
      else if (entry.isFile()) map.set(rel, await fs.readFile(full, "utf8"));
    }
  }
  await walk(rootDir, "");
  return map;
}

/**
 * @param {string} repDir
 * @returns {Promise<{meta: object, before: Map<string,string>, after: Map<string,string>}>}
 */
export async function loadRun(repDir) {
  const meta = JSON.parse(await fs.readFile(path.join(repDir, "meta.json"), "utf8"));
  const [before, after] = await Promise.all([
    loadContentDir(path.join(repDir, "before")),
    loadContentDir(path.join(repDir, "after")),
  ]);
  return { meta, before, after };
}

/**
 * Default reference-content reader: `git show <commit>:<path>`. Returns
 * null (rather than throwing) when the path didn't exist at that commit —
 * a page the reference PR added fresh has no pre-existing counterpart, and
 * pairwise treats that the same as "nothing to compare".
 *
 * @param {string} commit
 * @param {string} page
 * @returns {Promise<string|null>}
 */
async function readGitBlob(commit, page) {
  try {
    return execFileSync("git", ["show", `${commit}:${page}`], { cwd: REPO_ROOT, encoding: "utf8" });
  } catch {
    return null;
  }
}

function findingsForPage(caseDef, page) {
  return (caseDef?.review_findings || []).filter((f) => f?.page === page);
}

function mean(scores) {
  return scores.length === 0 ? null : scores.reduce((sum, s) => sum + s, 0) / scores.length;
}

/**
 * @param {object} caseDef
 * @param {{meta: object}} run
 * @param {Array} checks
 * @param {{inputTokens: number, outputTokens: number}} cost
 * @param {{judgeSkipped: boolean, pairwiseSkipped: boolean}} flags
 * @returns {object} the `summary` contract shape
 */
export function summarize(caseDef, run, checks, cost, { judgeSkipped, pairwiseSkipped }) {
  const code = mean(checks.filter((c) => c.layer === "code").map((c) => c.score)) ?? 0;
  const judge = judgeSkipped ? null : mean(checks.filter((c) => c.layer === "judge").map((c) => c.score));
  const pairwise =
    pairwiseSkipped || !caseDef?.reference
      ? null
      : mean(checks.filter((c) => c.layer === "pairwise").map((c) => c.score));

  // "A case with a validator crash or zero touched pages when scope.in is
  // non-empty scores 0" — PLAN.md, "Overall score".
  const touched = (run?.meta?.touched || []).filter(isDocPage);
  const scopeInNonEmpty = (caseDef?.scope?.in || []).length > 0;
  const crashed = run?.meta?.exitCode != null && run.meta.exitCode !== 0;
  const zeroTouchedWhenExpected = scopeInNonEmpty && touched.length === 0;

  let overall;
  if (crashed || zeroTouchedWhenExpected) {
    overall = 0;
  } else {
    const terms = [
      [OVERALL_WEIGHTS.code, code],
      [OVERALL_WEIGHTS.judge, judge],
      [OVERALL_WEIGHTS.pairwise, pairwise],
    ].filter(([, value]) => value !== null);
    const totalWeight = terms.reduce((sum, [w]) => sum + w, 0);
    overall = totalWeight === 0 ? 0 : terms.reduce((sum, [w, value]) => sum + w * value, 0) / totalWeight;
  }

  return { code, judge, pairwise, overall, cost };
}

/**
 * Grade one replay rep. Pure aside from the LLM calls and (by default) one
 * `git show` per reference page — every one is injectable via `opts` so
 * tests can supply fakes and never touch the network.
 *
 * @param {object} caseDef                  parsed case JSON
 * @param {string} repDir                   path to `rep-<n>/`
 * @param {object=} opts
 * @param {boolean=} opts.noJudge
 * @param {boolean=} opts.noPairwise
 * @param {boolean=} opts.write              default true; false skips writing grade.json (tests)
 * @param {Function=} opts.judgePage         default: the real judge
 * @param {Function=} opts.pairwiseCompare   default: the real pairwise comparator
 * @param {Function=} opts.readReference     default: `git show <commit>:<page>`
 * @returns {Promise<object>} the grade-result contract shape
 */
export async function gradeRep(caseDef, repDir, opts = {}) {
  const judgePage = opts.judgePage || defaultJudgePage;
  const pairwiseCompare = opts.pairwiseCompare || defaultPairwiseCompare;
  const readReference = opts.readReference || readGitBlob;

  const run = await loadRun(repDir);
  const checks = [...runCodeChecks(caseDef, run)];
  const cost = { inputTokens: 0, outputTokens: 0 };

  if (!opts.noJudge) {
    for (const [page, afterText] of run.after) {
      if (!isDocPage(page)) continue;
      const result = await judgePage({
        page,
        pageRole: roleForPage(page),
        sourceDiff: caseDef?.payload?.diff,
        beforePage: run.before.get(page) ?? "",
        afterPage: afterText,
        reviewFindings: findingsForPage(caseDef, page),
      });
      checks.push(...result.checks);
      cost.inputTokens += result.usage.inputTokens || 0;
      cost.outputTokens += result.usage.outputTokens || 0;
    }
  }

  if (!opts.noPairwise && caseDef?.reference) {
    for (const [page, afterText] of run.after) {
      if (!isDocPage(page)) continue;
      const referenceText = await readReference(caseDef.reference.commit, page);
      if (referenceText == null) continue; // page didn't exist in the reference either
      const result = await pairwiseCompare({
        page,
        pageRole: roleForPage(page),
        sourceDiff: caseDef?.payload?.diff,
        reference: referenceText,
        candidate: afterText,
        seed: `${caseDef.id}:${run.meta.rep ?? ""}:${page}`,
      });
      checks.push(...result.checks);
      cost.inputTokens += result.usage.inputTokens || 0;
      cost.outputTokens += result.usage.outputTokens || 0;
    }
  }

  const summary = summarize(caseDef, run, checks, cost, {
    judgeSkipped: !!opts.noJudge,
    pairwiseSkipped: !!opts.noPairwise,
  });
  const grade = { caseId: caseDef?.id, rep: run.meta.rep, checks, summary };

  if (opts.write !== false) {
    await fs.writeFile(path.join(repDir, "grade.json"), JSON.stringify(grade, null, 2) + "\n", "utf8");
  }
  return grade;
}

/**
 * Aggregate multiple `gradeRep` results into a run-level report.
 *
 * @param {Array<{caseId: string, rep: number, split: string|null, grade: object}>} entries
 * @returns {{casesTable: Array, splitMeans: object, totalCost: {inputTokens: number, outputTokens: number}}}
 */
export function buildRunSummary(entries) {
  const byCase = new Map();
  for (const e of entries) {
    if (!byCase.has(e.caseId)) byCase.set(e.caseId, { split: e.split, overalls: [], reps: [] });
    const bucket = byCase.get(e.caseId);
    bucket.overalls.push(e.grade.summary.overall);
    bucket.reps.push(e.grade);
  }

  const casesTable = [...byCase.entries()].map(([caseId, bucket]) => ({
    caseId,
    split: bucket.split,
    reps: bucket.reps.length,
    meanOverall: mean(bucket.overalls),
  }));

  const splitMeans = {};
  for (const split of ["train", "test"]) {
    const overalls = casesTable.filter((c) => c.split === split).map((c) => c.meanOverall);
    splitMeans[split] = mean(overalls);
  }

  const totalCost = entries.reduce(
    (acc, e) => ({
      inputTokens: acc.inputTokens + (e.grade.summary.cost?.inputTokens || 0),
      outputTokens: acc.outputTokens + (e.grade.summary.cost?.outputTokens || 0),
    }),
    { inputTokens: 0, outputTokens: 0 },
  );

  return { casesTable, splitMeans, totalCost };
}
