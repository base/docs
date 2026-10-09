import { test } from "node:test";
import assert from "node:assert/strict";

import { checkSelector } from "../graders/checks/selector.mjs";
import { selectorFromSignature } from "../graders/keccak.mjs";

function run(before, after) {
  return { before: new Map([["docs/a.mdx", before]]), after: new Map([["docs/a.mdx", after]]) };
}

test("selector: matching pair from PLAN.md's test vector passes", () => {
  const after = "| `transfer(address,uint256)` | `0xa9059cbb` |";
  const [check] = checkSelector({}, run("", after));
  assert.equal(check.pass, true);
  assert.equal(check.score, 1);
});

test("selector: mismatched pair fails and names the expected value", () => {
  const after = "| `transfer(address,uint256)` | `0x12345678` |";
  const [check] = checkSelector({}, run("", after));
  assert.equal(check.pass, false);
  assert.match(check.detail, /0xa9059cbb/);
});

test("selector: named parameters are canonicalized before hashing", () => {
  const after = "`transfer(address to, uint256 amount)` -> `0xa9059cbb`";
  const [check] = checkSelector({}, run("", after));
  assert.equal(check.pass, true);
});

test("selector: enum parameter is accepted when hashed as uint8", () => {
  // vote(uint8) is the ABI-canonical form of vote(Choice) when Choice is an
  // enum with up to 256 members — the only size Solidity ever emits.
  const selector = selectorFromSignature("vote(uint8)");
  const after = `\`vote(Choice)\` selector: \`${selector}\``;
  const [check] = checkSelector({}, run("", after));
  assert.equal(check.pass, true);
});

test("selector: a bare signature with no nearby selector is not a pair to check", () => {
  const after = "The function `transfer(address,uint256)` moves funds.";
  const checks = checkSelector({}, run("", after));
  const [check] = checks;
  assert.equal(check.score, 1);
  assert.match(check.detail, /no signature\/selector pairs/);
});

test("selector: skips pages that are not lintable docs pages", () => {
  const runData = { before: new Map([["docs/AGENTS.md", ""]]), after: new Map([["docs/AGENTS.md", "`transfer(address,uint256)` `0xbadbad00`"]]) };
  assert.deepEqual(checkSelector({}, runData), []);
});
