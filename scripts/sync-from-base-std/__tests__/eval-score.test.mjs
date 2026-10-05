import test from "node:test";
import assert from "node:assert/strict";
import { addedLinesByFile, parseNumstat, scoreRun } from "../eval/run-eval.mjs";

const EXPECT = {
  must_touch: ["docs/ref/is-authorized.mdx"],
  may_touch: { "docs/guide/seize.mdx": 3 },
  must_not_touch: ["docs/guide/hold.mdx"],
  unlisted_pages: "fail",
  restatement: { owners: ["docs/ref/is-authorized.mdx"], keywords: ["malformed", "empty set", "inverted"], min_keywords: 2 },
};

test("parseNumstat and addedLinesByFile read git output", () => {
  assert.deepEqual(parseNumstat("3\t1\tdocs/a.mdx\n-\t-\tdocs/b.png\n"), {
    "docs/a.mdx": { added: 3, removed: 1 },
    "docs/b.png": { added: 0, removed: 0 },
  });
  const diff = "diff --git a/docs/a.mdx b/docs/a.mdx\n--- a/docs/a.mdx\n+++ b/docs/a.mdx\n@@ -1 +1,2 @@\n line\n+new\n";
  assert.deepEqual(addedLinesByFile(diff), { "docs/a.mdx": ["new"] });
});

test("scoreRun passes a run that edits only what it should", () => {
  const r = scoreRun(EXPECT, { "docs/ref/is-authorized.mdx": { added: 20, removed: 5 }, "docs/guide/seize.mdx": { added: 1, removed: 0 } });
  assert.equal(r.pass, true, r.violations.join("; "));
});

test("scoreRun flags missing, forbidden, oversized, unlisted, and restated edits", () => {
  const r = scoreRun(
    EXPECT,
    {
      "docs/guide/hold.mdx": { added: 2, removed: 0 },
      "docs/guide/seize.mdx": { added: 9, removed: 0 },
      "docs/other.mdx": { added: 1, removed: 0 },
    },
    { "docs/guide/seize.mdx": ["A malformed ID returns false; an unknown ID is an empty set."] },
  );
  assert.equal(r.pass, false);
  const text = r.violations.join("\n");
  assert.match(text, /missing required edit: docs\/ref\/is-authorized\.mdx/);
  assert.match(text, /should leave alone: docs\/guide\/hold\.mdx/);
  assert.match(text, /edit too large: docs\/guide\/seize\.mdx adds 9 lines \(budget 3\)/);
  assert.match(text, /unlisted page: docs\/other\.mdx/);
  assert.match(text, /restates the full rules outside their owner pages: docs\/guide\/seize\.mdx/);
});
