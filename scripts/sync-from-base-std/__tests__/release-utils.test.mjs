/**
 * Unit tests for the zero-dependency release-discovery helpers.
 *
 * Run with Node's built-in test runner (no extra dependency, no SDK):
 *   node --test scripts/sync-from-base/__tests__/release-utils.test.mjs
 *
 * These functions are the load-bearing pure logic of the release path:
 * chunking a tag-to-tag diff for the manifest pre-pass, merging the per-chunk
 * manifests, the discovery exclude-glob matcher, the bounded worker pool, and
 * the selection-prompt manifest summary. Each test asserts the contract the
 * rest of the system depends on, plus the edge cases that show up in real
 * release data (empty diff, one giant file, duplicate manifest entries).
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  mapWithConcurrency,
  chunkDiffBySize,
  mergeManifests,
  globToRegExp,
  summarizeManifest,
  sanitizeManifestRecords,
} from "../release-utils.mjs";

// ------------------------------------------------------------ chunkDiffBySize

const fileDiff = (path, body) =>
  `diff --git a/${path} b/${path}\nindex 000..111 100644\n--- a/${path}\n+++ b/${path}\n${body}\n`;

test("chunkDiffBySize: empty / whitespace input returns []", () => {
  assert.deepEqual(chunkDiffBySize("", 100), []);
  assert.deepEqual(chunkDiffBySize("   \n  ", 100), []);
  assert.deepEqual(chunkDiffBySize(null, 100), []);
});

test("chunkDiffBySize: small diff stays one chunk", () => {
  const diff = fileDiff("a.rs", "+one") + fileDiff("b.rs", "+two");
  const chunks = chunkDiffBySize(diff, 10000);
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0], diff);
});

test("chunkDiffBySize: cuts on file boundaries, never mid-file", () => {
  const a = fileDiff("a.rs", "+aaaa");
  const b = fileDiff("b.rs", "+bbbb");
  const c = fileDiff("c.rs", "+cccc");
  // Cap just above one file so each chunk holds whole files only.
  const chunks = chunkDiffBySize(a + b + c, a.length + 5);
  // Every chunk must start at a file boundary and contain whole files.
  for (const ch of chunks) {
    assert.ok(ch.startsWith("diff --git "), `chunk should start at a file header: ${ch.slice(0, 20)}`);
    assert.equal((ch.match(/^diff --git /gm) || []).length >= 1, true);
  }
  // Reassembling the chunks reproduces the input exactly (no bytes lost/dupes).
  assert.equal(chunks.join(""), a + b + c);
});

test("chunkDiffBySize: a single file larger than the cap becomes its own chunk", () => {
  const big = fileDiff("huge.rs", "+" + "x".repeat(500));
  const small = fileDiff("small.rs", "+y");
  const chunks = chunkDiffBySize(big + small, 100);
  assert.equal(chunks.join(""), big + small);
  // The oversized file is isolated rather than split mid-hunk.
  assert.ok(chunks.some((c) => c.includes("huge.rs") && !c.includes("small.rs")));
});

// ------------------------------------------------------------- mergeManifests

test("mergeManifests: dedupes on file+kind+subject", () => {
  const a = [
    { file: "x.rs", kind: "field_added", subject: "T.a", summary: "first" },
    { file: "x.rs", kind: "field_added", subject: "T.b", summary: "keep" },
  ];
  const b = [
    { file: "x.rs", kind: "field_added", subject: "T.a", summary: "dup-different-summary" },
    { file: "y.rs", kind: "signature_change", subject: "f", summary: "new" },
  ];
  const merged = mergeManifests([a, b]);
  assert.equal(merged.length, 3);
  // First occurrence wins for a duplicate key.
  const ta = merged.find((e) => e.subject === "T.a");
  assert.equal(ta.summary, "first");
});

test("mergeManifests: tolerates non-array members and non-object entries", () => {
  const merged = mergeManifests([
    null,
    "nope",
    [{ file: "a", kind: "k", subject: "s" }, 42, null],
  ]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].subject, "s");
});

test("sanitizeManifestRecords: accepts only bounded, single-line schema records", () => {
  const out = sanitizeManifestRecords([
    { file: "x.rs", kind: "field_added", subject: "T.a", summary: "safe", before: "", after: "u64" },
    { file: "x.rs", kind: "invented", subject: "T.b", summary: "bad kind" },
    { file: "x.rs", kind: "field_added", subject: "T.c\ninstruction", summary: "bad newline" },
  ]);
  assert.deepEqual(out, [
    { file: "x.rs", kind: "field_added", subject: "T.a", summary: "safe", after: "u64" },
  ]);
});

// --------------------------------------------------------------- globToRegExp

test("globToRegExp: * matches within a path segment, not across /", () => {
  const re = globToRegExp("docs/base-chain/*.mdx");
  assert.ok(re.test("docs/base-chain/index.mdx"));
  assert.ok(!re.test("docs/base-chain/sub/index.mdx"));
});

test("globToRegExp: ** matches across segments", () => {
  const re = globToRegExp("docs/base-chain/**/llms.txt");
  assert.ok(re.test("docs/base-chain/llms.txt"));
  assert.ok(re.test("docs/base-chain/a/b/llms.txt"));
  assert.ok(!re.test("docs/other/llms.txt"));
});

test("globToRegExp: regex metacharacters in the literal part are escaped", () => {
  const re = globToRegExp("content/a.b/file.mdx");
  assert.ok(re.test("content/a.b/file.mdx"));
  // The '.' must be literal, not "any char".
  assert.ok(!re.test("content/axb/fileXmdx"));
});

// ----------------------------------------------------------- summarizeManifest

test("summarizeManifest: empty manifest yields empty string", () => {
  assert.equal(summarizeManifest([]), "");
  assert.equal(summarizeManifest(null), "");
});

test("summarizeManifest: caps entries and notes the remainder", () => {
  const manifest = Array.from({ length: 5 }, (_, i) => ({
    kind: "field_added",
    subject: `T.f${i}`,
    file: "x.rs",
  }));
  const out = summarizeManifest(manifest, 2);
  const lines = out.split("\n");
  assert.equal(lines.length, 3); // 2 entries + 1 "and N more"
  assert.match(lines[0], /\[field_added\] T\.f0 \(x\.rs\)/);
  assert.match(lines[2], /and 3 more change\(s\)/);
});

// --------------------------------------------------------- mapWithConcurrency

test("mapWithConcurrency: preserves input order regardless of completion order", async () => {
  const items = [30, 10, 20, 5];
  const results = await mapWithConcurrency(items, 2, async (n) => {
    await new Promise((r) => setTimeout(r, n));
    return n * 2;
  });
  assert.deepEqual(results, [60, 20, 40, 10]);
});

test("mapWithConcurrency: never exceeds the concurrency limit", async () => {
  let inFlight = 0;
  let maxInFlight = 0;
  const items = Array.from({ length: 12 }, (_, i) => i);
  await mapWithConcurrency(items, 3, async () => {
    inFlight++;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise((r) => setTimeout(r, 5));
    inFlight--;
  });
  assert.ok(maxInFlight <= 3, `max in flight was ${maxInFlight}, expected <= 3`);
});

test("mapWithConcurrency: empty input returns []", async () => {
  const results = await mapWithConcurrency([], 4, async () => 1);
  assert.deepEqual(results, []);
});

test("mapWithConcurrency: a rejection propagates", async () => {
  await assert.rejects(
    mapWithConcurrency([1, 2, 3], 2, async (n) => {
      if (n === 2) throw new Error("boom");
      return n;
    }),
    /boom/,
  );
});
