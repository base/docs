import { test } from "node:test";
import assert from "node:assert/strict";

import { checkNoop } from "../graders/checks/noop.mjs";

test("noop: no reference means no checks", () => {
  const caseDef = { reference: null };
  const checks = checkNoop(caseDef, { meta: { touched: [] } });
  assert.deepEqual(checks, []);
});

test("noop: a reference page the run touched passes", () => {
  const caseDef = { reference: { pages: ["docs/a.mdx"] } };
  const checks = checkNoop(caseDef, { meta: { touched: ["docs/a.mdx"] } });
  assert.equal(checks.length, 1);
  assert.equal(checks[0].pass, true);
});

test("noop: a reference page the run left unchanged fails", () => {
  const caseDef = { reference: { pages: ["docs/a.mdx", "docs/b.mdx"] } };
  const checks = checkNoop(caseDef, { meta: { touched: ["docs/a.mdx"] } });
  const failing = checks.find((c) => c.page === "docs/b.mdx");
  assert.equal(failing.pass, false);
  const passing = checks.find((c) => c.page === "docs/a.mdx");
  assert.equal(passing.pass, true);
});
