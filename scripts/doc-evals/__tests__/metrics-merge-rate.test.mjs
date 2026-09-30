import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { buildMergeRateReport, renderMergeRateMarkdown } from "../metrics/merge-rate.mjs";

const fixturesDir = path.join(import.meta.dirname, "fixtures", "metrics");
const botPrs = JSON.parse(await readFile(path.join(fixturesDir, "bot-prs.json"), "utf8"));

// Fixture: 4 PRs — #1928 closed unmerged, #1939 merged, #1968 open+fresh,
// #1991 open+stale (updated_at is over a year before "now" below).
const NOW = new Date("2026-09-20T00:00:00Z").getTime();

function detailFor(pr) {
  if (pr.number === 1939) {
    return {
      commits: [
        { sha: "7c7b4e7", login: "github-actions[bot]", isBot: true },
        { sha: "e405074", login: "soheimam", isBot: false, additions: 464, deletions: 520 },
      ],
      files: ["docs/base-chain/specs/reference/b20/interfaces/ib20.mdx"],
    };
  }
  if (pr.number === 1968) {
    return { commits: [{ sha: "a1", login: "github-actions[bot]", isBot: true }], files: ["docs/build-on-base/x.mdx"] };
  }
  if (pr.number === 1991) {
    return { commits: [{ sha: "b1", login: "github-actions[bot]", isBot: true }], files: ["docs/build-on-base/y.mdx"] };
  }
  return { commits: [{ sha: "c1", login: "github-actions[bot]", isBot: true }], files: [] };
}

describe("buildMergeRateReport", () => {
  test("counts opened/merged/closed-unmerged/open from the fixture PR set", () => {
    const detailByNumber = new Map(botPrs.map((pr) => [pr.number, detailFor(pr)]));
    const report = buildMergeRateReport(botPrs, detailByNumber, [], { nowMs: NOW });
    assert.equal(report.opened, 4);
    assert.equal(report.merged, 1);
    assert.equal(report.closedUnmerged, 1);
    assert.equal(report.open, 2);
    assert.deepEqual(report.prNumbers.merged, [1939]);
    assert.deepEqual(report.prNumbers.closedUnmerged, [1928]);
  });

  test("flags the PR untouched for a long time as open-and-stale, not the fresh one", () => {
    const detailByNumber = new Map(botPrs.map((pr) => [pr.number, detailFor(pr)]));
    const report = buildMergeRateReport(botPrs, detailByNumber, [], { nowMs: NOW });
    assert.deepEqual(report.prNumbers.openAndStale, [1991]);
  });

  test("computes merge rate as merged / opened", () => {
    const detailByNumber = new Map(botPrs.map((pr) => [pr.number, detailFor(pr)]));
    const report = buildMergeRateReport(botPrs, detailByNumber, [], { nowMs: NOW });
    assert.equal(report.mergeRate, 0.25);
  });

  test("computes median time to merge in hours from created_at/merged_at", () => {
    const detailByNumber = new Map(botPrs.map((pr) => [pr.number, detailFor(pr)]));
    const report = buildMergeRateReport(botPrs, detailByNumber, [], { nowMs: NOW });
    // #1939: created 2026-09-08T15:44:36Z, merged 2026-09-10T06:00:14Z ≈ 38.26h
    assert.ok(Math.abs(report.medianTimeToMergeHours - 38.26) < 0.1);
  });

  test("computes human rewrite ratio for #1939 from its bot-then-human commit tail", () => {
    const detailByNumber = new Map(botPrs.map((pr) => [pr.number, detailFor(pr)]));
    const report = buildMergeRateReport(botPrs, detailByNumber, [], { nowMs: NOW });
    const entry = report.humanRewriteRatios.find((r) => r.number === 1939);
    // total changed lines for #1939 = 1351 + 655 = 2006; human lines = 464+520=984
    assert.ok(Math.abs(entry.ratio - 984 / 2006) < 1e-9);
  });

  test("flags an open PR as superseded when a later-merged PR touched the same file", () => {
    const detailByNumber = new Map(botPrs.map((pr) => [pr.number, detailFor(pr)]));
    const mergedCandidates = [{ number: 2025, mergedAt: "2026-09-25T00:00:00Z", files: ["docs/build-on-base/x.mdx"] }];
    const report = buildMergeRateReport(botPrs, detailByNumber, mergedCandidates, { nowMs: NOW });
    assert.deepEqual(report.superseded, [{ number: 1968, supersededBy: [2025] }]);
  });

  test("does not flag superseded when the merged candidate predates the open PR", () => {
    const detailByNumber = new Map(botPrs.map((pr) => [pr.number, detailFor(pr)]));
    // #1968 was created 2026-09-16; this "merged" candidate predates it.
    const mergedCandidates = [{ number: 2000, mergedAt: "2026-09-01T00:00:00Z", files: ["docs/build-on-base/x.mdx"] }];
    const report = buildMergeRateReport(botPrs, detailByNumber, mergedCandidates, { nowMs: NOW });
    assert.deepEqual(report.superseded, []);
  });
});

describe("renderMergeRateMarkdown", () => {
  test("renders n/a instead of dividing by zero when nothing is opened", () => {
    const report = buildMergeRateReport([], new Map(), [], { nowMs: NOW });
    const md = renderMergeRateMarkdown(report);
    assert.match(md, /\| Merge rate \| n\/a \|/);
  });

  test("includes a markdown table row per metric and a rewrite-ratio section when present", () => {
    const detailByNumber = new Map(botPrs.map((pr) => [pr.number, detailFor(pr)]));
    const report = buildMergeRateReport(botPrs, detailByNumber, [], { nowMs: NOW });
    const md = renderMergeRateMarkdown(report, { owner: "base", repo: "docs" });
    assert.match(md, /## Merge rate \(base\/docs\)/);
    assert.match(md, /\| Opened \| 4 \|/);
    assert.match(md, /### Human rewrite ratio/);
    assert.match(md, /#1939/);
  });
});
