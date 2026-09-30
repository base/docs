/**
 * Case selection and candidate evaluation for the hillclimb: replay each
 * (case, rep) against a candidate sync dir, grade it, and aggregate train/test
 * means, per-case rep scores (for noise) and cost.
 *
 * Replay and grading are injected (`deps.replay`, `deps.grade`) so tests run
 * offline; the real ones are wired in `run.mjs`.
 */
import fs from "node:fs/promises";
import path from "node:path";

import { buildRunSummary, summarize } from "../graders/gradeRep.mjs";
// release-utils.mjs has no imports, so this is safe in CI (no scripts/node_modules).
import { mapWithConcurrency } from "../../sync-from-base-std/release-utils.mjs";
import { benchUsd, tokensUsd } from "./budget.mjs";
import { failingChecks } from "./proposer.mjs";

const exists = (p) => fs.stat(p).then(() => true, () => false);
const readJson = async (p) => JSON.parse(await fs.readFile(p, "utf8"));

/**
 * Resolve the train and test case sets. Default: every case file whose
 * `split` matches, minus `heavy` and `legacy_layout` cases. Explicit id lists
 * override the defaults (and may name heavy cases deliberately).
 *
 * @returns {Promise<{train: object[], test: object[]}>}
 */
export async function loadCaseSets({ casesDir, trainIds, testIds }) {
  const files = (await fs.readdir(casesDir)).filter((f) => f.endsWith(".json"));
  const all = await Promise.all(files.map((f) => readJson(path.join(casesDir, f))));
  const pick = (ids, split) => {
    if (!ids) return all.filter((c) => c.split === split && !c.heavy && !c.legacy_layout);
    const missing = ids.filter((id) => !all.some((c) => c.id === id));
    if (missing.length) throw new Error(`unknown case id(s): ${missing.join(", ")}`);
    return ids.map((id) => all.find((c) => c.id === id));
  };
  const train = pick(trainIds, "train");
  const test = pick(testIds, "test");
  const overlap = train.filter((c) => test.some((t) => t.id === c.id));
  if (overlap.length) throw new Error(`case(s) in both train and test: ${overlap.map((c) => c.id).join(", ")}`);
  return { train, test };
}

/**
 * Re-score a `grade.json` for the decision. When the judge is not trusted
 * (not calibrated, or `--no-judge`) its checks are dropped from `overall` and
 * from the grading-error count, so a judge hiccup cannot skip a round the
 * judge would not have influenced. Uses the graders' own `summarize`.
 *
 * @returns {{overall: number, gradingErrors: number}}
 */
export function scoreGrade(grade, caseDef, meta, { useJudge }) {
  const checks = (grade.checks || []).filter((c) => useJudge || c.layer !== "judge");
  const s = summarize(caseDef, { meta }, checks, grade.summary?.cost || {}, {
    judgeSkipped: !useJudge,
    pairwiseSkipped: false,
  });
  return { overall: s.overall, gradingErrors: s.gradingErrors };
}

/**
 * Evaluate a candidate on the given case sets.
 *
 * `reuseDir`, when set, is an existing replay run whose rep dirs (those with a
 * `meta.json`) are used as-is instead of replaying; missing reps are replayed
 * into `outDir`. Existing `grade.json` files are reused as-is, otherwise the
 * rep is graded (writing `grade.json` in place). A rep with unresolved
 * grading errors is re-graded once.
 *
 * @param {object} o
 * @param {string} o.outDir            where new replays land (`<outDir>/<case>/rep-<n>`)
 * @param {string=} o.reuseDir
 * @param {string} o.candidateDir      sync dir to replay
 * @param {{train: object[], test: object[]}} o.sets
 * @param {number} o.reps
 * @param {number} o.concurrency
 * @param {boolean} o.noJudge          skip the judge entirely
 * @param {boolean} o.useJudge         count judge checks in the decision
 * @param {string} o.judgeModel        model id used to price grade tokens
 * @param {object} o.prices
 * @param {{replay: Function, grade: Function}} o.deps
 */
