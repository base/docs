import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  isCommentOnlyChange,
  newestChangelogFork,
  splitDiffByFile,
  symbolRouteGate,
} from "../release-utils.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name) => JSON.parse(fs.readFileSync(path.join(HERE, "..", "fixtures", name), "utf8"));

test("isCommentOnlyChange: base-std#234 (NatSpec-only) is a clarification", () => {
  const payload = fixture("code-change-3820cf0-isauthorized-natspec.json");
  assert.equal(isCommentOnlyChange(splitDiffByFile(payload.diff)), true);
});

test("isCommentOnlyChange: a code line makes it a real change", () => {
  const diff = [
    "diff --git a/src/I.sol b/src/I.sol",
    "--- a/src/I.sol",
    "+++ b/src/I.sol",
    "@@ -1,2 +1,3 @@",
    "-    /// @notice old",
    "+    /// @notice new",
    "+    function foo() external;",
  ].join("\n");
  assert.equal(isCommentOnlyChange(splitDiffByFile(diff)), false);
});

test("isCommentOnlyChange: block comments count, tests are ignored, non-Solidity is not", () => {
  const sol = [
    "diff --git a/src/I.sol b/src/I.sol",
    "--- a/src/I.sol",
    "+++ b/src/I.sol",
    "@@ -1 +1,3 @@",
    "+/**",
    "+ * text",
    "+ */",
    "diff --git a/test/I.t.sol b/test/I.t.sol",
    "--- a/test/I.t.sol",
    "+++ b/test/I.t.sol",
    "@@ -1 +1 @@",
    "+    assertTrue(x);",
  ].join("\n");
  assert.equal(isCommentOnlyChange(splitDiffByFile(sol)), true);
  const md = ["diff --git a/docs/a.md b/docs/a.md", "--- a/docs/a.md", "+++ b/docs/a.md", "@@ -1 +1 @@", "+// text"].join("\n");
  assert.equal(isCommentOnlyChange(splitDiffByFile(md)), false);
  assert.equal(isCommentOnlyChange(new Map()), false);
});

const ENTRY_DIR = "docs/base-chain/specs/reference/b20/changelog";

test("newestChangelogFork picks the highest-numbered fork", () => {
  const pages = [
    `${ENTRY_DIR}/02-cobalt-policyregistry-composite-policy.mdx`,
    `${ENTRY_DIR}/03-denim-policyregistry-not-policy.mdx`,
    "docs/upgrades/denim/overview.mdx",
  ];
  assert.equal(newestChangelogFork(pages, ENTRY_DIR), "denim");
  assert.equal(newestChangelogFork(pages, ""), "");
});

test("symbolRouteGate: comment-only changes route only reference pages", () => {
  const opts = { commentOnly: true, newestFork: "denim" };
  assert.equal(symbolRouteGate("docs/x/reference/interfaces/i-policy-registry/is-authorized.mdx", { ...opts, role: "function-reference" }), null);
  assert.equal(symbolRouteGate("docs/x/reference/interfaces/i-policy-registry/index.mdx", { ...opts, role: "interface-index" }), null);
  for (const role of ["guide", "shared-reference", "changelog-entry"]) {
    assert.match(symbolRouteGate("docs/build-on-base/a.mdx", { ...opts, role }), /comment-only/);
  }
});

test("symbolRouteGate: historical changelog entries and upgrade pages are not routed", () => {
  const opts = { commentOnly: false, newestFork: "denim" };
  assert.match(
    symbolRouteGate(`${ENTRY_DIR}/02-cobalt-policyregistry-composite-policy.mdx`, { ...opts, role: "changelog-entry" }),
    /earlier hardfork \(cobalt/,
  );
  assert.equal(symbolRouteGate(`${ENTRY_DIR}/03-denim-policyregistry-not-policy.mdx`, { ...opts, role: "changelog-entry" }), null);
  assert.match(symbolRouteGate("docs/upgrades/beryl/b20.mdx", { ...opts, role: "guide" }), /historical upgrade page \(beryl/);
  assert.equal(symbolRouteGate("docs/upgrades/denim/overview.mdx", { ...opts, role: "guide" }), null);
  assert.equal(symbolRouteGate("docs/build-on-base/a.mdx", { ...opts, role: "guide" }), null);
  // No fork data → no fork gating.
  assert.equal(symbolRouteGate("docs/upgrades/beryl/b20.mdx", { role: "guide", newestFork: "" }), null);
});
