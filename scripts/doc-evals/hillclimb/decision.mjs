/**
 * Hillclimb decision rule and noise estimate (PLAN.md, Phase 2, refined by the
 * 2026-09-30 owner decisions). Pure functions: no I/O, no LLM.
 */

/**
 * Sample standard deviation (n-1). Fewer than two values has no spread to
 * measure, so it returns 0 (a single-rep run therefore has noise 0; the
 * report warns about that).
 *
 * @param {number[]} xs
 * @returns {number}
 */
export function stdev(xs) {
  if (xs.length < 2) return 0;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
}

/**
 * Noise floor for keep/revert decisions.
 *
 *   noise = max over splits of ( mean over the split's cases of
 *           stdev-across-reps of that case's `overall` score )
 *
 * i.e. for each case take the sample stdev of its per-rep overall scores,
 * average those per split, and take the larger of the train and test
 * averages. It is measured once, on the baseline, and held fixed for the run.
 *
 * @param {Array<{split: string, overalls: number[]}>} perCase
 * @returns {{noise: number, bySplit: {train: number|null, test: number|null}}}
 */
export function computeNoise(perCase) {
  const bySplit = {};
  for (const split of ["train", "test"]) {
    const sds = perCase.filter((c) => c.split === split).map((c) => stdev(c.overalls));
    bySplit[split] = sds.length === 0 ? null : sds.reduce((a, b) => a + b, 0) / sds.length;
  }
  const noise = Math.max(0, ...Object.values(bySplit).filter((v) => v !== null));
  return { noise, bySplit };
}

/**
 * Decide what to do with a candidate patch.
 *
 * - `skip`  : the round had grading errors that survived one re-grade (or a
 *             replay that could not run at all). Neither keep nor revert: the
 *             scores are not trustworthy, so the round is logged and ignored.
 * - `keep`  : trainΔ > noise AND testΔ > 0.
 * - `revert`: anything else. trainΔ > noise with testΔ <= 0 is flagged
 *             "possible overfit" because the patch helped only on the cases
 *             the proposer was allowed to see.
 *
 * @param {{before: {train: number|null, test: number|null}, after: {train: number|null, test: number|null},
 *          noise: number, gradingErrors?: number}} input
 * @returns {{decision: "keep"|"revert"|"skip", reason: string, trainDelta: number|null, testDelta: number|null}}
 */
export function decideRound({ before, after, noise, gradingErrors = 0 }) {
  if (gradingErrors > 0) {
    return {
      decision: "skip",
      reason: `${gradingErrors} grading/replay error(s) after one re-grade; round ignored (no keep, no revert)`,
      trainDelta: null,
      testDelta: null,
    };
  }
  const vals = [before.train, before.test, after.train, after.test];
  if (vals.some((v) => v === null || v === undefined || Number.isNaN(v))) {
    return { decision: "revert", reason: "missing train or test score", trainDelta: null, testDelta: null };
  }
  const trainDelta = after.train - before.train;
  const testDelta = after.test - before.test;
  const f = (n) => n.toFixed(3);
  if (trainDelta > noise && testDelta > 0) {
    return {
      decision: "keep",
      reason: `train +${f(trainDelta)} > noise ${f(noise)} and test +${f(testDelta)} > 0`,
      trainDelta,
      testDelta,
    };
  }
  if (trainDelta > noise) {
    return {
      decision: "revert",
      reason: `possible overfit: train +${f(trainDelta)} > noise ${f(noise)} but test ${testDelta >= 0 ? "+" : ""}${f(testDelta)} <= 0`,
      trainDelta,
      testDelta,
    };
  }
  return {
    decision: "revert",
    reason: `train ${trainDelta >= 0 ? "+" : ""}${f(trainDelta)} not > noise ${f(noise)}`,
    trainDelta,
    testDelta,
  };
}
