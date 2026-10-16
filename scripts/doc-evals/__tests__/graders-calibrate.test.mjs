import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { gatherGradedPages, sampleForCalibration, renderLabelsMd, scoreLabels } from "../calibrate.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_RUNS_DIR = path.join(__dirname, "fixtures/calibration-runs");

test("gatherGradedPages: flattens judge checks per (case, rep, page), skipping code checks", async () => {
  const pages = await gatherGradedPages(FIXTURE_RUNS_DIR);
  assert.equal(pages.length, 3); // case-x/docs/a.mdx, case-x/docs/b.mdx, case-y/docs/c.mdx
  const a = pages.find((p) => p.page === "docs/a.mdx");
  assert.equal(a.caseId, "case-x");
  assert.equal(a.claims.length, 2);
  assert.ok(a.claims.every((c) => c.claimId === "J1" || c.claimId === "J2"));
});

test("sampleForCalibration: same seed always produces the same sample and order", async () => {
  const pages = await gatherGradedPages(FIXTURE_RUNS_DIR);
  const a = sampleForCalibration(pages, { seed: "fixed-seed", sampleSize: 2 });
  const b = sampleForCalibration(pages, { seed: "fixed-seed", sampleSize: 2 });
  assert.deepEqual(a.map((e) => e.id), b.map((e) => e.id));
  assert.equal(a.length, 2);
});

test("sampleForCalibration: different seeds can produce a different sample", async () => {
  const pages = await gatherGradedPages(FIXTURE_RUNS_DIR);
  const a = sampleForCalibration(pages, { seed: "seed-a", sampleSize: 3 });
  const b = sampleForCalibration(pages, { seed: "seed-b", sampleSize: 3 });
  assert.notDeepEqual(a.map((e) => e.id), b.map((e) => e.id));
});

test("sampleForCalibration: every claim carries the judge verdict and an empty human field", async () => {
  const pages = await gatherGradedPages(FIXTURE_RUNS_DIR);
  const sample = sampleForCalibration(pages, { sampleSize: 10 });
  for (const entry of sample) {
    for (const claim of entry.claims) {
      assert.ok(typeof claim.judge.pass === "boolean");
      assert.equal(claim.human.pass, null);
      assert.equal(claim.human.reason, "");
      assert.ok(claim.claimText.length > 0);
    }
  }
});

test("renderLabelsMd: never mentions the judge's verdict", async () => {
  const pages = await gatherGradedPages(FIXTURE_RUNS_DIR);
  const sample = sampleForCalibration(pages, { sampleSize: 10 });
  const md = renderLabelsMd(sample);
  assert.match(md, /docs\/a\.mdx/);
  assert.doesNotMatch(md, /"pass":\s*true/);
  assert.doesNotMatch(md, /"pass":\s*false/);
});

test("scoreLabels: unlabeled claims (human.pass still null) are excluded from agreement", () => {
  const entries = [
    {
      id: "x",
      claims: [
        { claimId: "J1", judge: { pass: true }, human: { pass: null } },
        { claimId: "J2", judge: { pass: false }, human: { pass: null } },
      ],
    },
  ];
  const { overallRate } = scoreLabels(entries);
  assert.equal(overallRate, null);
});

test("scoreLabels: computes per-claim and overall agreement, and the 80% bar", () => {
  const entries = [
    {
      id: "x",
      claims: [
        { claimId: "J1", judge: { pass: true }, human: { pass: true } }, // agree
        { claimId: "J1", judge: { pass: true }, human: { pass: false } }, // disagree
        { claimId: "J2", judge: { pass: false }, human: { pass: false } }, // agree
      ],
    },
  ];
  const { perClaim, overallRate, clears80 } = scoreLabels(entries);
  assert.equal(perClaim.J1.agree, 1);
  assert.equal(perClaim.J1.total, 2);
  assert.equal(perClaim.J2.rate, 1);
  assert.ok(Math.abs(overallRate - 2 / 3) < 1e-9);
  assert.equal(clears80, false);
});

test("scoreLabels: 100% agreement clears the 80% bar", () => {
  const entries = [
    { id: "x", claims: [{ claimId: "J1", judge: { pass: true }, human: { pass: true } }] },
  ];
  const { clears80 } = scoreLabels(entries);
  assert.equal(clears80, true);
});
