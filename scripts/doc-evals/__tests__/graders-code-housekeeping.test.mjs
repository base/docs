import { test } from "node:test";
import assert from "node:assert/strict";

import { checkHousekeeping } from "../graders/checks/housekeeping.mjs";

function run(after) {
  return { after: new Map([["docs/base-chain/specs/reference/a.mdx", after]]) };
}

test("housekeeping: a reader-facing callout passes", () => {
  const after = "<Warning>`burnBlocked` is deprecated; use `seizeWithMemo` instead.</Warning>";
  const [check] = checkHousekeeping({}, run(after));
  assert.equal(check.pass, true);
  assert.equal(check.score, 1);
});

test("housekeeping: a source-file-removed callout fails", () => {
  const after =
    "<Note>The source file docs/B20/Asset.md has been removed as part of a documentation restructure.</Note>";
  const [check] = checkHousekeeping({}, run(after));
  assert.equal(check.pass, false);
  assert.equal(check.score, 0);
});

test("housekeeping: skips pages that are not lintable docs pages", () => {
  const checks = checkHousekeeping({}, { after: new Map([["docs/llms.txt", "<Note>source file removed as part of a restructure</Note>"]]) });
  assert.deepEqual(checks, []);
});
