import test from "node:test";
import assert from "node:assert/strict";

import { computeNoise, decideRound, stdev } from "../hillclimb/decision.mjs";
import { benchUsd, loadPrices, priceFor, projectRoundUsd, tokensUsd, wouldExceedBudget } from "../hillclimb/budget.mjs";

test("stdev: sample stdev, 0 below two values", () => {
  assert.equal(stdev([]), 0);
  assert.equal(stdev([0.7]), 0);
  assert.ok(Math.abs(stdev([0.4, 0.6]) - Math.sqrt(0.02)) < 1e-12);
});

test("computeNoise: per-case stdev, mean per split, max over splits", () => {
  const { noise, bySplit } = computeNoise([
    { split: "train", overalls: [0.4, 0.6] }, // sd 0.1414
    { split: "train", overalls: [0.5, 0.5] }, // sd 0
    { split: "test", overalls: [0.2, 0.8] }, // sd 0.4243
  ]);
  assert.ok(Math.abs(bySplit.train - Math.sqrt(0.02) / 2) < 1e-12);
  assert.ok(Math.abs(bySplit.test - Math.sqrt(0.18)) < 1e-12);
  assert.equal(noise, bySplit.test);
});

test("computeNoise: single rep means zero noise", () => {
  assert.equal(computeNoise([{ split: "train", overalls: [0.5] }, { split: "test", overalls: [0.9] }]).noise, 0);
});

const mk = (bt, bs, at, as, noise, gradingErrors = 0) =>
  decideRound({ before: { train: bt, test: bs }, after: { train: at, test: as }, noise, gradingErrors });

test("decideRound: keep only when trainΔ > noise and testΔ > 0", () => {
  const d = mk(0.5, 0.5, 0.7, 0.55, 0.1);
  assert.equal(d.decision, "keep");
  assert.ok(Math.abs(d.trainDelta - 0.2) < 1e-12);
});

test("decideRound: train gain within noise reverts", () => {
  const d = mk(0.5, 0.5, 0.55, 0.9, 0.1);
  assert.equal(d.decision, "revert");
  assert.doesNotMatch(d.reason, /overfit/);
});

test("decideRound: train gain equal to noise is not enough (strict)", () => {
  assert.equal(mk(0.5, 0.5, 0.6, 0.6, 0.1 + 1e-9).decision, "revert");
});

test("decideRound: train up beyond noise but test flat or down is a possible overfit", () => {
  for (const testAfter of [0.5, 0.3]) {
    const d = mk(0.5, 0.5, 0.8, testAfter, 0.1);
    assert.equal(d.decision, "revert");
    assert.match(d.reason, /possible overfit/);
  }
});

test("decideRound: grading errors skip the round, neither keep nor revert", () => {
  const d = mk(0.5, 0.5, 0.9, 0.9, 0.1, 2);
  assert.equal(d.decision, "skip");
  assert.equal(d.trainDelta, null);
});

test("decideRound: missing split score reverts", () => {
  assert.equal(mk(0.5, null, 0.9, 0.9, 0).decision, "revert");
});

test("budget: price lookup by longest prefix, unknown model priced as most expensive", () => {
  const prices = { "claude-opus-4": { in: 15, out: 75 }, "claude-sonnet-4": { in: 3, out: 15 } };
  assert.deepEqual(priceFor("claude-sonnet-4-6", prices), { in: 3, out: 15 });
  assert.deepEqual(priceFor("mystery-model", prices), { in: 15, out: 75 });
  assert.equal(tokensUsd("claude-sonnet-4-6", 1e6, 1e6, prices), 18);
});

test("budget: HILLCLIMB_PRICES overrides and bad JSON throws", () => {
  const p = loadPrices({ HILLCLIMB_PRICES: '{"claude-opus-4":{"in":5,"out":25}}' });
  assert.deepEqual(p["claude-opus-4"], { in: 5, out: 25 });
  assert.throws(() => loadPrices({ HILLCLIMB_PRICES: "{nope" }), /not valid JSON/);
});

test("benchUsd: sums per-row model pricing, skips junk and null tokens", () => {
  const prices = { "claude-sonnet-4": { in: 3, out: 15 }, "claude-haiku-4": { in: 1, out: 5 } };
  const jsonl = [
    JSON.stringify({ model: "claude-sonnet-4-6", input_tokens: 1000000, output_tokens: 0 }),
    JSON.stringify({ model: "claude-haiku-4-5", input_tokens: 0, output_tokens: 1000000 }),
    "not json",
    JSON.stringify({ model: "claude-sonnet-4-6", input_tokens: null, output_tokens: null }),
  ].join("\n");
  const r = benchUsd(jsonl, prices);
  assert.equal(r.usd, 8);
  assert.equal(r.inputTokens, 1000000);
});

test("budget: projection has a safety margin and the guard compares spend + projection to the cap", () => {
  const projected = projectRoundUsd({ evalUsd: 2, proposerUsd: 1 });
  assert.ok(projected > 3);
  assert.equal(wouldExceedBudget({ spentUsd: 5, projectedUsd: projected, maxUsd: 9 }), false);
  assert.equal(wouldExceedBudget({ spentUsd: 5, projectedUsd: projected, maxUsd: 8 }), true);
});
