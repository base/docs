import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { mean, median, rate, hoursBetween, isStale, humanRewriteRatio, findSupersedingPRs } from "../metrics/stats.mjs";

describe("mean/median", () => {
  test("mean of an empty array is null, not NaN", () => {
    assert.equal(mean([]), null);
  });

  test("median handles even and odd length arrays", () => {
    assert.equal(median([1, 2, 3]), 2);
    assert.equal(median([1, 2, 3, 4]), 2.5);
    assert.equal(median([5]), 5);
    assert.equal(median([]), null);
  });

  test("median is order-independent", () => {
    assert.equal(median([3, 1, 2]), 2);
  });
});

describe("rate", () => {
  test("divides numerator by denominator", () => {
    assert.equal(rate(1, 10), 0.1);
  });

  test("returns null instead of dividing by zero", () => {
    assert.equal(rate(0, 0), null);
  });
});

describe("hoursBetween", () => {
  test("computes positive hours for a later timestamp", () => {
    assert.equal(hoursBetween("2026-09-08T00:00:00Z", "2026-09-08T06:00:00Z"), 6);
  });
});

describe("isStale", () => {
  const now = new Date("2026-09-20T00:00:00Z").getTime();

  test("flags a PR untouched for more than staleDays", () => {
    assert.equal(isStale("2026-09-10T00:00:00Z", 7, now), true);
  });

  test("does not flag a PR updated within staleDays", () => {
    assert.equal(isStale("2026-09-18T00:00:00Z", 7, now), false);
  });
});

describe("humanRewriteRatio", () => {
  test("null when there is nothing to divide by", () => {
    assert.equal(humanRewriteRatio([{ isBot: true }], 0), null);
  });

  test("null when no commit in the list is from the bot", () => {
    assert.equal(humanRewriteRatio([{ isBot: false, additions: 5, deletions: 0 }], 100), null);
  });

  test("0 when nothing after the bot commit changed", () => {
    const commits = [{ isBot: true, additions: 100, deletions: 50 }];
    assert.equal(humanRewriteRatio(commits, 150), 0);
  });

  test("computes the share of post-bot lines from non-bot commits, ignoring bot commits in the tail", () => {
    const commits = [
      { isBot: true, additions: 100, deletions: 50 }, // first bot commit, ignored in numerator
      { isBot: false, additions: 40, deletions: 10 }, // human rewrite: 50 lines
      { isBot: true, additions: 999, deletions: 999 }, // a second bot commit never counts
    ];
    // total PR change = 1351 + 655 in the #1939 fixture; use a round number here.
    assert.equal(humanRewriteRatio(commits, 500), 0.1); // 50 / 500
  });
});

describe("findSupersedingPRs", () => {
  test("finds merged PRs that touched at least one of the open PR's files", () => {
    const open = { number: 1968, files: ["docs/a.mdx", "docs/b.mdx"] };
    const merged = [
      { number: 2025, files: ["docs/b.mdx", "docs/c.mdx"] },
      { number: 2030, files: ["docs/z.mdx"] },
    ];
    const result = findSupersedingPRs(open, merged);
    assert.deepEqual(result.map((r) => r.number), [2025]);
  });

  test("excludes a merged PR that is literally the same PR number", () => {
    const open = { number: 1968, files: ["docs/a.mdx"] };
    const merged = [{ number: 1968, files: ["docs/a.mdx"] }];
    assert.deepEqual(findSupersedingPRs(open, merged), []);
  });

  test("returns an empty array when nothing overlaps", () => {
    const open = { number: 1968, files: ["docs/a.mdx"] };
    const merged = [{ number: 2025, files: ["docs/z.mdx"] }];
    assert.deepEqual(findSupersedingPRs(open, merged), []);
  });
});
