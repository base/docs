/**
 * Offline tests for replay/log-parser.mjs against canned log excerpts shaped
 * like real scripts/sync-from-base-std/index.mjs output (see that file's
 * [write]/[create]/[reject]/[noop]/[skip] console lines).
 */

import test from "node:test";
import assert from "node:assert/strict";

import { parseSyncLog } from "../replay/log-parser.mjs";

test("parseSyncLog: a plain write is touched", () => {
  const log = [
    "[sync] kind=code-change sha=868d513",
    "::group::docs/specifications/b20/index.mdx",
    "[claude] docs/specifications/b20/index.mdx — 4200 prompt chars (role=guide)",
    "[write] docs/specifications/b20/index.mdx",
    "::endgroup::",
  ].join("\n");
  const { touched, rejected, unchanged } = parseSyncLog(log);
  assert.deepEqual(touched, ["docs/specifications/b20/index.mdx"]);
  assert.deepEqual(rejected, []);
  assert.deepEqual(unchanged, []);
});

test("parseSyncLog: syncSummaryRows write with a trailing row count is still touched", () => {
  const log = "[write] docs/specifications/b20/changelog.mdx (2 row(s))";
  assert.deepEqual(parseSyncLog(log).touched, ["docs/specifications/b20/changelog.mdx"]);
});

test("parseSyncLog: create — only the exact-match final write line counts, not the pre-write notice", () => {
  const log = [
    "[create] docs/base-chain/specs/reference/b20/changelog/03-new.mdx — derived page does not exist; writing it from changelog/03_New.md",
    "[create] docs/base-chain/specs/reference/b20/changelog/03-new.mdx",
  ].join("\n");
  assert.deepEqual(parseSyncLog(log).touched, ["docs/base-chain/specs/reference/b20/changelog/03-new.mdx"]);
});

test("parseSyncLog: a nav write for a newly created page's group is touched too", () => {
  const log = [
    '[create] docs/upgrades/denim/new-thing.mdx',
    '[nav] added upgrades/denim/new-thing to "Denim" in docs/docs.json',
  ].join("\n");
  const { touched } = parseSyncLog(log);
  assert.deepEqual(touched.sort(), ["docs/docs.json", "docs/upgrades/denim/new-thing.mdx"]);
});

test("parseSyncLog: reject captures page and reason", () => {
  const log = "[reject] docs/specifications/b20/reference/interfaces.mdx: invalid internal link to /nowhere";
  const { rejected, touched } = parseSyncLog(log);
  assert.deepEqual(rejected, [
    { page: "docs/specifications/b20/reference/interfaces.mdx", reason: "invalid internal link to /nowhere" },
  ]);
  assert.deepEqual(touched, []);
});

test("parseSyncLog: noop and skip both count as unchanged", () => {
  const log = [
    "[noop] docs/a.mdx — content identical and no stale provenance, not touching",
    "[skip] docs/b.mdx — no relevant change for this page role",
    "[skip] docs/c.mdx — file not found, skipping",
  ].join("\n");
  const { unchanged, touched, rejected } = parseSyncLog(log);
  assert.deepEqual(unchanged.sort(), ["docs/a.mdx", "docs/b.mdx", "docs/c.mdx"]);
  assert.deepEqual(touched, []);
  assert.deepEqual(rejected, []);
});

test("parseSyncLog: cleanup lines are not a terminal state — the write that follows still wins", () => {
  const log = [
    "[cleanup] docs/a.mdx — no semantic change but stale sync-source comment on main; rewriting to remove it",
    "[write] docs/a.mdx",
  ].join("\n");
  const { touched, unchanged } = parseSyncLog(log);
  assert.deepEqual(touched, ["docs/a.mdx"]);
  assert.deepEqual(unchanged, []);
});

test("parseSyncLog: touched/rejected win over a contradictory unchanged line for the same page", () => {
  const log = ["[skip] docs/a.mdx — will actually be written below", "[write] docs/a.mdx"].join("\n");
  const { touched, unchanged } = parseSyncLog(log);
  assert.deepEqual(touched, ["docs/a.mdx"]);
  assert.deepEqual(unchanged, []);
});

test("parseSyncLog: empty log yields empty everything", () => {
  assert.deepEqual(parseSyncLog(""), { touched: [], rejected: [], unchanged: [] });
});
