/**
 * Judge runner: one `complete()` call per touched page. See PLAN.md, "Lane
 * B: graders", item 2.
 *
 * Model choice: the judge must run on a model different from the generator
 * (`claude-sonnet-4-6`, `DEFAULT_MODEL` in `llm/client.mjs`) so it isn't
 * grading the same model's blind spots. Probed against the Gateway:
 * `claude-opus-4-6` and `claude-opus-4-5` (plus opus-4-1, haiku-4-5, and
 * sonnet-4-6) all answer. The default is `claude-opus-4-6`; `JUDGE_MODEL`
 * overrides it.
 *
 * Failure handling, in two layers:
 *   1. The SDK already retries 408/429/5xx/network errors (`maxRetries: 4`).
 *      Some Gateway failures surface anyway (an intermittent 403 "go/sg/..."
 *      edge challenge, "Connection error") and disappear minutes later, so
 *      each model also gets `MAX_ATTEMPTS` tries with exponential backoff
 *      before we move on.
 *   2. Only then does `completeWithFallback` step down `modelChain()` and
 *      print a warning naming the failed and next model, per PLAN.md's
 *      "fall back with a printed warning".
 *
 * `llm/client.mjs` imports `@anthropic-ai/sdk`, which is absent from the CI
 * `npm test` environment, so it is imported lazily inside the call (PLAN.md
 * ground rules); tests inject `opts.complete` instead.
 */
import { buildJudgePrompt, JUDGE_SYSTEM_PROMPT, CLAIMS } from "./prompt.mjs";
import { parseJudgeResponse } from "./parse.mjs";
import { mkCheck } from "../checks/shared.mjs";

/** Must differ from the generator's `DEFAULT_MODEL` ("claude-sonnet-4-6"). */
export const DEFAULT_JUDGE_MODEL = "claude-opus-4-6";
const GENERATOR_MODEL = "claude-sonnet-4-6";

/** Tries per model before falling back to the next one. */
export const MAX_ATTEMPTS = 3;
/** Backoff before attempt n+1, in ms (attempt 1 → 2 waits 2s, 2 → 3 waits 6s). */
export const BACKOFF_MS = [2000, 6000];

export function modelChain() {
  const preferred = process.env.JUDGE_MODEL || DEFAULT_JUDGE_MODEL;
  // De-duplicate while preserving order: env override may already be one
  // of the fallback candidates.
  return [...new Set([preferred, "claude-opus-4-5", "claude-opus-4-1", GENERATOR_MODEL])];
}

const realSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function loadClient() {
  return import("../../../sync-from-base-std/llm/client.mjs");
}

/**
 * @param {string} prompt
 * @param {string} page
 * @param {{system?: string, models?: string[], maxAttempts?: number, sleep?: (ms:number)=>Promise<void>,
 *          complete?: Function, benchLog?: Array}=} opts
 *        `system` defaults to JUDGE_SYSTEM_PROMPT (pairwise.mjs passes its own).
 *        `models`, `maxAttempts`, `sleep`, `complete`, `benchLog` are test seams.
 * @returns {Promise<{text: string, outputTokens: number|null, inputTokens: number|null, model: string, attempts: number}>}
 */
export async function completeWithFallback(prompt, page, opts = {}) {
  const chain = opts.models ?? modelChain();
  const maxAttempts = opts.maxAttempts ?? MAX_ATTEMPTS;
  const sleep = opts.sleep ?? realSleep;
  let completeFn = opts.complete;
  let benchLog = opts.benchLog;
  if (!completeFn) {
    const client = await loadClient();
    completeFn = client.complete;
    benchLog = client.BENCH_LOG;
  }

  let lastErr;
  for (let i = 0; i < chain.length; i++) {
    const model = chain[i];
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await completeFn(prompt, page, { system: opts.system ?? JUDGE_SYSTEM_PROMPT, model });
        // `complete()` only returns {text, stopReason, outputTokens}; the
        // matching input-token count lives on the bench-log row it just
        // pushed (see llm/client.mjs's BENCH_LOG schema).
        const last = benchLog && benchLog[benchLog.length - 1];
        const inputTokens = last && last.page === page && last.model === model ? last.input_tokens ?? null : null;
        return { text: result.text, outputTokens: result.outputTokens ?? null, inputTokens, model, attempts: attempt };
      } catch (err) {
        lastErr = err;
        if (attempt < maxAttempts) {
          console.warn(
            `[judge] model "${model}" attempt ${attempt}/${maxAttempts} failed (${String(err.message || err).slice(0, 120)}); retrying`,
          );
          await sleep(BACKOFF_MS[Math.min(attempt - 1, BACKOFF_MS.length - 1)]);
        }
      }
    }
    if (i < chain.length - 1) {
      console.warn(
        `[judge] model "${model}" failed ${maxAttempts} attempts (${String(lastErr.message || lastErr).slice(0, 160)}); falling back to "${chain[i + 1]}"`,
      );
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
