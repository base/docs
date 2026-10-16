import { test } from "node:test";
import assert from "node:assert/strict";
import { changelogLayoutCopy, CHANGELOG_LAYOUT, roleForPage } from "../graders/pageRole.mjs";
import routeTable from "../../sync-from-base-std/route-table.json" with { type: "json" };

test("roleForPage classifies changelog entry and summary pages", () => {
  const { entryDir, summaryPage } = CHANGELOG_LAYOUT;
  assert.ok(entryDir && summaryPage);
  assert.equal(roleForPage(summaryPage), "changelog-index");
  assert.equal(roleForPage(`${entryDir}/03-foo.mdx`), "changelog-entry");
});

test("local changelogLayout copy matches index.mjs (skipped without the sdk)", async (t) => {
  let real;
  try {
    real = await import("../../sync-from-base-std/index.mjs");
  } catch (err) {
    t.skip(`index.mjs not importable here (${err.code || err.message})`);
    return;
  }
  assert.deepEqual(changelogLayoutCopy(routeTable), real.changelogLayout(routeTable));
});
