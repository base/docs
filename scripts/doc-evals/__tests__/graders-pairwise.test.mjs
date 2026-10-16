import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildPairwisePrompt,
  parsePairwiseResponse,
  resultForCandidate,
  combineOrders,
  pairwiseCompare,
  REVIEWER_RUBRIC,
} from "../graders/pairwise.mjs";

test("buildPairwisePrompt: wraps both versions and the diff in their own tags", () => {
  const prompt = buildPairwisePrompt({
    page: "docs/a.mdx",
    pageRole: "guide",
    sourceDiff: "+ diff line",
    versionA: "version A text",
    versionB: "version B text",
  });
  assert.match(prompt, /<source_diff>\n\+ diff line\n<\/source_diff>/);
  assert.match(prompt, /<version_a>\nversion A text\n<\/version_a>/);
  assert.match(prompt, /<version_b>\nversion B text\n<\/version_b>/);
  assert.match(prompt, /"winner" must be exactly "A", "B", or "tie"/);
});

test("parsePairwiseResponse: well-formed JSON object parses cleanly", () => {
  const { winner, reason, parseError } = parsePairwiseResponse(
    JSON.stringify({ winner: "A", reason: "A is more accurate." }),
  );
  assert.equal(winner, "A");
  assert.equal(reason, "A is more accurate.");
  assert.equal(parseError, null);
});

test("parsePairwiseResponse: tie is a valid winner", () => {
  const { winner, parseError } = parsePairwiseResponse(JSON.stringify({ winner: "tie", reason: "Equivalent." }));
  assert.equal(winner, "tie");
  assert.equal(parseError, null);
});

test("parsePairwiseResponse: strips a markdown code fence", () => {
  const fenced = "```json\n" + JSON.stringify({ winner: "B", reason: "x" }) + "\n```";
  const { winner, parseError } = parsePairwiseResponse(fenced);
  assert.equal(winner, "B");
  assert.equal(parseError, null);
});

test("parsePairwiseResponse: an invalid winner value never crashes and is treated as null", () => {
  const { winner, parseError } = parsePairwiseResponse(JSON.stringify({ winner: "C", reason: "x" }));
  assert.equal(winner, null);
  assert.ok(parseError);
});

test("parsePairwiseResponse: empty text never crashes", () => {
  const { winner, parseError } = parsePairwiseResponse("");
  assert.equal(winner, null);
  assert.ok(parseError);
});

test("buildPairwisePrompt: carries the reviewer rubric and a capped source diff", () => {
  const prompt = buildPairwisePrompt({
    page: "docs/a.mdx",
    pageRole: "changelog-entry",
    sourceDiff: "+" + "z".repeat(200000),
    versionA: "a",
    versionB: "b",
  });
  assert.ok(prompt.includes(REVIEWER_RUBRIC));
  assert.match(REVIEWER_RUBRIC, /paraphras/i);
  assert.match(REVIEWER_RUBRIC, /diagrams/i);
  assert.match(prompt, /diff truncated by the grader/);
  assert.ok(prompt.length < 70000);
});

test("resultForCandidate maps winner slot to the candidate's result", () => {
  assert.equal(resultForCandidate("A", true), "win");
  assert.equal(resultForCandidate("A", false), "loss");
  assert.equal(resultForCandidate("B", true), "loss");
  assert.equal(resultForCandidate("B", false), "win");
  assert.equal(resultForCandidate("tie", true), "tie");
  assert.equal(resultForCandidate(null, true), null);
});

test("combineOrders: win/loss count only when both orders agree, else tie", () => {
  assert.equal(combineOrders("win", "win"), "win");
  assert.equal(combineOrders("loss", "loss"), "loss");
  assert.equal(combineOrders("tie", "tie"), "tie");
  assert.equal(combineOrders("win", "loss"), "tie");
  assert.equal(combineOrders("loss", "win"), "tie");
  assert.equal(combineOrders("win", "tie"), "tie");
  assert.equal(combineOrders("loss", "tie"), "tie");
  assert.equal(combineOrders(null, "win"), null);
  assert.equal(combineOrders("loss", null), null);
});

// A fake gateway that picks a winner by CONTENT ("bot" or "ref"), so the
// answer is stable no matter which slot each version is shown in.
function fakeByContent(prefer) {
  return async (prompt) => {
    const a = prompt.match(/<version_a>\n([\s\S]*?)\n<\/version_a>/)[1];
    const winner = a === prefer ? "A" : "B";
    return { text: JSON.stringify({ winner, reason: `prefers ${prefer}` }), outputTokens: 7 };
  };
}
const base = { page: "docs/a.mdx", pageRole: "changelog-entry", sourceDiff: "+x", reference: "ref", candidate: "bot" };
const noSleep = async () => {};

test("pairwiseCompare: consistent preference for the candidate is a win, and both raw verdicts are recorded", async () => {
  const r = await pairwiseCompare({ ...base, completeOpts: { complete: fakeByContent("bot"), models: ["m"], sleep: noSleep, benchLog: [] } });
  assert.equal(r.result, "win");
  assert.equal(r.checks[0].score, 1);
  assert.equal(r.checks[0].pass, true);
  assert.match(r.checks[0].detail, /both orders agree/);
  assert.match(r.checks[0].detail, /ref=A,cand=B\] winner=B/);
  assert.match(r.checks[0].detail, /cand=A,ref=B\] winner=A/);
  assert.equal(r.orders.length, 2);
  assert.equal(r.usage.outputTokens, 14);
});

test("pairwiseCompare: consistent preference for the reference is a loss", async () => {
  const r = await pairwiseCompare({ ...base, completeOpts: { complete: fakeByContent("ref"), models: ["m"], sleep: noSleep, benchLog: [] } });
  assert.equal(r.result, "loss");
  assert.equal(r.checks[0].score, 0);
  assert.equal(r.checks[0].pass, false);
});

test("pairwiseCompare: pure position bias (always answers A) collapses to a tie", async () => {
  const alwaysA = async () => ({ text: JSON.stringify({ winner: "A", reason: "first" }), outputTokens: 1 });
  const r = await pairwiseCompare({ ...base, completeOpts: { complete: alwaysA, models: ["m"], sleep: noSleep, benchLog: [] } });
  assert.equal(r.result, "tie");
  assert.equal(r.checks[0].score, 0.5);
  assert.match(r.checks[0].detail, /orders disagree, counted as tie/);
});

test("pairwiseCompare: an unparsable order makes the pair unscorable, never a crash", async () => {
  let n = 0;
  const flaky = async (prompt) => (++n === 1 ? { text: "not json", outputTokens: 1 } : fakeByContent("bot")(prompt));
  const r = await pairwiseCompare({ ...base, completeOpts: { complete: flaky, models: ["m"], sleep: noSleep, benchLog: [] } });
  assert.equal(r.result, null);
  assert.equal(r.checks[0].pass, null);
  assert.match(r.checks[0].detail, /unscorable/);
});
