/**
 * LLM judge public API. See PLAN.md, "Lane B: graders", item 2.
 *
 * Thin re-export over `judge/prompt.mjs` (claims + prompt), `judge/parse.mjs`
 * (response parsing), and `judge/run.mjs` (the `complete()` call + model
 * fallback chain) — the split the "keep each file small" note asked for.
 * Callers (grade.mjs, calibrate.mjs) only need `judgePage`; the rest is
 * exported for the offline unit tests and for calibrate.mjs's need to
 * re-render a prompt without re-calling the model.
 */
export { CLAIMS, JUDGE_SYSTEM_PROMPT, buildJudgePrompt } from "./judge/prompt.mjs";
export { parseJudgeResponse } from "./judge/parse.mjs";
export { judgePage, DEFAULT_JUDGE_MODEL } from "./judge/run.mjs";
