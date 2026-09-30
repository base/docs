/**
 * Judge runner: one `complete()` call per touched page. See PLAN.md, "Lane
 * B: graders", item 2.
 *
 * Model choice: the judge must run on a model different from the generator
 * (`claude-sonnet-4-6`, `DEFAULT_MODEL` in `llm/client.mjs`) so it isn't
 * grading the same model's blind spots. A one-time manual probe of the
 * Gateway (2025-, recorded here rather than re-run on every process start to
 * avoid doubling judge cost) confirmed both `claude-opus-4-5` and
 * `claude-opus-4-1` answer; `claude-opus-4-5` is the newer of the two and is
 * the default. If a call to it fails for any reason (model retired,
 * region gated, transient outage), `completeWithFallback` retries down a
 * fixed chain and prints a warning naming which model failed and which it
 * fell back to, per PLAN.md's "fall back with a printed warning".
 */
import { complete, BENCH_LOG } from "../../../sync-from-base-std/llm/client.mjs";
import { buildJudgePrompt, JUDGE_SYSTEM_PROMPT, CLAIMS } from "./prompt.mjs";
import { parseJudgeResponse } from "./parse.mjs";
import { mkCheck } from "../checks/shared.mjs";

/** Must differ from the generator's `DEFAULT_MODEL` ("claude-sonnet-4-6"). */
export const DEFAULT_JUDGE_MODEL = "claude-opus-4-5";
const GENERATOR_MODEL = "claude-sonnet-4-6";

function modelChain() {
  const preferred = process.env.JUDGE_MODEL || DEFAULT_JUDGE_MODEL;
  // De-duplicate while preserving order: env override may already be one
  // of the fallback candidates.
  return [...new Set([preferred, "claude-opus-4-1", GENERATOR_MODEL])];
}

/**
 * @param {string} prompt
 * @param {string} page
 * @returns {Promise<{text: string, outputTokens: number|null, inputTokens: number|null, model: string}>}
 */
async function completeWithFallback(prompt, page) {
  const chain = modelChain();
  let lastErr;
  for (let i = 0; i < chain.length; i++) {
    const model = chain[i];
    try {
      const result = await complete(prompt, page, { system: JUDGE_SYSTEM_PROMPT, model });
      // `complete()` only returns {text, stopReason, outputTokens}; the
      // matching input-token count lives on the bench-log row it just
      // pushed (see llm/client.mjs's BENCH_LOG schema).
      const last = BENCH_LOG[BENCH_LOG.length - 1];
      const inputTokens = last && last.page === page && last.model === model ? last.input_tokens ?? null : null;
      return { text: result.text, outputTokens: result.outputTokens ?? null, inputTokens, model };
    } catch (err) {
      lastErr = err;
      if (i < chain.length - 1) {
        console.warn(
          `[judge] model "${model}" failed (${String(err.message || err).slice(0, 160)}); falling back to "${chain[i + 1]}"`,
        );
      }
    }
  }
  throw lastErr;
}

/**
 * Judge one page against the six fixed claims.
 *
 * @param {object} ctx  same shape as `buildJudgePrompt`'s `ctx`
 * @returns {Promise<{checks: Array, usage: {inputTokens: number, outputTokens: number}, model: string|null}>}
 */
export async function judgePage(ctx) {
  const prompt = buildJudgePrompt(ctx);
  const page = ctx.page ?? null;

  let completion;
  try {
    completion = await completeWithFallback(prompt, page);
  } catch (err) {
    // Total failure (every model in the chain unreachable): never crash
    // the grading run — surface as unparsable judge claims instead.
    const { claims } = parseJudgeResponse("");
    return {
      checks: claims.map((c) =>
        mkCheck(`judge.${c.id}`, "judge", page, null, 0, `judge call failed: ${String(err.message || err)}`),
      ),
      usage: { inputTokens: 0, outputTokens: 0 },
      model: null,
    };
  }

  const { claims, parseError } = parseJudgeResponse(completion.text);
  const checks = claims.map((c) =>
    mkCheck(
      `judge.${c.id}`,
      "judge",
      page,
      c.pass,
      c.pass === true ? 1 : 0,
      parseError ? `${parseError} (raw: ${c.reason})` : c.reason,
    ),
  );

  return {
    checks,
    usage: { inputTokens: completion.inputTokens ?? 0, outputTokens: completion.outputTokens ?? 0 },
    model: completion.model,
  };
}

export { CLAIMS };
