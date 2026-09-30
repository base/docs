import { test } from "node:test";
import assert from "node:assert/strict";

import { checkScope } from "../graders/checks/scope.mjs";

function caseWith(scope) {
  return { scope };
}

test("scope: perfect run has precision=1 and recall=1, no forbidden entries", () => {
  const def = caseWith({ in: ["docs/a.mdx", "docs/b.mdx"], out: ["docs/c.mdx"] });
  const run = { meta: { touched: ["docs/a.mdx", "docs/b.mdx"] } };
  const checks = checkScope(def, run);
  const byId = Object.fromEntries(checks.map((c) => [c.id + "|" + c.page, c]));
  assert.equal(byId["scope.precision|null"].score, 1);
  assert.equal(byId["scope.recall|null"].score, 1);
  assert.equal(checks.some((c) => c.id === "scope.forbidden"), false);
});

test("scope: touching an out-of-scope page fails scope.forbidden and drags precision down", () => {
  const def = caseWith({ in: ["docs/a.mdx"], out: ["docs/c.mdx"] });
  const run = { meta: { touched: ["docs/a.mdx", "docs/c.mdx"] } };
  const checks = checkScope(def, run);
  const precision = checks.find((c) => c.id === "scope.precision");
  const forbidden = checks.find((c) => c.id === "scope.forbidden");
  assert.equal(precision.score, 0.5);
  assert.equal(forbidden.pass, false);
  assert.equal(forbidden.page, "docs/c.mdx");
});

test("scope: missing an expected page fails recall", () => {
  const def = caseWith({ in: ["docs/a.mdx", "docs/b.mdx"], out: [] });
  const run = { meta: { touched: ["docs/a.mdx"] } };
  const checks = checkScope(def, run);
  const recall = checks.find((c) => c.id === "scope.recall");
  assert.equal(recall.score, 0.5);
  assert.equal(recall.pass, false);
});

test("scope: empty scope.in is vacuously perfect recall when nothing was touched", () => {
  const def = caseWith({ in: [], out: [] });
  const run = { meta: { touched: [] } };
  const checks = checkScope(def, run);
  assert.equal(checks.find((c) => c.id === "scope.recall").score, 1);
  assert.equal(checks.find((c) => c.id === "scope.precision").score, 1);
});

test("scope: generated index files are excluded from touched before comparison", () => {
  const def = caseWith({ in: ["docs/a.mdx"], out: [] });
  const run = { meta: { touched: ["docs/a.mdx", "docs/AGENTS.md", "docs/llms.txt", "docs/llms-full.txt"] } };
  const checks = checkScope(def, run);
  assert.equal(checks.find((c) => c.id === "scope.precision").score, 1);
});

test("scope: drafted labels are reported with pass:null and an 'unconfirmed' detail", () => {
  const def = caseWith({ in: ["docs/a.mdx"], out: ["docs/c.mdx"], label_source: "drafted" });
  const run = { meta: { touched: ["docs/c.mdx"] } };
  const checks = checkScope(def, run);
  assert.deepEqual(
    checks.map((c) => c.id).sort(),
    ["scope.forbidden", "scope.precision", "scope.recall"],
  );
  for (const c of checks) {
    assert.equal(c.pass, null);
    assert.match(c.detail, /unconfirmed drafted labels/);
  }
});

test("scope: reference/review labels still score normally", () => {
  const def = caseWith({ in: ["docs/a.mdx"], out: [], label_source: "reference" });
  const checks = checkScope(def, { meta: { touched: ["docs/a.mdx"] } });
  assert.ok(checks.every((c) => c.pass === true));
});
