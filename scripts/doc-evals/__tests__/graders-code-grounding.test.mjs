import { test } from "node:test";
import assert from "node:assert/strict";

import { checkGrounding } from "../graders/checks/grounding.mjs";

function run(before, after) {
  return { before: new Map([["docs/a.mdx", before]]), after: new Map([["docs/a.mdx", after]]) };
}

test("grounding: identifier grounded in the diff passes", () => {
  // Grounding requires a verbatim match, so the canonical signature written
  // on the page must appear the same way in the diff (the `selector` check
  // handles signatures whose param names differ but selector matches).
  const caseDef = { payload: { diff: "+ function transfer(address,uint256) external;" } };
  const before = "old text";
  const after = "old text\nCall `transfer(address,uint256)` to move funds.";
  const [check] = checkGrounding(caseDef, run(before, after));
  assert.equal(check.pass, true);
  assert.equal(check.score, 1);
});

test("grounding: invented identifier absent from every source fails", () => {
  const caseDef = { payload: { diff: "+ function transfer(address to, uint256 amount) external;" } };
  const before = "old text";
  const after = "old text\nCall `wireFunds(address,uint256)` to move funds.";
  const [check] = checkGrounding(caseDef, run(before, after));
  assert.equal(check.pass, false);
  assert.match(check.detail, /wireFunds/);
});

test("grounding: 0x value must be grounded even outside backticks", () => {
  const caseDef = { payload: { diff: "no hex here" } };
  const before = "";
  const after = "The selector is 0xdeadbeef.";
  const [check] = checkGrounding(caseDef, run(before, after));
  assert.equal(check.pass, false);
  assert.match(check.detail, /0xdeadbeef/);
});

test("grounding: stoplisted Solidity types never count as ungrounded", () => {
  const caseDef = { payload: { diff: "nothing relevant" } };
  const before = "";
  const after = "Takes an `address` and a `uint256`.";
  const [check] = checkGrounding(caseDef, run(before, after));
  assert.equal(check.pass, true);
  assert.equal(check.score, 1);
});

test("grounding: a token already on the before-page counts as grounded", () => {
  const caseDef = { payload: { diff: "" } };
  const before = "See `PolicyRegistry` for details.";
  const after = "See `PolicyRegistry` for details.\nAlso see `PolicyRegistry` again.";
  const [check] = checkGrounding(caseDef, run(before, after));
  assert.equal(check.pass, true);
});

test("grounding: backticked full-sentence prose is not treated as an identifier claim", () => {
  const caseDef = { payload: { diff: "" } };
  const before = "";
  const after = "This is `not a real identifier at all`.";
  const [check] = checkGrounding(caseDef, run(before, after));
  assert.equal(check.pass, true);
  assert.match(check.detail, /no backticked identifiers/);
});

test("grounding: skips pages that are not lintable docs pages", () => {
  const caseDef = { payload: { diff: "" } };
  const runData = {
    before: new Map([["docs/AGENTS.md", ""]]),
    after: new Map([["docs/AGENTS.md", "`madeUpSymbol()`"]]),
  };
  const checks = checkGrounding(caseDef, runData);
  assert.deepEqual(checks, []);
});
