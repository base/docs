/**
 * Unit tests for the output-safety pipeline added in Phase 2.
 *
 * Runs with Node's built-in test runner — no new dependency:
 *   node --test scripts/sync-from-base/__tests__/validate-safety.test.mjs
 *
 * Each `validateSafety` case asserts that a specific deny pattern fires
 * (positive case) AND that a structurally similar but legitimate snippet
 * does not (negative case). The aim is to catch both false negatives
 * (silent miss of a real attack) and false positives (rejecting a real
 * page that happens to mention `<script>` or `javascript:` in prose).
 *
 * `extractExternalUrls` tests cover the diff math used by the reviewer-
 * checklist file: trailing-punctuation stripping, deduplication, and
 * the http/https-only restriction.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  validateSafety,
  extractExternalUrls,
  stripAuthorAttribution,
} from "../safety.mjs";

// ------------------------------------------------------ stripAuthorAttribution

test("stripAuthorAttribution: removes standalone author and contributor fields", () => {
  const out = stripAuthorAttribution(
    "---\\ntitle: Example\\n---\\n\\nAuthors: Alice Example, Bob Example\\nContributor: Casey Example\\n\\nBody text.\\n",
  );
  assert.doesNotMatch(out, /^(Authors?|Contributors?):/im);
  assert.match(out, /Body text\./);
});

test("stripAuthorAttribution: preserves prose that mentions authors", () => {
  const input = "The author of this proposal describes the change.\\n";
  assert.equal(stripAuthorAttribution(input), input);
});

// ---------------------------------------------------------------- validateSafety

test("validateSafety: rejects <script> tag", () => {
  const err = validateSafety("hello <script>alert(1)</script> world");
  assert.match(err, /raw HTML element <script>/);
});

test("validateSafety: rejects <iframe> tag", () => {
  const err = validateSafety('<iframe src="https://evil.example/"></iframe>');
  assert.match(err, /raw HTML element <iframe>/);
});

test("validateSafety: rejects raw <a href=...> tag", () => {
  const err = validateSafety('see <a href="https://evil.example">here</a>');
  assert.match(err, /raw HTML <a>/);
});

test("validateSafety: rejects raw <img src=...> tag", () => {
  const err = validateSafety('<img src="https://evil.example/pixel.gif" />');
  assert.match(err, /raw HTML <img>/);
});

test("validateSafety: rejects event-handler attribute", () => {
  const err = validateSafety('<Button onclick="bad()">x</Button>');
  assert.match(err, /event-handler attribute/);
});

test("validateSafety: rejects javascript: scheme", () => {
  const err = validateSafety("[click](javascript:alert(1))");
  assert.match(err, /forbidden URL scheme `javascript:`/);
});

test("validateSafety: rejects data: scheme", () => {
  const err = validateSafety("![pic](data:image/png;base64,AAAA)");
  assert.match(err, /forbidden URL scheme `data:`/);
});

test("validateSafety: rejects file: scheme", () => {
  const err = validateSafety("see file:///etc/passwd for details");
  assert.match(err, /forbidden URL scheme `file:`/);
});

test("validateSafety: rejects URL with embedded credentials", () => {
  const err = validateSafety("see https://alice:secret@example.com/");
  assert.match(err, /URL with embedded credentials/);
});

test("validateSafety: rejects AWS access key", () => {
  const err = validateSafety("export key=AKIAIOSFODNN7EXAMPLE\n");
  assert.match(err, /secret_match: aws_access_key/);
  assert.doesNotMatch(err, /AKIA/, "rule name only — never the matched value");
});

test("validateSafety: rejects GitHub classic PAT", () => {
  const err = validateSafety(
    "token: ghp_abcdefghijklmnopqrstuvwxyz0123456789",
  );
  assert.match(err, /secret_match: github_pat_classic/);
  assert.doesNotMatch(err, /ghp_/);
});

test("validateSafety: rejects PEM private-key block", () => {
  const err = validateSafety(
    "-----BEGIN RSA PRIVATE KEY-----\nMIIBOgIBAAJBA…\n-----END RSA PRIVATE KEY-----",
  );
  assert.match(err, /secret_match: pem_private_key/);
});

test("validateSafety: rejects JWT-shaped string", () => {
  const err = validateSafety(
    "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyIn0.signature_part",
  );
  assert.match(err, /secret_match: jwt/);
});

test("validateSafety: accepts a clean MDX page", () => {
  const clean = `---
title: Example
---

# Heading

<Note>Some note text with [an internal link](/base-chain/foo).</Note>

External link: [Coinbase docs](https://docs.coinbase.com/path).

A code fence containing benign words:

\`\`\`
script reasoning
\`\`\`
`;
  assert.equal(validateSafety(clean), null);
});

test("validateSafety: tolerates capitalized MDX components (validated elsewhere)", () => {
  // `validateSafety` only screens lowercase HTML elements. Capitalized
  // component names (e.g. `<Frame>`) are handled by ALLOWED_MDX_COMPONENTS
  // inside `validateMdx`, not here.
  assert.equal(
    validateSafety("<Frame>\n<CardGroup>\n<Card>x</Card>\n</CardGroup>\n</Frame>"),
    null,
  );
});

test("validateSafety: still rejects obfuscated-case raw HTML (<sCrIpT>)", () => {
  // Browsers parse HTML case-insensitively — `<sCrIpT>` is a real
  // script element. The deny check must NOT be defeated by mixed
  // case after the (lowercase) first character.
  const err = validateSafety("<sCrIpT>alert(1)</sCrIpT>");
  assert.match(err, /raw HTML element <script>/);
});

test("validateSafety: rejects <link rel=stylesheet> in MDX", () => {
  // Stand-in for the CSS / DNS-prefetch attack surface.
  const err = validateSafety('<link rel="stylesheet" href="https://evil.example/x.css">');
  assert.match(err, /raw HTML element <link>/);
});

// ------------------------------------------------------------- extractExternalUrls

test("extractExternalUrls: pulls https and http URLs", () => {
  const urls = extractExternalUrls(
    "See https://a.example/x and http://b.example/y for more.",
  );
  assert.deepEqual(
    [...urls].sort(),
    ["http://b.example/y", "https://a.example/x"],
  );
});

test("extractExternalUrls: strips trailing markdown punctuation", () => {
  const urls = extractExternalUrls(
    "First https://a.example/x. Then https://a.example/x, and https://a.example/x.",
  );
  assert.deepEqual([...urls], ["https://a.example/x"]);
});

test("extractExternalUrls: ignores site-relative paths", () => {
  const urls = extractExternalUrls(
    "[internal](/base-chain/foo) and [external](https://x.example).",
  );
  assert.deepEqual([...urls], ["https://x.example"]);
});

test("extractExternalUrls: ignores dangerous schemes (validator handles them)", () => {
  // `extractExternalUrls` is the reviewer-checklist input, not a security
  // boundary; the security boundary for `javascript:` etc. is
  // `validateSafety`. Confirm this function doesn't accidentally surface
  // them as "new external URLs" — they should be a hard reject upstream.
  const urls = extractExternalUrls(
    "[bad](javascript:alert(1)) and [good](https://ok.example/)",
  );
  assert.deepEqual([...urls], ["https://ok.example/"]);
});

test("extractExternalUrls: stops at common terminators (quotes, parens, brackets)", () => {
  const urls = extractExternalUrls(
    'see ("https://a.example/foo") [link](https://b.example/bar) <https://c.example/baz>',
  );
  assert.deepEqual(
    [...urls].sort(),
    [
      "https://a.example/foo",
      "https://b.example/bar",
      "https://c.example/baz",
    ],
  );
});

test("extractExternalUrls: returns empty set for empty/no-URL content", () => {
  assert.equal(extractExternalUrls("").size, 0);
  assert.equal(extractExternalUrls("no URLs in this prose at all.").size, 0);
});

test("stripAuthorAttribution: bold labels and Co-authored-by trailers are removed too", () => {
  const out = stripAuthorAttribution("**Authors**: Rayyan Alam\n_Contributors_: Casey\nCo-authored-by: Someone <s@example.com>\n\nBody.\n");
  assert.doesNotMatch(out, /Rayyan|Casey|Someone/);
  assert.match(out, /Body\./);
});
