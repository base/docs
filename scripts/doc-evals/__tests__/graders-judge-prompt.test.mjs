import { test } from "node:test";
import assert from "node:assert/strict";

import { CLAIMS, JUDGE_SYSTEM_PROMPT, buildJudgePrompt } from "../graders/judge.mjs";

test("CLAIMS: exactly the six fixed claim ids from PLAN.md, in order", () => {
  assert.deepEqual(CLAIMS.map((c) => c.id), ["J1", "J2", "J3", "J4", "J5", "J6"]);
});

test("JUDGE_SYSTEM_PROMPT: names every tag the prompt uses as untrusted input", () => {
  for (const tag of ["source_diff", "page_before", "page_after", "review_findings"]) {
    assert.match(JUDGE_SYSTEM_PROMPT, new RegExp(`<${tag}>`));
  }
});

test("buildJudgePrompt: wraps every input in its own tag and lists all six claims", () => {
  const prompt = buildJudgePrompt({
    page: "docs/a.mdx",
    pageRole: "function-reference",
    sourceDiff: "+ some diff",
    beforePage: "before content",
    afterPage: "after content",
    reviewFindings: [{ type: "scope", text: "reviewer said X" }],
  });
  assert.match(prompt, /<source_diff>\n\+ some diff\n<\/source_diff>/);
  assert.match(prompt, /<page_before>\nbefore content\n<\/page_before>/);
  assert.match(prompt, /<page_after>\nafter content\n<\/page_after>/);
  assert.match(prompt, /reviewer said X/);
  assert.match(prompt, /docs\/a\.mdx/);
  assert.match(prompt, /function-reference/);
  for (const c of CLAIMS) assert.match(prompt, new RegExp(c.id));
});

test("buildJudgePrompt: missing before-page and empty findings render as placeholders, not blank tags", () => {
  const prompt = buildJudgePrompt({ page: "docs/a.mdx", pageRole: "guide", afterPage: "new page" });
  assert.match(prompt, /page did not exist before/);
  assert.match(prompt, /\(none\)/);
});
