import { test } from "node:test";
import assert from "node:assert/strict";

import { completeWithFallback, modelChain, DEFAULT_JUDGE_MODEL, MAX_ATTEMPTS } from "../graders/judge/run.mjs";
import { capDiff, MAX_DIFF_CHARS } from "../graders/diffCap.mjs";
import { buildJudgePrompt } from "../graders/judge/prompt.mjs";

const noSleep = async () => {};
const quiet = (fn) => async (...args) => {
  const orig = console.warn;
  console.warn = () => {};
  try {
    return await fn(...args);
  } finally {
    console.warn = orig;
  }
};

test("default judge model is an Opus model that is not the generator", () => {
  assert.match(DEFAULT_JUDGE_MODEL, /^claude-opus-/);
  assert.notEqual(modelChain()[0], "claude-sonnet-4-6");
});

test("completeWithFallback: a transient failure is retried on the same model", quiet(async () => {
  let calls = 0;
  const complete = async () => {
    calls++;
    if (calls < 3) throw new Error("Connection error");
    return { text: "ok", outputTokens: 5 };
  };
  const benchLog = [{ page: "p", model: "m1", input_tokens: 42 }];
  const r = await completeWithFallback("prompt", "p", { models: ["m1", "m2"], complete, sleep: noSleep, benchLog });
  assert.equal(r.model, "m1");
  assert.equal(r.attempts, 3);
  assert.equal(r.inputTokens, 42);
  assert.equal(calls, 3);
}));

test("completeWithFallback: falls to the next model only after MAX_ATTEMPTS failures", quiet(async () => {
  const seen = [];
  const sleeps = [];
  const complete = async (_p, _pg, { model }) => {
    seen.push(model);
    if (model === "m1") throw new Error("403 go/sg/blocked");
    return { text: "ok", outputTokens: 1 };
  };
  const r = await completeWithFallback("prompt", "p", {
    models: ["m1", "m2"],
    complete,
    sleep: async (ms) => sleeps.push(ms),
    benchLog: [],
  });
  assert.deepEqual(seen, [...Array(MAX_ATTEMPTS).fill("m1"), "m2"]);
  assert.equal(r.model, "m2");
  assert.equal(sleeps.length, MAX_ATTEMPTS - 1);
  assert.ok(sleeps[1] > sleeps[0], "backoff grows");
}));

test("completeWithFallback: throws the last error when every model is exhausted", quiet(async () => {
  const complete = async () => {
    throw new Error("down");
  };
  await assert.rejects(
    completeWithFallback("p", "pg", { models: ["m1"], complete, sleep: noSleep, benchLog: [], maxAttempts: 2 }),
    /down/,
  );
}));

test("capDiff: short diffs pass through; long diffs are cut at a line with a marker", () => {
  assert.equal(capDiff("abc"), "abc");
  assert.equal(capDiff(undefined), "");
  const long = Array.from({ length: 5000 }, (_, i) => `+line ${i} ${"x".repeat(20)}`).join("\n");
  assert.ok(long.length > MAX_DIFF_CHARS);
  const capped = capDiff(long);
  assert.ok(capped.length < MAX_DIFF_CHARS + 200);
  assert.match(capped, /diff truncated by the grader: \d+ of \d+ characters omitted/);
  assert.ok(capped.startsWith("+line 0 "));
});

test("buildJudgePrompt: includes the source diff, capped", () => {
  const big = "+" + "y".repeat(MAX_DIFF_CHARS * 2);
  const prompt = buildJudgePrompt({ page: "docs/a.mdx", pageRole: "guide", sourceDiff: big, afterPage: "x" });
  assert.match(prompt, /diff truncated by the grader/);
  assert.ok(prompt.length < MAX_DIFF_CHARS + 5000);
});
