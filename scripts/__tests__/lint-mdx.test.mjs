import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const lint = require("../lint-mdx.js");

const {
  RULES,
  titleCaseViolations,
  collectCodeBlocks,
  checkCodeBlocks,
  checkAccessibility,
  checkHeadingStructure,
  checkTitleCase,
  checkNavTitles,
  isLintablePage,
} = lint;

const rulesOf = (issues) => issues.map((i) => i.rule);

// ---------------------------------------------------------------------------
// Rule registry
// ---------------------------------------------------------------------------

test("every rule has a severity, and severities are one of two values", () => {
  for (const [rule, severity] of Object.entries(RULES)) {
    assert.ok(["error", "warning"].includes(severity), `${rule} has severity "${severity}"`);
  }
});

test("the six spec-required rules are all errors", () => {
  for (const rule of [
    "title-case/page-title",
    "title-case/nav-title",
    "frontmatter/title",
    "frontmatter/description",
    "heading/starts-at-h2",
    "a11y/link-text",
    "a11y/alt-text",
    "codeblock/filename-or-title",
    "codeblock/long-block-meta",
  ]) {
    assert.equal(RULES[rule], "error", `${rule} must be blocking`);
  }
});

test("wrap and highlight stay advisory", () => {
  // content-guidelines.md phrases both conditionally, so they are recommendations.
  assert.equal(RULES["codeblock/wrap"], "warning");
  assert.equal(RULES["codeblock/highlight"], "warning");
});

// ---------------------------------------------------------------------------
// Title case
// ---------------------------------------------------------------------------

test("title case flags lowercase words that should be capitalized", () => {
  assert.deepEqual(titleCaseViolations("200ms native blocks"), ["native", "blocks"]);
  assert.deepEqual(titleCaseViolations("Integrate an Earn Product"), []);
  assert.deepEqual(titleCaseViolations("Send a Transaction"), []);
});

test("small words stay lowercase mid-title but not at the edges", () => {
  assert.deepEqual(titleCaseViolations("Get Funds on Base"), []);
  assert.deepEqual(titleCaseViolations("The Path to Production"), []);
  // A small word at the start or end must still be capitalized.
  assert.deepEqual(titleCaseViolations("the Path to Production"), ["the"]);
  assert.deepEqual(titleCaseViolations("What Is This For"), []);
});

test("camelCase identifiers are never flagged", () => {
  // Regression: reference pages titled after the symbol they document produced 29 of the
  // 30 original title-case hits before this exemption existed.
  for (const title of [
    "getPaymentStatus",
    "dataSuffix",
    "newFlashblockTransactions",
    "createBaseAccountSDK",
    "B20: Seize Surface and burnBlocked Deprecation",
  ]) {
    assert.deepEqual(titleCaseViolations(title), [], title);
  }
});

test("identifiers with digits or separators are not judged", () => {
  for (const title of ["ERC-20 Tokens", "eth_call Reference", "v2 Migration", "200ms Native Blocks"]) {
    assert.deepEqual(titleCaseViolations(title), [], title);
  }
});

test("exception-list brand terms are allowed to stay lowercase", () => {
  assert.deepEqual(titleCaseViolations("Build with onchain Data"), []);
  assert.deepEqual(titleCaseViolations("Pay with x402"), []);
  assert.deepEqual(titleCaseViolations("Deploy with thirdweb"), []);
});

test("inline code in a title is not judged as prose", () => {
  assert.deepEqual(titleCaseViolations("Use `npm install` to Begin"), []);
});

test("checkTitleCase reads the frontmatter title and ignores its absence", () => {
  assert.deepEqual(rulesOf(checkTitleCase('---\ntitle: "200ms native blocks"\n---\n')), [
    "title-case/page-title",
  ]);
  assert.deepEqual(checkTitleCase('---\ntitle: "Send a Transaction"\n---\n'), []);
  // A missing title is frontmatter/title's job, not this rule's.
  assert.deepEqual(checkTitleCase("---\ndescription: x\n---\n"), []);
});

// ---------------------------------------------------------------------------
// Code blocks
// ---------------------------------------------------------------------------

test("a fence needs a filename or title after the language", () => {
  assert.deepEqual(rulesOf(checkCodeBlocks("```typescript\nconst a = 1;\n```\n")), [
    "codeblock/filename-or-title",
  ]);
  assert.deepEqual(checkCodeBlocks("```typescript App.tsx\nconst a = 1;\n```\n"), []);
});

test("attribute tokens alone do not satisfy the filename-or-title rule", () => {
  // `lines wrap expandable` are attributes, not a title.
  assert.deepEqual(rulesOf(checkCodeBlocks("```typescript lines wrap expandable\nconst a = 1;\n```\n")), [
    "codeblock/filename-or-title",
  ]);
  assert.deepEqual(
    rulesOf(checkCodeBlocks("```typescript highlight={1-2}\nconst a = 1;\n```\n")),
    ["codeblock/filename-or-title"]
  );
});

test("a missing language is reported once, without also demanding a title", () => {
  assert.deepEqual(rulesOf(checkCodeBlocks("```\ncode\n```\n")), ["codeblock/language"]);
});

test("blocks over seven lines require lines and expandable", () => {
  const long = "```typescript App.tsx\n" + "const a = 1;\n".repeat(8) + "```\n";
  const issues = checkCodeBlocks(long);
  assert.ok(rulesOf(issues).includes("codeblock/long-block-meta"));
  assert.match(issues.find((i) => i.rule === "codeblock/long-block-meta").message, /8 lines/);

  const conformant = "```typescript App.tsx lines wrap expandable\n" + "const a = 1;\n".repeat(8) + "```\n";
  const remaining = checkCodeBlocks(conformant).filter((i) => i.severity === "error");
  assert.deepEqual(remaining, []);
});

