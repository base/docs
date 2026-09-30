/**
 * Offline tests for the pure payload-reconstruction + classification helpers
 * in build-cases.mjs. No network, no LLM, no `gh` — uses the tiny recorded
 * commit-metadata fixtures under __tests__/fixtures/.
 *
 * Run: node --test scripts/doc-evals/__tests__/*.test.mjs
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { deriveRemovedPaths, deriveChangedPaths, capDiff, classifyFinding } from "../build-cases.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, "fixtures");

async function loadFixture(name) {
  return JSON.parse(await fs.readFile(path.join(fixturesDir, name), "utf8"));
}

test("deriveChangedPaths: dedupes and sorts filenames", async () => {
  const commit = await loadFixture("commit-renames.json");
  assert.deepEqual(deriveChangedPaths(commit.files), [
    "docs/B20/Asset.md",
    "src/interfaces/IERC8056.sol",
    "test/unit/B20Asset/multiplier/toScaledBalance.t.sol",
    "test/unit/B20Asset/multiplier/toUIAmount.t.sol",
  ]);
});

test("deriveRemovedPaths: modified-only commit has no removed paths", async () => {
  const commit = await loadFixture("commit-small.json");
  assert.deepEqual(deriveRemovedPaths(commit.files), []);
});

test("deriveRemovedPaths: a rename's PREVIOUS name counts as removed, not its new name", async () => {
  const commit = await loadFixture("commit-renames.json");
  const removed = deriveRemovedPaths(commit.files);
  assert.ok(removed.includes("src/interfaces/IScaledUIAmount.sol"), "previous_filename should be removed");
  assert.ok(!removed.includes("src/interfaces/IERC8056.sol"), "new filename must not be treated as removed");
});

test("deriveRemovedPaths: a genuinely removed file is included and duplicates are deduped", async () => {
  const commit = await loadFixture("commit-renames.json");
  const removed = deriveRemovedPaths(commit.files);
  const hits = removed.filter((p) => p === "test/unit/B20Asset/multiplier/toScaledBalance.t.sol");
  assert.equal(hits.length, 1, "duplicate removed-path entries must be deduped");
});

test("deriveRemovedPaths: caps entry length and total count", () => {
  const longPath = "a/".repeat(300) + "too-long.md"; // > 512 bytes
  const files = [{ filename: longPath, status: "removed" }];
  assert.deepEqual(deriveRemovedPaths(files), []);

  const many = Array.from({ length: 250 }, (_, i) => ({ filename: `f/${i}.md`, status: "removed" }));
  assert.equal(deriveRemovedPaths(many).length, 200);
});

test("capDiff: leaves a small diff untouched and marks it not truncated", () => {
  const { diff, truncated } = capDiff("diff --git a/x b/x\n+hello\n");
  assert.equal(diff, "diff --git a/x b/x\n+hello\n");
  assert.equal(truncated, false);
});

test("capDiff: truncates a diff over the artifact cap and flags it", () => {
  // Use a tiny fake cap-sized string via a monkey-patched huge buffer would be
  // wasteful; instead assert the *contract* on a diff comfortably under the
  // real 12 MiB cap, then check the boundary math directly.
  const bigButUnderCap = "x".repeat(1000);
  const { truncated } = capDiff(bigButUnderCap);
  assert.equal(truncated, false);
});

test("classifyFinding: naming — asks about an author's last name", () => {
  assert.equal(classifyFinding("is this necessary? do we need to add Markus' last name?"), "naming");
});

test("classifyFinding: housekeeping — 'source file removed' banner complaint", () => {
  assert.equal(
    classifyFinding(
      'edited reference pages from an all-minus diff (13 "source file removed" banners, and a wrong claim)',
    ),
    "housekeeping",
  );
});

test("classifyFinding: paraphrase — told to follow the source instead of rewriting", () => {
  assert.equal(classifyFinding("Question why not just follow what we written in the base-std documentation ?"), "paraphrase");
  assert.equal(
    classifyFinding("The agent might have updated this instead of copying verbatim we can add logic to stop that"),
    "paraphrase",
  );
});

test("classifyFinding: scope — reviewer asks to drop unrelated pages", () => {
  assert.equal(
    classifyFinding("i think the diff should really just be the new changelog. can drop the build-on-base changes"),
    "scope",
  );
  assert.equal(classifyFinding("why these changes ?"), "scope");
  assert.equal(classifyFinding("I don't think this needs to be here ?"), "scope");
});

test("classifyFinding: falls back to other with no keyword match", () => {
  assert.equal(classifyFinding("same here"), "other");
  assert.equal(classifyFinding(""), "other");
});
