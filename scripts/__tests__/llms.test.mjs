// Unit tests for the llms-full.txt body cleanup in scripts/llms.js.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { cleanMdxBody, splitFences } = require("../llms.js");

const docsUrl = "https://docs.base.org";
const snippets = {
  "/snippets/Disclaimer.mdx": "---\ntitle: x\n---\n<Note>\nSee [B20](/specifications/b20).\n</Note>\n",
  "/snippets/Outer.mdx": 'import Inner from "/snippets/Inner.mdx"\n\nOuter <Inner />\n',
  "/snippets/Inner.mdx": "inner text\n",
  "/snippets/Loop.mdx": 'import Loop from "/snippets/Loop.mdx"\n\n<Loop />\n',
};
const clean = (body) =>
  cleanMdxBody(body, {
    docsUrl,
    loadSnippet: (p) => {
      if (!(p in snippets)) throw new Error(`missing ${p}`);
      return snippets[p];
    },
  });

test("leaves fenced code untouched", () => {
  const body = [
    'import { Demo } from "/snippets/Demo.jsx"',
    "",
    "```ts",
    "import { base } from 'viem/chains'",
    "{/* not an MDX comment here */}",
    "[link](/relative)",
    "<Demo />",
    "```",
    "",
    "~~~",
    "import x from 'y'",
    "~~~",
  ].join("\n");
  const out = clean(body);
  assert.match(out, /import \{ base \} from 'viem\/chains'/);
  assert.match(out, /\{\/\* not an MDX comment here \*\/\}/);
  assert.match(out, /\[link\]\(\/relative\)/);
  assert.match(out, /<Demo \/>\n```/);
  assert.match(out, /import x from 'y'/);
  assert.doesNotMatch(out, /snippets\/Demo\.jsx/);
});

test("splitFences keeps an unterminated fence as code", () => {
  const segs = splitFences("text\n```\nimport a from 'b'");
  assert.deepEqual(segs.map((s) => s.code), [false, true]);
});

test("inlines .mdx snippets, recursively, with frontmatter stripped", () => {
  const out = clean(
    'import Disclaimer from "/snippets/Disclaimer.mdx"\nimport Outer from "/snippets/Outer.mdx"\n\n<Disclaimer />\n\n<Outer />',
  );
  assert.match(out, /<Note>\nSee \[B20\]\(https:\/\/docs\.base\.org\/specifications\/b20\)\.\n<\/Note>/);
  assert.match(out, /Outer inner text/);
  assert.doesNotMatch(out, /title: x|import /);
});

test("rejects snippet import cycles", () => {
  assert.throws(() => clean('import Loop from "/snippets/Loop.mdx"\n\n<Loop />'), /cycle/);
});

test("drops .jsx demo components, including multi-line props", () => {
  const out = clean(
    'import { PaymentsDemo } from "/snippets/PaymentsDemo.jsx"\n\nBefore\n\n<PaymentsDemo flow="capture" />\n\n<PaymentsDemo\n  flow="partial"\n  amount={5}\n/>\n\nAfter',
  );
  assert.equal(out, "Before\n\nAfter");
});

test("removes MDX comments, including multi-line ones", () => {
  const out = clean("A {/* inline */} B\n\n{/* TODO:\n  multi-line\n*/}\n\nC");
  assert.equal(out, "A  B\n\nC");
});

test("absolutizes root-relative links but not protocol-relative or external ones", () => {
  const out = clean(
    '[a](/get-started/base) [b](https://x.com/y) [c](//cdn.example.com) <Card href="/get-started/base" /> <img src="/images/a.png" />',
  );
  assert.match(out, /\[a\]\(https:\/\/docs\.base\.org\/get-started\/base\)/);
  assert.match(out, /\[b\]\(https:\/\/x\.com\/y\)/);
  assert.match(out, /\[c\]\(\/\/cdn\.example\.com\)/);
  assert.match(out, /href="https:\/\/docs\.base\.org\/get-started\/base"/);
  assert.match(out, /src="https:\/\/docs\.base\.org\/images\/a\.png"/);
});
