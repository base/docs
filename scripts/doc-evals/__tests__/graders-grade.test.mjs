import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { gradeRep, buildRunSummary, OVERALL_WEIGHTS } from "../graders/gradeRep.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_CASE = JSON.parse(
  await import("node:fs").then((fs) => fs.promises.readFile(path.join(__dirname, "fixtures/cases/case-a.json"), "utf8")),
);
const REP_DIR = path.join(__dirname, "fixtures/runs/fake-run/case-a/rep-1");

test("gradeRep: --no-judge --no-pairwise runs only code checks and never writes to disk", async () => {
  const grade = await gradeRep(FIXTURE_CASE, REP_DIR, { noJudge: true, noPairwise: true, write: false });
  assert.equal(grade.caseId, "case-a");
  assert.equal(grade.rep, 1);
  assert.ok(grade.checks.length > 0);
  assert.ok(grade.checks.every((c) => c.layer === "code"));
  assert.equal(grade.summary.judge, null);
  assert.equal(grade.summary.pairwise, null);
  assert.equal(grade.summary.cost.inputTokens, 0);
  assert.equal(grade.summary.cost.outputTokens, 0);
  // overall collapses to the code term alone when judge/pairwise are skipped.
  assert.equal(grade.summary.overall, grade.summary.code);
});

test("gradeRep: injected judgePage feeds judge checks and cost into the summary", async () => {
  const fakeJudgePage = async ({ page }) => ({
    checks: [
      { id: "judge.J1", layer: "judge", page, pass: true, score: 1, detail: "ok" },
      { id: "judge.J2", layer: "judge", page, pass: false, score: 0, detail: "nope" },
    ],
    usage: { inputTokens: 100, outputTokens: 20 },
    model: "fake-model",
  });
  const grade = await gradeRep(FIXTURE_CASE, REP_DIR, {
    noPairwise: true,
    write: false,
    judgePage: fakeJudgePage,
  });
  assert.equal(grade.summary.judge, 0.5);
  assert.equal(grade.summary.cost.inputTokens, 100);
  assert.equal(grade.summary.cost.outputTokens, 20);
  // overall is a weighted blend of code and judge only (pairwise skipped).
  const expected =
    (OVERALL_WEIGHTS.code * grade.summary.code + OVERALL_WEIGHTS.judge * grade.summary.judge) /
    (OVERALL_WEIGHTS.code + OVERALL_WEIGHTS.judge);
  assert.ok(Math.abs(grade.summary.overall - expected) < 1e-9);
});

test("gradeRep: with a reference, injected pairwiseCompare feeds the pairwise summary", async () => {
  const caseWithReference = { ...FIXTURE_CASE, reference: { commit: "deadbeef", pr: 1, pages: ["docs/base-chain/specs/reference/a.mdx"] } };
  const fakeReadReference = async () => "reference page content";
  const fakePairwise = async ({ page }) => ({
    checks: [{ id: "pairwise", layer: "pairwise", page, pass: true, score: 1, detail: "win" }],
    usage: { inputTokens: 50, outputTokens: 10 },
    model: "fake-model",
    result: "win",
    order: "candidate=A, reference=B",
  });
  const grade = await gradeRep(caseWithReference, REP_DIR, {
    noJudge: true,
    write: false,
    readReference: fakeReadReference,
    pairwiseCompare: fakePairwise,
  });
  assert.equal(grade.summary.pairwise, 1);
  assert.equal(grade.summary.cost.inputTokens, 50);
});

test("gradeRep: normally overall is above 0 when the run touched its expected scope", async () => {
  const grade = await gradeRep(FIXTURE_CASE, REP_DIR, { noJudge: true, noPairwise: true, write: false });
  assert.ok(grade.summary.overall > 0);
});

test("gradeRep: zero touched pages when scope.in is non-empty forces overall to 0 (PLAN.md \"Overall score\")", async () => {
  const rep2Dir = path.join(__dirname, "fixtures/runs/fake-run/case-a/rep-2");
  const grade = await gradeRep(FIXTURE_CASE, rep2Dir, { noJudge: true, noPairwise: true, write: false });
  assert.equal(grade.summary.overall, 0);
});

test("buildRunSummary: aggregates per-case means and split means", () => {
  const entries = [
    { caseId: "c1", rep: 1, split: "train", grade: { summary: { overall: 0.8, cost: { inputTokens: 10, outputTokens: 5 } } } },
    { caseId: "c1", rep: 2, split: "train", grade: { summary: { overall: 0.6, cost: { inputTokens: 10, outputTokens: 5 } } } },
    { caseId: "c2", rep: 1, split: "test", grade: { summary: { overall: 0.9, cost: { inputTokens: 20, outputTokens: 8 } } } },
  ];
  const summary = buildRunSummary(entries);
  const c1 = summary.casesTable.find((c) => c.caseId === "c1");
  assert.equal(c1.reps, 2);
  assert.equal(c1.meanOverall, 0.7);
  assert.equal(summary.splitMeans.train, 0.7);
  assert.equal(summary.splitMeans.test, 0.9);
  assert.equal(summary.totalCost.inputTokens, 40);
  assert.equal(summary.totalCost.outputTokens, 18);
});

test("gradeRep: drafted scope checks appear in checks[] but do not count toward summary.code", async () => {
  const drafted = { ...FIXTURE_CASE, scope: { ...FIXTURE_CASE.scope, in: ["docs/nope.mdx"], out: [], label_source: "drafted" } };
  const confirmed = { ...drafted, scope: { ...drafted.scope, label_source: "reference" } };
  const gd = await gradeRep(drafted, REP_DIR, { noJudge: true, noPairwise: true, write: false });
  const gc = await gradeRep(confirmed, REP_DIR, { noJudge: true, noPairwise: true, write: false });
  const scopeChecks = gd.checks.filter((c) => c.id.startsWith("scope."));
  assert.ok(scopeChecks.length >= 2);
  assert.ok(scopeChecks.every((c) => c.pass === null && /unconfirmed drafted labels/.test(c.detail)));
  // Same run, wrong scope.in: confirmed labels produce a scope term that drags
  // overall down; drafted ones produce no scope term at all.
  assert.equal(gd.summary.scope, null);
  assert.ok(gc.summary.scope < 1);
  assert.ok(gc.summary.overall < gd.summary.overall);
  assert.ok(Math.abs(gc.summary.code - gd.summary.code) < 1e-9, "scope checks no longer feed the code term");
  const nonScope = gd.checks.filter((c) => c.layer === "code" && !c.id.startsWith("scope."));
  const expected = nonScope.reduce((s, c) => s + c.score, 0) / nonScope.length;
  assert.ok(Math.abs(gd.summary.code - expected) < 1e-9);
});

test("gradeRep: passes the case payload diff to the judge and pairwise", async () => {
  const seen = { judge: null, pair: null };
  const caseWithReference = { ...FIXTURE_CASE, reference: { commit: "deadbeef", pr: 1, pages: [] } };
  await gradeRep(caseWithReference, REP_DIR, {
    write: false,
    readReference: async () => "ref",
    judgePage: async (ctx) => {
      seen.judge = ctx.sourceDiff;
      return { checks: [], usage: { inputTokens: 0, outputTokens: 0 }, model: "m" };
    },
    pairwiseCompare: async (ctx) => {
      seen.pair = ctx.sourceDiff;
      return { checks: [], usage: { inputTokens: 0, outputTokens: 0 }, model: "m", result: "tie", order: "" };
    },
  });
  assert.equal(seen.judge, FIXTURE_CASE.payload.diff);
  assert.equal(seen.pair, FIXTURE_CASE.payload.diff);
});
