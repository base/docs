import { test } from "node:test";
import assert from "node:assert/strict";

import { runCodeChecks } from "../graders/code.mjs";

// A tiny end-to-end fixture: one in-scope page, one forbidden touch, no
// reference. Exercises that the aggregator concatenates every sub-check's
// output rather than dropping any.
test("runCodeChecks: concatenates every sub-check's output", () => {
  const caseDef = {
    scope: { in: ["docs/base-chain/specs/reference/a.mdx"], out: ["docs/base-chain/specs/reference/b.mdx"] },
    payload: { diff: "+ function transfer(address,uint256) external;" },
    reference: null,
  };
  const goodPage = `---
title: "A Page"
description: "A short description."
---

## Section

Call \`transfer(address,uint256)\` (selector \`0xa9059cbb\`).
`;
  const run = {
    meta: { touched: ["docs/base-chain/specs/reference/a.mdx", "docs/base-chain/specs/reference/b.mdx"] },
    before: new Map([
      ["docs/base-chain/specs/reference/a.mdx", ""],
      ["docs/base-chain/specs/reference/b.mdx", ""],
    ]),
    after: new Map([
      ["docs/base-chain/specs/reference/a.mdx", goodPage],
      ["docs/base-chain/specs/reference/b.mdx", goodPage],
    ]),
  };

  const checks = runCodeChecks(caseDef, run);
  const ids = new Set(checks.map((c) => c.id));
  // Every check module contributed something.
  assert.ok(ids.has("scope.precision"));
  assert.ok(ids.has("scope.recall"));
  assert.ok(ids.has("scope.forbidden"));
  assert.ok(ids.has("grounding"));
  assert.ok(ids.has("selector"));
  assert.ok(ids.has("lint"));
  assert.ok(ids.has("housekeeping"));
  // Neither page is a changelog page, and there's no reference, so those
  // checks contribute nothing here — confirmed by their absence.
  assert.ok(!ids.has("changelog.shape"));
  assert.ok(!ids.has("noop"));

  const forbidden = checks.find((c) => c.id === "scope.forbidden");
  assert.equal(forbidden.page, "docs/base-chain/specs/reference/b.mdx");
});
