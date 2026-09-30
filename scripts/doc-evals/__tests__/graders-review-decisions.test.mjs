// Senior-review decisions from 2026-09-30 (see PLAN.md "Decisions"):
// directory rules in scope.out, grading errors excluded from means, and no
// pairwise comparison for changelog entry pages.
import { test } from "node:test";
import assert from "node:assert/strict";

import { checkScope } from "../graders/checks/scope.mjs";
import { summarize } from "../graders/gradeRep.mjs";

test("scope.out entry ending in / forbids every page under that directory", () => {
  const def = { scope: { in: ["docs/specifications/b20/a.mdx"], out: ["docs/build-on-base/"], label_source: "review" } };
  const run = {
    meta: {
      touched: [
        "docs/specifications/b20/a.mdx",
        "docs/build-on-base/issue-rwa/create-an-asset-token.mdx",
        "docs/build-on-base/accept-payments/request-a-payment.mdx",
      ],
    },
  };
  const forbidden = checkScope(def, run).filter((c) => c.id === "scope.forbidden");
  assert.deepEqual(
    forbidden.map((c) => c.page).sort(),
    ["docs/build-on-base/accept-payments/request-a-payment.mdx", "docs/build-on-base/issue-rwa/create-an-asset-token.mdx"],
  );
  assert.ok(forbidden.every((c) => c.pass === false && c.score === 0));
});

test("scope.out directory rule does not match a sibling directory with the same prefix", () => {
  const def = { scope: { in: [], out: ["docs/build-on-base/"], label_source: "review" } };
  const run = { meta: { touched: ["docs/build-on-base-legacy/x.mdx"] } };
  assert.equal(checkScope(def, run).some((c) => c.id === "scope.forbidden"), false);
});

test("summarize: failed judge/pairwise calls are excluded from means and counted as gradingErrors", () => {
  const caseDef = { scope: { in: ["docs/a.mdx"] }, reference: { commit: "x", pages: ["docs/a.mdx"] } };
  const run = { meta: { touched: ["docs/a.mdx"], exitCode: 0 } };
  const checks = [
    { id: "lint", layer: "code", page: "docs/a.mdx", pass: true, score: 1 },
    { id: "judge.J1", layer: "judge", page: "docs/a.mdx", pass: true, score: 1 },
    { id: "judge.J2", layer: "judge", page: "docs/a.mdx", pass: null, score: 0, detail: "judge call failed" },
    { id: "pairwise", layer: "pairwise", page: "docs/a.mdx", pass: null, score: 0, detail: "pairwise call failed" },
  ];
  const s = summarize(caseDef, run, checks, { inputTokens: 0, outputTokens: 0 }, { judgeSkipped: false, pairwiseSkipped: false });
  assert.equal(s.judge, 1, "the failed J2 must not drag the judge mean down");
  assert.equal(s.pairwise, null, "no scoreable pairwise verdict left");
  assert.equal(s.gradingErrors, 2);
  assert.equal(s.overall, (0.5 * 1 + 0.3 * 1) / 0.8);
});

test("summarize: unconfirmed drafted scope checks (code, pass null) are not grading errors", () => {
  const caseDef = { scope: { in: [], label_source: "drafted" } };
  const run = { meta: { touched: [], exitCode: 0 } };
  const checks = [{ id: "scope.precision", layer: "code", page: null, pass: null, score: 1 }];
  const s = summarize(caseDef, run, checks, { inputTokens: 0, outputTokens: 0 }, { judgeSkipped: true, pairwiseSkipped: true });
  assert.equal(s.gradingErrors, 0);
  assert.equal(s.code, null);
});
