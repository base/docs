import { test } from "node:test";
import assert from "node:assert/strict";

import { checkChangelogShape, checkChangelogFidelity } from "../graders/checks/changelog.mjs";

const ENTRY_PAGE = "docs/base-chain/specs/reference/b20/changelog/03-denim-b20-transfer-executor-enforcement.mdx";
const SUMMARY_PAGE = "docs/specifications/b20/changelog.mdx";

function runAfter(page, after, before = "") {
  return { after: new Map([[page, after]]), before: new Map([[page, before]]) };
}

test("changelog.shape: entry page with all four sections in order passes", () => {
  const after = [
    "## Abstract",
    "Summary of the change.",
    "## Motivation",
    "Why it exists.",
    "## What Changed",
    "The substance.",
    "## Migration",
    "What to do.",
  ].join("\n\n");
  const [check] = checkChangelogShape({}, runAfter(ENTRY_PAGE, after));
  assert.equal(check.pass, true);
  assert.equal(check.score, 1);
});

test("changelog.shape: entry page missing Migration fails and names it", () => {
  const after = ["## Abstract", "x", "## Motivation", "x", "## What Changed", "x"].join("\n\n");
  const [check] = checkChangelogShape({}, runAfter(ENTRY_PAGE, after));
  assert.equal(check.pass, false);
  assert.match(check.detail, /missing: Migration/);
});

test("changelog.shape: entry page with sections out of order fails", () => {
  const after = [
    "## Abstract", "x", "## Migration", "x", "## Motivation", "x", "## What Changed", "x",
  ].join("\n\n");
  const [check] = checkChangelogShape({}, runAfter(ENTRY_PAGE, after));
  assert.equal(check.pass, false);
  assert.match(check.detail, /out of order/);
});

test("changelog.shape: extra optional sections between required ones are fine", () => {
  const after = [
    "## Abstract", "x", "## Motivation", "x", "## What Changed", "x",
    "## Alternatives Considered", "x", "## Migration", "x", "## Test Cases", "x",
  ].join("\n\n");
  const [check] = checkChangelogShape({}, runAfter(ENTRY_PAGE, after));
  assert.equal(check.pass, true);
});

test("changelog.shape: summary page adding a heading fails", () => {
  const before = "| Product | Change |\n|---|---|\n";
  const after = before + "\n## A New Section\n\nSomething.";
  const [check] = checkChangelogShape({}, runAfter(SUMMARY_PAGE, after, before));
  assert.equal(check.pass, false);
  assert.match(check.detail, /added disallowed content/);
});

test("changelog.shape: summary page adding only a table row passes", () => {
  const before = "| Product | Change |\n|---|---|\n";
  const after = before + "| B20 | Enforce transfer executor | [entry](./entry) |\n";
  const [check] = checkChangelogShape({}, runAfter(SUMMARY_PAGE, after, before));
  assert.equal(check.pass, true);
});

const SOURCE_DIFF = [
  "diff --git a/changelog/03_Denim_B20_TransferExecutor_enforcement.md b/changelog/03_Denim_B20_TransferExecutor_enforcement.md",
  "new file mode 100644",
  "index 0000000..abcdef1",
  "--- /dev/null",
  "+++ b/changelog/03_Denim_B20_TransferExecutor_enforcement.md",
  "@@ -0,0 +1,3 @@",
  "+# Transfer Executor Enforcement",
  "+",
  "+The transfer executor now enforces the allowance check before every transfer completes.",
].join("\n");

test("changelog.fidelity: a page that closely follows the source entry passes", () => {
  const after =
    "## What Changed\n\nThe transfer executor now enforces the allowance check before every transfer completes.";
  const caseDef = { payload: { diff: SOURCE_DIFF } };
  const [check] = checkChangelogFidelity(caseDef, { after: new Map([[ENTRY_PAGE, after]]) });
  assert.equal(check.pass, true);
});

test("changelog.fidelity: a heavily paraphrased page fails", () => {
  const after =
    "## What Changed\n\nWe made some improvements to how funds move between accounts in certain edge cases.";
  const caseDef = { payload: { diff: SOURCE_DIFF } };
  const [check] = checkChangelogFidelity(caseDef, { after: new Map([[ENTRY_PAGE, after]]) });
  assert.equal(check.pass, false);
});

test("changelog.fidelity: no matching source file in the diff means the check is skipped", () => {
  const caseDef = { payload: { diff: "diff --git a/src/Foo.sol b/src/Foo.sol\n+contract Foo {}\n" } };
  const checks = checkChangelogFidelity(caseDef, { after: new Map([[ENTRY_PAGE, "## Abstract\nx"]]) });
  assert.deepEqual(checks, []);
});
