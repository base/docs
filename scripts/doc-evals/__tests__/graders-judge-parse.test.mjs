import { test } from "node:test";
import assert from "node:assert/strict";

import { parseJudgeResponse, CLAIMS } from "../graders/judge.mjs";

const GOOD = JSON.stringify(
  CLAIMS.map((c, i) => ({ id: c.id, pass: i % 2 === 0, reason: `reason for ${c.id}` })),
);

test("parseJudgeResponse: well-formed JSON array parses cleanly", () => {
  const { claims, parseError } = parseJudgeResponse(GOOD);
  assert.equal(parseError, null);
  assert.equal(claims.length, CLAIMS.length);
  assert.equal(claims[0].pass, true);
  assert.equal(claims[0].reason, "reason for J1");
});

test("parseJudgeResponse: strips a markdown code fence the model added anyway", () => {
  const fenced = "```json\n" + GOOD + "\n```";
  const { claims, parseError } = parseJudgeResponse(fenced);
  assert.equal(parseError, null);
  assert.equal(claims.length, CLAIMS.length);
});

test("parseJudgeResponse: recovers a JSON array wrapped in stray prose", () => {
  const wrapped = "Here is my analysis:\n" + GOOD + "\nThat's my verdict.";
  const { claims, parseError } = parseJudgeResponse(wrapped);
  assert.equal(parseError, null);
  assert.equal(claims.length, CLAIMS.length);
});

test("parseJudgeResponse: completely malformed text never crashes, returns pass:null for every claim", () => {
  const { claims, parseError } = parseJudgeResponse("I refuse to answer in JSON.");
  assert.ok(parseError);
  assert.equal(claims.length, CLAIMS.length);
  assert.ok(claims.every((c) => c.pass === null));
});

test("parseJudgeResponse: empty string never crashes", () => {
  const { claims, parseError } = parseJudgeResponse("");
  assert.ok(parseError);
  assert.equal(claims.length, CLAIMS.length);
});

test("parseJudgeResponse: a non-boolean pass is treated as null, not coerced", () => {
  const bad = JSON.stringify([{ id: "J1", pass: "yes", reason: "x" }]);
  const { claims } = parseJudgeResponse(bad);
  assert.equal(claims.find((c) => c.id === "J1").pass, null);
});

test("parseJudgeResponse: a missing claim id is reported as missing, not dropped", () => {
  const partial = JSON.stringify([{ id: "J1", pass: true, reason: "x" }]);
  const { claims } = parseJudgeResponse(partial);
  assert.equal(claims.length, CLAIMS.length);
  const j2 = claims.find((c) => c.id === "J2");
  assert.equal(j2.pass, null);
  assert.match(j2.reason, /missing/);
});
