/**
 * Cost estimation and budget guard for the hillclimb (`--max-usd`).
 *
 * Sync (generator) cost comes from each rep's `bench.jsonl` token counts; judge
 * and pairwise cost from the grade summary's token counts; the proposer and
 * reflection calls from their own usage. Everything is priced with the table
 * below.
 *
 * The table is deliberately conservative (an upper bound, so the guard errs
 * toward stopping early): USD per million tokens, matched by longest model-id
 * prefix. Opus is priced at the older $15/$75 tier even though newer Opus
 * releases list lower; models not in the table are priced as Opus. Override or
 * extend with the `HILLCLIMB_PRICES` env var, a JSON object such as
 * `{"claude-opus-4": {"in": 5, "out": 25}}`, or pass `prices` explicitly.
 */

/** @type {Record<string, {in: number, out: number}>} USD per million tokens. */
export const DEFAULT_PRICES = {
  "claude-opus-4": { in: 15, out: 75 },
  "claude-sonnet-4": { in: 3, out: 15 },
  "claude-haiku-4": { in: 1, out: 5 },
};

/** Safety margin applied to a round's projected cost (re-grades, retries, longer outputs). */
export const ROUND_SAFETY_FACTOR = 1.2;

/** Assumed proposer output size when projecting its cost before it runs (tokens). */
export const PROPOSER_OUTPUT_TOKENS_ESTIMATE = 12000;

/** @returns {Record<string, {in: number, out: number}>} table with `HILLCLIMB_PRICES` merged in */
export function loadPrices(env = process.env) {
  if (!env.HILLCLIMB_PRICES) return DEFAULT_PRICES;
  try {
    return { ...DEFAULT_PRICES, ...JSON.parse(env.HILLCLIMB_PRICES) };
  } catch {
    throw new Error("HILLCLIMB_PRICES is not valid JSON");
  }
}

/** @returns {{in: number, out: number}} price for a model id (unknown models priced as the most expensive entry) */
export function priceFor(model, prices = DEFAULT_PRICES) {
  const keys = Object.keys(prices)
    .filter((k) => typeof model === "string" && model.startsWith(k))
    .sort((a, b) => b.length - a.length);
  if (keys.length > 0) return prices[keys[0]];
  return Object.values(prices).reduce((a, b) => (b.out > a.out ? b : a));
}

/** USD for a token count at a model's price. */
export function tokensUsd(model, inputTokens, outputTokens, prices = DEFAULT_PRICES) {
  const p = priceFor(model, prices);
  return ((inputTokens || 0) * p.in + (outputTokens || 0) * p.out) / 1e6;
}

/**
 * Sum the sync's spend from a `bench.jsonl` body (one JSON object per line,
 * each with `model`, `input_tokens`, `output_tokens`). Unparseable lines and
 * null token counts are skipped, since a failed call cost nothing measurable.
 *
 * @param {string} benchJsonl
 * @returns {{usd: number, inputTokens: number, outputTokens: number}}
 */
export function benchUsd(benchJsonl, prices = DEFAULT_PRICES) {
  let usd = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  for (const line of String(benchJsonl || "").split("\n")) {
    if (!line.trim()) continue;
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      continue;
    }
    const i = Number(row.input_tokens) || 0;
    const o = Number(row.output_tokens) || 0;
    inputTokens += i;
    outputTokens += o;
    usd += tokensUsd(row.model, i, o, prices);
  }
  return { usd, inputTokens, outputTokens };
}

/**
 * Projected cost of the next round: one full evaluation (replay + grade of
 * train and test, measured either from the largest evaluation seen so far) plus
 * the proposer call, times the safety factor.
 *
 * @param {{evalUsd: number, proposerUsd: number}} parts
 */
export function projectRoundUsd({ evalUsd, proposerUsd }) {
  return (evalUsd + proposerUsd) * ROUND_SAFETY_FACTOR;
}

/** True when starting another round would likely push spend past the cap. */
export function wouldExceedBudget({ spentUsd, projectedUsd, maxUsd }) {
  return spentUsd + projectedUsd > maxUsd;
}