export async function evaluate(o) {
  const { deps } = o;
  const runId = path.basename(o.outDir);
  const tasks = [];
  for (const role of ["train", "test"]) {
    for (const caseDef of o.sets[role]) for (let rep = 1; rep <= o.reps; rep++) tasks.push({ role, caseDef, rep });
  }

  const entries = await mapWithConcurrency(tasks, o.concurrency, async ({ role, caseDef, rep }) => {
    const base = { caseId: caseDef.id, role, rep, caseDef };
    let repDir = o.reuseDir ? path.join(o.reuseDir, caseDef.id, `rep-${rep}`) : null;
    let replayed = false;
    if (!repDir || !(await exists(path.join(repDir, "meta.json")))) {
      repDir = path.join(o.outDir, caseDef.id, `rep-${rep}`);
      if (!(await exists(path.join(repDir, "meta.json")))) {
        try {
          await deps.replay(caseDef, { runId, rep, candidateDir: o.candidateDir, outDir: repDir });
        } catch (err) {
          return { ...base, error: `replay failed: ${String(err.message || err).slice(0, 300)}` };
        }
      }
      replayed = true;
    }
    try {
      const meta = await readJson(path.join(repDir, "meta.json"));
      const sync = benchUsd(await fs.readFile(path.join(repDir, "bench.jsonl"), "utf8").catch(() => ""), o.prices);
      let spent = replayed ? sync.usd : 0;
      let grade = await readJson(path.join(repDir, "grade.json")).catch(() => null);
      const runGrade = async () => {
        const g = await deps.grade(caseDef, repDir, { noJudge: o.noJudge });
        spent += tokensUsd(o.judgeModel, g.summary.cost?.inputTokens, g.summary.cost?.outputTokens, o.prices);
        return g;
      };
      grade = grade || (await runGrade());
      let score = scoreGrade(grade, caseDef, meta, { useJudge: o.useJudge });
      if (score.gradingErrors > 0) {
        grade = await runGrade(); // one re-grade, per owner decision 4
        score = scoreGrade(grade, caseDef, meta, { useJudge: o.useJudge });
      }
      const gradeUsd = tokensUsd(o.judgeModel, grade.summary.cost?.inputTokens, grade.summary.cost?.outputTokens, o.prices);
      return { ...base, repDir, grade, score, spentUsd: spent, fullUsd: sync.usd + gradeUsd };
    } catch (err) {
      return { ...base, repDir, error: `grading failed: ${String(err.message || err).slice(0, 300)}` };
    }
  });

  const ok = entries.filter((e) => !e.error);
  const summary = buildRunSummary(
    ok.map((e) => ({
      caseId: e.caseId,
      rep: e.rep,
      split: e.role,
      grade: { summary: { overall: e.score.overall, cost: e.grade.summary.cost, gradingErrors: e.score.gradingErrors } },
    })),
  );
  const perCase = [...new Set(ok.map((e) => e.caseId))].map((caseId) => {
    const es = ok.filter((e) => e.caseId === caseId);
    return { caseId, split: es[0].role, overalls: es.map((e) => e.score.overall) };
  });
  return {
    entries,
    perCase,
    splitMeans: { train: summary.splitMeans.train, test: summary.splitMeans.test },
    gradingErrors: summary.gradingErrors,
    replayErrors: entries.filter((e) => e.error).length,
    errors: entries.filter((e) => e.error).map((e) => `${e.caseId}/rep-${e.rep}: ${e.error}`),
    spentUsd: ok.reduce((n, e) => n + e.spentUsd, 0),
    fullUsd: ok.reduce((n, e) => n + e.fullUsd, 0),
  };
}

/**
 * Train-only evidence for the proposer/reflection prompts. Test entries are
 * filtered out here as well as in the prompt builders (defense in depth).
 */
export async function collectTrainEvidence(evaluation) {
  const byCase = new Map();
  for (const e of evaluation.entries.filter((x) => x.role === "train" && !x.error)) {
    if (!byCase.has(e.caseId)) byCase.set(e.caseId, { role: "train", caseDef: e.caseDef, reps: [] });
    const diffPatch = await fs.readFile(path.join(e.repDir, "diff.patch"), "utf8").catch(() => "");
    byCase.get(e.caseId).reps.push({ rep: e.rep, overall: e.score.overall, grade: e.grade, diffPatch });
  }
  return [...byCase.values()];
}

/** Count of failing checks across train evidence (for the report). */
export function countTrainFailures(evidence) {
  return evidence.reduce((n, ev) => n + ev.reps.reduce((m, r) => m + failingChecks(r.grade).length, 0), 0);
}
