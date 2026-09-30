import { test } from "node:test";
import assert from "node:assert/strict";

import { candidateIsVersionA, buildPairwisePrompt, parsePairwiseResponse } from "../graders/pairwise.mjs";

test("candidateIsVersionA: deterministic for a given seed", () => {
  const a = candidateIsVersionA("case-1/docs/foo.mdx");
  const b = candidateIsVersionA("case-1/docs/foo.mdx");
  assert.equal(a, b);
});

test("candidateIsVersionA: different seeds can produce different orders", () => {
  const orders = new Set();
  for (let i = 0; i < 20; i++) orders.add(candidateIsVersionA(`seed-${i}`));
  // Not every seed collapses to the same slot — proves it isn't a constant.
  assert.equal(orders.size, 2);
});

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
