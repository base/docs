import { test } from "node:test";
import assert from "node:assert/strict";

import { addedLines } from "../graders/line-diff.mjs";

test("addedLines: pure insertion", () => {
  const before = "a\nb\nc";
  const after = "a\nb\nNEW\nc";
  assert.deepEqual(addedLines(before, after), ["NEW"]);
});

test("addedLines: pure deletion adds nothing", () => {
  const before = "a\nb\nc";
  const after = "a\nc";
  assert.deepEqual(addedLines(before, after), []);
});

test("addedLines: identical text has no additions", () => {
  const text = "one\ntwo\nthree";
  assert.deepEqual(addedLines(text, text), []);
});

test("addedLines: new file (empty before) — every line is added", () => {
  const after = "line1\nline2";
  assert.deepEqual(addedLines("", after), ["line1", "line2"]);
});

test("addedLines: reordering without change is not an addition", () => {
  const before = "x\ny";
  const after = "y\nx";
  // LCS picks the longer common subsequence; either "x" or "y" alone is
  // common, so exactly one line is reported as added, not two.
  assert.equal(addedLines(before, after).length, 1);
});