test("a seven-line block is not treated as long", () => {
  const seven = "```typescript App.tsx\n" + "const a = 1;\n".repeat(7) + "```\n";
  assert.deepEqual(
    checkCodeBlocks(seven).filter((i) => i.severity === "error"),
    []
  );
});

test("partial long-block metadata reports only what is missing", () => {
  const src = "```typescript App.tsx lines\n" + "const a = 1;\n".repeat(8) + "```\n";
  const issue = checkCodeBlocks(src).find((i) => i.rule === "codeblock/long-block-meta");
  assert.match(issue.message, /`expandable`/);
  assert.doesNotMatch(issue.message, /`lines` and/);
});

test("a CodeGroup child reports the label rule rather than filename-or-title", () => {
  const src = "<CodeGroup>\n\n```typescript\nconst a = 1;\n```\n\n</CodeGroup>\n";
  assert.deepEqual(rulesOf(checkCodeBlocks(src)), ["codeblock/codegroup-label"]);
});

test("a longer outer fence can wrap a shorter inner one", () => {
  // Pages that document fenced syntax nest fences; the inner one is content, not a block.
  const src = "````markdown Example\n```js\nconst a = 1;\n```\n````\n";
  const blocks = collectCodeBlocks(src);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].lang, "markdown");
});

test("fence metadata is parsed off the opening line only", () => {
  const blocks = collectCodeBlocks("```bash Terminal lines wrap expandable\nls\n```\n");
  assert.equal(blocks[0].lang, "bash");
  assert.deepEqual(blocks[0].tokens, ["Terminal", "lines", "wrap", "expandable"]);
  assert.equal(blocks[0].bodyLines, 1);
});

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

test("images need non-placeholder alt text", () => {
  assert.deepEqual(rulesOf(checkAccessibility("![](/img/a.png)\n")), ["a11y/alt-text"]);
  assert.deepEqual(rulesOf(checkAccessibility("![screenshot](/img/a.png)\n")), ["a11y/alt-text"]);
  assert.deepEqual(rulesOf(checkAccessibility('<img src="/a.png" />\n')), ["a11y/alt-text"]);
  assert.deepEqual(rulesOf(checkAccessibility('<img src="/a.png" alt="" />\n')), ["a11y/alt-text"]);
  assert.deepEqual(checkAccessibility("![Base network architecture](/img/a.png)\n"), []);
  assert.deepEqual(checkAccessibility('<img src="/a.png" alt="Wallet connect dialog" />\n'), []);
});

test("link text must say where it goes", () => {
  assert.deepEqual(rulesOf(checkAccessibility("See [here](/a).\n")), ["a11y/link-text"]);
  assert.deepEqual(rulesOf(checkAccessibility("See [click here](/a).\n")), ["a11y/link-text"]);
  assert.deepEqual(checkAccessibility("See the [Base quickstart](/a).\n"), []);
});

test("an image is not also reported as a non-descriptive link", () => {
  // The link-text rule must not see images. "here" is poor link text but perfectly
  // adequate alt text, so this line is clean.
  assert.deepEqual(checkAccessibility("![here](/img/a.png)\n"), []);
  // A placeholder alt is still caught, and still only as an alt-text issue.
  assert.deepEqual(rulesOf(checkAccessibility("![image](/img/a.png)\n")), ["a11y/alt-text"]);
});

test("code fences are skipped so example markup is not linted as content", () => {
  assert.deepEqual(checkAccessibility("```md Example\n![](/img/a.png)\nSee [here](/a).\n```\n"), []);
});

// ---------------------------------------------------------------------------
// Headings
// ---------------------------------------------------------------------------

test("an H1 in body content is an error", () => {
  assert.ok(rulesOf(checkHeadingStructure("# Overview\n")).includes("heading/no-h1"));
});

test("the first body heading must be H2", () => {
  assert.ok(rulesOf(checkHeadingStructure("#### Demo\n")).includes("heading/starts-at-h2"));
  assert.ok(rulesOf(checkHeadingStructure("### Details\n")).includes("heading/starts-at-h2"));
  assert.deepEqual(
    rulesOf(checkHeadingStructure("## Overview\n\n### Details\n")),
    []
  );
});

test("skipped levels remain a warning, not a blocker", () => {
  const issues = checkHeadingStructure("## A\n\n#### B\n");
  assert.deepEqual(rulesOf(issues), ["heading/skipped-level"]);
  assert.equal(issues[0].severity, "warning");
});

test("headings inside code fences are ignored", () => {
  assert.deepEqual(rulesOf(checkHeadingStructure("## Real\n\n```md Example\n# Not a heading\n```\n")), []);
});

// ---------------------------------------------------------------------------
// Scope
// ---------------------------------------------------------------------------

test("snippets and ignored pages are not linted as pages", () => {
  assert.equal(isLintablePage("docs/get-started/base.mdx"), true);
  assert.equal(isLintablePage("docs/snippets/BrowseCard.mdx"), false);
  assert.equal(isLintablePage("docs/tone_of_voice.mdx"), false, "listed in docs/.mintignore");
  assert.equal(isLintablePage("docs/docs.json"), false);
  assert.equal(isLintablePage("scripts/lint-mdx.js"), false);
});

// ---------------------------------------------------------------------------
// Navigation titles
// ---------------------------------------------------------------------------

test("the shipped navigation tree passes the nav title-case rule", () => {
  assert.deepEqual(checkNavTitles(), []);
});
