import { test } from "node:test";
import assert from "node:assert/strict";

import { checkLint } from "../graders/checks/lint.mjs";

function run(after) {
  return { after: new Map([["docs/base-chain/specs/reference/a.mdx", after]]) };
}

const GOOD_PAGE = `---
title: "A Test Page"
description: "A short, valid description of this page."
---

## First Section

Some terse prose about the topic.
`;

test("lint: a clean page passes with score 1", () => {
  const [check] = checkLint({}, run(GOOD_PAGE));
  assert.equal(check.pass, true);
  assert.equal(check.score, 1);
});

test("lint: missing frontmatter is an error and lowers the score", () => {
  const badPage = "## Heading only, no frontmatter\n";
  const [check] = checkLint({}, run(badPage));
  assert.equal(check.pass, false);
  assert.ok(check.score < 1);
  assert.match(check.detail, /frontmatter/);
});

test("lint: skips pages that are not lintable docs pages", () => {
  const checks = checkLint({}, { after: new Map([["docs/AGENTS.md", "no frontmatter"]]) });
  assert.deepEqual(checks, []);
});
