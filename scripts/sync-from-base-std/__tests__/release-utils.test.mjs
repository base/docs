/**
 * Unit tests for the zero-dependency release-discovery helpers.
 *
 * Run with Node's built-in test runner (no extra dependency, no SDK):
 *   node --test scripts/sync-from-base/__tests__/release-utils.test.mjs
 *
 * These functions are the load-bearing pure logic of the release path:
 * chunking a tag-to-tag diff for the manifest pre-pass, merging the per-chunk
 * manifests, the discovery exclude-glob matcher, the bounded worker pool, and
 * the selection-prompt manifest summary. Each test asserts the contract the
 * rest of the system depends on, plus the edge cases that show up in real
 * release data (empty diff, one giant file, duplicate manifest entries).
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  manifestForPage,
  manifestEntrySymbols,
  routingSymbols,
  extractCodeSpans,
  findSymbolMentions,
  mergeSymbolRoutes,
  splitDiffByFile,
  pageRoleFor,
  parseChangelogIndexRows,
  upsertSummaryRow,
  insertNavPage,
  firstHeading,
  mapWithConcurrency,
  chunkDiffBySize,
  mergeManifests,
  globToRegExp,
  summarizeManifest,
  sanitizeManifestRecords,
} from "../release-utils.mjs";

// ------------------------------------------------------------ chunkDiffBySize

const fileDiff = (path, body) =>
  `diff --git a/${path} b/${path}\nindex 000..111 100644\n--- a/${path}\n+++ b/${path}\n${body}\n`;

test("chunkDiffBySize: empty / whitespace input returns []", () => {
  assert.deepEqual(chunkDiffBySize("", 100), []);
  assert.deepEqual(chunkDiffBySize("   \n  ", 100), []);
  assert.deepEqual(chunkDiffBySize(null, 100), []);
});

test("chunkDiffBySize: small diff stays one chunk", () => {
  const diff = fileDiff("a.rs", "+one") + fileDiff("b.rs", "+two");
  const chunks = chunkDiffBySize(diff, 10000);
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0], diff);
});

test("chunkDiffBySize: cuts on file boundaries, never mid-file", () => {
  const a = fileDiff("a.rs", "+aaaa");
  const b = fileDiff("b.rs", "+bbbb");
  const c = fileDiff("c.rs", "+cccc");
  // Cap just above one file so each chunk holds whole files only.
  const chunks = chunkDiffBySize(a + b + c, a.length + 5);
  // Every chunk must start at a file boundary and contain whole files.
  for (const ch of chunks) {
    assert.ok(ch.startsWith("diff --git "), `chunk should start at a file header: ${ch.slice(0, 20)}`);
    assert.equal((ch.match(/^diff --git /gm) || []).length >= 1, true);
  }
  // Reassembling the chunks reproduces the input exactly (no bytes lost/dupes).
  assert.equal(chunks.join(""), a + b + c);
});

test("chunkDiffBySize: a single file larger than the cap becomes its own chunk", () => {
  const big = fileDiff("huge.rs", "+" + "x".repeat(500));
  const small = fileDiff("small.rs", "+y");
  const chunks = chunkDiffBySize(big + small, 100);
  assert.equal(chunks.join(""), big + small);
  // The oversized file is isolated rather than split mid-hunk.
  assert.ok(chunks.some((c) => c.includes("huge.rs") && !c.includes("small.rs")));
});

// ------------------------------------------------------------- mergeManifests

test("mergeManifests: dedupes on file+kind+subject", () => {
  const a = [
    { file: "x.rs", kind: "field_added", subject: "T.a", summary: "first" },
    { file: "x.rs", kind: "field_added", subject: "T.b", summary: "keep" },
  ];
  const b = [
    { file: "x.rs", kind: "field_added", subject: "T.a", summary: "dup-different-summary" },
    { file: "y.rs", kind: "signature_change", subject: "f", summary: "new" },
  ];
  const merged = mergeManifests([a, b]);
  assert.equal(merged.length, 3);
  // First occurrence wins for a duplicate key.
  const ta = merged.find((e) => e.subject === "T.a");
  assert.equal(ta.summary, "first");
});

test("mergeManifests: tolerates non-array members and non-object entries", () => {
  const merged = mergeManifests([
    null,
    "nope",
    [{ file: "a", kind: "k", subject: "s" }, 42, null],
  ]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].subject, "s");
});

test("sanitizeManifestRecords: accepts only bounded, single-line schema records", () => {
  const out = sanitizeManifestRecords([
    { file: "x.rs", kind: "field_added", subject: "T.a", summary: "safe", before: "", after: "u64" },
    { file: "x.rs", kind: "invented", subject: "T.b", summary: "bad kind" },
    { file: "x.rs", kind: "field_added", subject: "T.c\ninstruction", summary: "bad newline" },
  ]);
  assert.deepEqual(out, [
    { file: "x.rs", kind: "field_added", subject: "T.a", summary: "safe", after: "u64" },
  ]);
});

// --------------------------------------------------------------- globToRegExp

test("globToRegExp: * matches within a path segment, not across /", () => {
  const re = globToRegExp("docs/base-chain/*.mdx");
  assert.ok(re.test("docs/base-chain/index.mdx"));
  assert.ok(!re.test("docs/base-chain/sub/index.mdx"));
});

test("globToRegExp: ** matches across segments", () => {
  const re = globToRegExp("docs/base-chain/**/llms.txt");
  assert.ok(re.test("docs/base-chain/llms.txt"));
  assert.ok(re.test("docs/base-chain/a/b/llms.txt"));
  assert.ok(!re.test("docs/other/llms.txt"));
});

test("globToRegExp: regex metacharacters in the literal part are escaped", () => {
  const re = globToRegExp("content/a.b/file.mdx");
  assert.ok(re.test("content/a.b/file.mdx"));
  // The '.' must be literal, not "any char".
  assert.ok(!re.test("content/axb/fileXmdx"));
});

// ----------------------------------------------------------- summarizeManifest

test("summarizeManifest: empty manifest yields empty string", () => {
  assert.equal(summarizeManifest([]), "");
  assert.equal(summarizeManifest(null), "");
});

test("summarizeManifest: caps entries and notes the remainder", () => {
  const manifest = Array.from({ length: 5 }, (_, i) => ({
    kind: "field_added",
    subject: `T.f${i}`,
    file: "x.rs",
  }));
  const out = summarizeManifest(manifest, 2);
  const lines = out.split("\n");
  assert.equal(lines.length, 3); // 2 entries + 1 "and N more"
  assert.match(lines[0], /\[field_added\] T\.f0 \(x\.rs\)/);
  assert.match(lines[2], /and 3 more change\(s\)/);
});

// --------------------------------------------------------- mapWithConcurrency

test("mapWithConcurrency: preserves input order regardless of completion order", async () => {
  const items = [30, 10, 20, 5];
  const results = await mapWithConcurrency(items, 2, async (n) => {
    await new Promise((r) => setTimeout(r, n));
    return n * 2;
  });
  assert.deepEqual(results, [60, 20, 40, 10]);
});

test("mapWithConcurrency: never exceeds the concurrency limit", async () => {
  let inFlight = 0;
  let maxInFlight = 0;
  const items = Array.from({ length: 12 }, (_, i) => i);
  await mapWithConcurrency(items, 3, async () => {
    inFlight++;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise((r) => setTimeout(r, 5));
    inFlight--;
  });
  assert.ok(maxInFlight <= 3, `max in flight was ${maxInFlight}, expected <= 3`);
});

test("mapWithConcurrency: empty input returns []", async () => {
  const results = await mapWithConcurrency([], 4, async () => 1);
  assert.deepEqual(results, []);
});

test("mapWithConcurrency: a rejection propagates", async () => {
  await assert.rejects(
    mapWithConcurrency([1, 2, 3], 2, async (n) => {
      if (n === 2) throw new Error("boom");
      return n;
    }),
    /boom/,
  );
});

// ---------------------------------------------------------- manifestForPage

test("manifestEntrySymbols: qualified subject, its parts, and rename before/after names", () => {
  const syms = manifestEntrySymbols({
    subject: "IB20.seizeWithMemo",
    before: "transferFromBlockedWithMemo(address from, address to)",
    after: "seizeWithMemo(address from, address to)",
  });
  assert.equal(syms[0], "IB20.seizeWithMemo");
  assert.ok(!syms.includes("IB20"), "the qualifier is on every page of the interface — not evidence");
  assert.ok(syms.includes("seizeWithMemo"));
  assert.ok(syms.includes("transferFromBlockedWithMemo"));
  // generic tokens never count as evidence
  assert.ok(!syms.includes("address"));
  assert.ok(!syms.includes("from"));
});

test("manifestForPage: matches by routed source file (existing behaviour)", () => {
  const manifest = [
    { file: "src/interfaces/IB20.sol", kind: "other", subject: "IB20.policyId", summary: "x" },
    { file: "src/lib/B20Constants.sol", kind: "other", subject: "MAX_UI", summary: "y" },
  ];
  const hits = manifestForPage(manifest, { sourceFiles: ["src/interfaces/IB20.sol"] });
  assert.deepEqual(hits.map((h) => h.subject), ["IB20.policyId"]);
});

test("manifestForPage: matches by symbol on the page when the file does not match", () => {
  // Haiku names the Solidity file; the page was routed from a changelog path.
  const manifest = [
    { file: "src/interfaces/IPolicyRegistry.sol", kind: "signature_change", subject: "IPolicyRegistry.createCompositePolicy", summary: "a" },
    { file: "src/interfaces/IPolicyRegistry.sol", kind: "field_added", subject: "MIN_COMPOSITE_CHILD_POLICIES", summary: "b" },
    { file: "src/interfaces/IB20Asset.sol", kind: "field_added", subject: "IB20Asset.updateUIMultiplier", summary: "c" },
  ];
  const page = "Call `createCompositePolicy(admin, UNION, ids)` — see MIN_COMPOSITE_CHILD_POLICIES.";
  const hits = manifestForPage(manifest, {
    sourceFiles: ["changelog/02_Cobalt_PolicyRegistry_composite_policy.md"],
    pageContent: page,
  });
  assert.deepEqual(hits.map((h) => h.subject), [
    "IPolicyRegistry.createCompositePolicy",
    "MIN_COMPOSITE_CHILD_POLICIES",
  ]);
});

test("manifestForPage: symbol match is whole-identifier only", () => {
  const manifest = [
    { file: "src/interfaces/IB20.sol", kind: "other", subject: "IB20.burn", summary: "a" },
  ];
  // "burnBlocked" contains "burn" but is a different identifier.
  assert.deepEqual(
    manifestForPage(manifest, { sourceFiles: ["changelog/x.md"], pageContent: "use `burnBlocked`" }),
    [],
  );
  assert.equal(
    manifestForPage(manifest, { sourceFiles: ["changelog/x.md"], pageContent: "use `burn`" }).length,
    1,
  );
});

test("manifestForPage: rename matches pages still using the old name", () => {
  const manifest = [
    { file: "src/interfaces/IB20.sol", kind: "field_renamed", subject: "IB20.seizeWithMemo", before: "transferFromBlockedWithMemo", after: "seizeWithMemo", summary: "renamed" },
  ];
  const stale = "Quickstart: call `transferFromBlockedWithMemo(from, to, amount)`.";
  assert.equal(manifestForPage(manifest, { sourceFiles: ["docs/guide.md"], pageContent: stale }).length, 1);
});

test("manifestForPage: empty manifest, missing content, or no evidence yields []", () => {
  assert.deepEqual(manifestForPage([], { sourceFiles: ["a"], pageContent: "x" }), []);
  assert.deepEqual(manifestForPage(null, {}), []);
  const manifest = [{ file: "src/a.sol", kind: "other", subject: "Foo.bar", summary: "s" }];
  assert.deepEqual(manifestForPage(manifest, { sourceFiles: ["changelog/x.md"] }), []);
  assert.deepEqual(manifestForPage(manifest, { sourceFiles: ["changelog/x.md"], pageContent: "nothing here" }), []);
});

// ---------------------------------------------------- symbol-mention routing

const MANIFEST = [
  { file: "src/interfaces/IB20.sol", kind: "field_renamed", subject: "IB20.seizeWithMemo", before: "transferFromBlockedWithMemo", after: "seizeWithMemo", summary: "r" },
  { file: "src/interfaces/IB20.sol", kind: "other", subject: "IB20.burn", summary: "short" },
  { file: "src/lib/B20Constants.sol", kind: "field_added", subject: "SEIZE_RECEIVER_POLICY", summary: "c" },
];

test("routingSymbols: bare + qualified subjects and before-names, min length 6", () => {
  const syms = routingSymbols(MANIFEST);
  assert.ok(syms.includes("seizeWithMemo"));
  assert.ok(syms.includes("IB20.seizeWithMemo"));
  assert.ok(syms.includes("transferFromBlockedWithMemo"));
  assert.ok(syms.includes("SEIZE_RECEIVER_POLICY"));
  assert.ok(!syms.includes("burn"), "4-char symbol must not route pages");
  assert.deepEqual(routingSymbols(null), []);
});

test("extractCodeSpans: fenced blocks and inline spans only", () => {
  const md = "Call `seizeWithMemo()` today.\n```solidity\nfunction burnBlocked()\n```\nProse seizeWithMemo here.";
  const code = extractCodeSpans(md);
  assert.ok(code.includes("burnBlocked"));
  assert.equal((code.match(/seizeWithMemo/g) || []).length, 1, "prose mention is not code");
});

test("findSymbolMentions: matches in code spans, not prose; whole identifiers only", () => {
  const pages = [
    { path: "docs/quickstart.mdx", content: "Run `token.transferFromBlockedWithMemo(a, b, 1)`" },
    { path: "docs/prose.mdx", content: "The transferFromBlockedWithMemo flow is described here." },
    { path: "docs/other.mdx", content: "`seizeWithMemoV2()`" },
  ];
  const hits = findSymbolMentions(pages, ["transferFromBlockedWithMemo", "seizeWithMemo"]);
  assert.deepEqual([...hits.entries()], [["docs/quickstart.mdx", ["transferFromBlockedWithMemo"]]]);
});

test("mergeSymbolRoutes: path-routed pages gain reasons; symbol-only pages are appended with source files", () => {
  const work = [{ page: "docs/a.mdx", transformer: "claude", sourceFiles: ["src/interfaces/IB20.sol"], kinds: ["interface"] }];
  const mentions = new Map([
    ["docs/a.mdx", ["seizeWithMemo"]],
    ["docs/quickstart.mdx", ["transferFromBlockedWithMemo", "SEIZE_RECEIVER_POLICY"]],
  ]);
  const merged = mergeSymbolRoutes(work, mentions, MANIFEST);
  assert.equal(merged.length, 2);
  assert.deepEqual(merged[0].reasons, ["path:src/interfaces/IB20.sol", "symbol:seizeWithMemo"]);
  assert.deepEqual(merged[0].kinds, ["interface"]);
  const q = merged[1];
  assert.equal(q.page, "docs/quickstart.mdx");
  assert.deepEqual(q.sourceFiles.sort(), ["src/interfaces/IB20.sol", "src/lib/B20Constants.sol"]);
  assert.deepEqual(q.reasons, ["symbol:transferFromBlockedWithMemo", "symbol:SEIZE_RECEIVER_POLICY"]);
});

test("splitDiffByFile: one section per file, keyed by post-image path", () => {
  const diff = [
    "diff --git a/changelog/README.md b/changelog/README.md",
    "--- a/changelog/README.md", "+++ b/changelog/README.md", "@@ -1 +1 @@", "+| x |",
    "diff --git a/src/interfaces/IB20.sol b/src/interfaces/IB20.sol",
    "@@ -1 +1 @@", "+// natspec",
  ].join("\n");
  const by = splitDiffByFile(diff);
  assert.deepEqual([...by.keys()], ["changelog/README.md", "src/interfaces/IB20.sol"]);
  assert.ok(by.get("src/interfaces/IB20.sol").includes("+// natspec"));
  assert.ok(!by.get("src/interfaces/IB20.sol").includes("+| x |"));
  assert.equal(splitDiffByFile("").size, 0);
});

test("pageRoleFor: classifies by path", () => {
  const layout = {
    entryDir: "docs/base-chain/specs/reference/b20/changelog",
    summaryPage: "docs/specifications/b20/changelog.mdx",
  };
  assert.equal(pageRoleFor("docs/specifications/b20/changelog.mdx", layout), "changelog-index");
  assert.equal(pageRoleFor("docs/base-chain/specs/reference/b20/changelog/02-cobalt-b20-seize.mdx", layout), "changelog-entry");
  assert.equal(pageRoleFor("docs/specifications/b20/reference/interfaces/ib20/seize-with-memo.mdx", layout), "function-reference");
  assert.equal(pageRoleFor("docs/specifications/b20/reference/interfaces/ib20/index.mdx", layout), "interface-index");
  assert.equal(pageRoleFor("docs/specifications/b20/reference/errors-events.mdx", layout), "shared-reference");
  assert.equal(pageRoleFor("docs/specifications/b20/launch-a-b20-token.mdx", layout), "guide");
});

// ------------------------------------------------------ summary rows / nav

const README_DIFF = [
  "diff --git a/changelog/README.md b/changelog/README.md",
  "@@ -20,3 +20,4 @@",
  " | Product(s) | Change | Affected interfaces | Entry |",
  " | --- | --- | --- | --- |",
  "+| B20 Asset | Schedule Multiplier Updates (ERC-8056) | `src/interfaces/IB20Asset.sol` | [02_Cobalt_B20Asset_multiplier](02_Cobalt_B20Asset_multiplier.md) |",
  "+| B20 Stablecoin | Pause v2 | `src/interfaces/IB20.sol` (shared surface) | [03_Denim_B20_pause_v2](03_Denim_B20_pause_v2.md) |",
  "+| --- | --- | --- | --- |",
].join("\n");

test("parseChangelogIndexRows: reads added table rows, skips header/separator", () => {
  const rows = parseChangelogIndexRows(README_DIFF);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], {
    products: "B20 Asset",
    change: "Schedule Multiplier Updates (ERC-8056)",
    interfaces: "`src/interfaces/IB20Asset.sol`",
    entryFile: "changelog/02_Cobalt_B20Asset_multiplier.md",
  });
  assert.equal(rows[1].entryFile, "changelog/03_Denim_B20_pause_v2.md");
});

const SUMMARY = [
  "---", "title: x", "---",
  "## [Cobalt](/upgrades/cobalt/overview) (Upcoming) — Ordinal 02",
  "",
  "| Product(s) | Change | Affected interfaces | Entry |",
  "|---|---|---|---|",
  "| B20 Asset | Old change text | `IB20Asset` | [Multiplier / ERC-8056](/x/02-cobalt-b20asset-multiplier) |",
  "",
  "## [Beryl](/upgrades/beryl/overview) — Initial Release",
  "",
  "| Network | Activated |",
  "|---|---|",
].join("\n");

test("upsertSummaryRow: updates an existing row in place and keeps its link label", () => {
  const r = upsertSummaryRow(SUMMARY, "Cobalt", {
    products: "B20 Asset", change: "Schedule Multiplier Updates (ERC-8056)",
    interfaces: "`src/interfaces/IB20Asset.sol`", route: "/x/02-cobalt-b20asset-multiplier",
  });
  assert.equal(r.action, "updated");
  assert.ok(r.content.includes("| B20 Asset | Schedule Multiplier Updates (ERC-8056) | `IB20Asset` | [Multiplier / ERC-8056](/x/02-cobalt-b20asset-multiplier) |"));
  assert.ok(!r.content.includes("Old change text"));
  // idempotent
  assert.equal(upsertSummaryRow(r.content, "Cobalt", { products: "B20 Asset", change: "Schedule Multiplier Updates (ERC-8056)", interfaces: "`src/interfaces/IB20Asset.sol`", route: "/x/02-cobalt-b20asset-multiplier" }).action, "unchanged");
});

test("upsertSummaryRow: appends a new row at the end of the hardfork table, never touching other sections", () => {
  const r = upsertSummaryRow(SUMMARY, "Cobalt", {
    products: "PolicyRegistry", change: "Composite Policies", interfaces: "`src/interfaces/IPolicyRegistry.sol`", route: "/x/02-cobalt-policyregistry-composite-policy",
  });
  assert.equal(r.action, "added");
  const lines = r.content.split("\n");
  const idx = lines.findIndex((l) => l.includes("02-cobalt-policyregistry-composite-policy"));
  assert.equal(lines[idx - 1].includes("02-cobalt-b20asset-multiplier"), true);
  assert.equal(lines[idx + 1], "");
  assert.ok(r.content.includes("| Network | Activated |"));
  assert.equal(r.content.split("| Network | Activated |").length, 2);
});

test("upsertSummaryRow: a hardfork with no section is left alone", () => {
  const r = upsertSummaryRow(SUMMARY, "Denim", { products: "x", change: "y", interfaces: "z", route: "/r" });
  assert.equal(r.action, "no-section");
  assert.equal(r.content, SUMMARY);
});

test("insertNavPage: appends into the named group once; false when group missing", () => {
  const nav = { tabs: [{ tab: "Upgrades", groups: [{ group: "Cobalt", pages: ["upgrades/cobalt/overview"] }] }] };
  assert.equal(insertNavPage(nav, "Cobalt", "x/new-page"), true);
  assert.equal(insertNavPage(nav, "Cobalt", "x/new-page"), true);
  assert.deepEqual(nav.tabs[0].groups[0].pages, ["upgrades/cobalt/overview", "x/new-page"]);
  assert.equal(insertNavPage(nav, "Denim", "x/other"), false);
});

test("firstHeading: first H1 or empty", () => {
  assert.equal(firstHeading("intro\n# Seize surface + burnBlocked deprecation\n## Summary"), "Seize surface + burnBlocked deprecation");
  assert.equal(firstHeading("no heading"), "");
});

test("manifestForPage: requireSymbolMatch ignores the shared-file rule (one-callable pages)", () => {
  const manifest = [
    { file: "src/interfaces/IB20.sol", kind: "other", subject: "IB20.seizeWithMemo", summary: "a" },
    { file: "src/interfaces/IB20.sol", kind: "other", subject: "IB20.SEIZE_HOLDER_POLICY", summary: "b" },
  ];
  const transferPage = "## Signature\n`function transfer(address to, uint256 amount)`";
  const seizePage = "## Policy Interaction\nChecks `SEIZE_HOLDER_POLICY` before `seizeWithMemo` proceeds.";
  const src = ["src/interfaces/IB20.sol"];
  assert.equal(manifestForPage(manifest, { sourceFiles: src, pageContent: transferPage }).length, 2, "file rule alone attaches everything");
  assert.equal(manifestForPage(manifest, { sourceFiles: src, pageContent: transferPage, requireSymbolMatch: true }).length, 0);
  assert.equal(manifestForPage(manifest, { sourceFiles: src, pageContent: seizePage, requireSymbolMatch: true }).length, 2);
});

test("routingSymbols: before/after contribute only the identifiers that changed", () => {
  const syms = routingSymbols([
    { file: "src/lib/B20Constants.sol", kind: "field_renamed", subject: "B20Constants.SEIZE_EXEMPT_POLICY",
      before: 'keccak256("SEIZE_HOLDER_POLICY")', after: 'keccak256("SEIZE_EXEMPT_POLICY")', summary: "" },
  ]);
  assert.ok(syms.includes("SEIZE_HOLDER_POLICY"), "old name routes stale pages");
  assert.ok(syms.includes("SEIZE_EXEMPT_POLICY"));
  assert.ok(!syms.includes("keccak256"), "shared context is not a routing symbol");
});

test("manifestEntrySymbols: subject prose and () are ignored; only the identifier path counts", () => {
  const syms = manifestEntrySymbols({ subject: "IB20.AccountNotSeizable error documentation" });
  assert.deepEqual(syms, ["IB20.AccountNotSeizable", "AccountNotSeizable"]);
  const syms2 = manifestEntrySymbols({ subject: "IB20.SEIZE_HOLDER_POLICY()" });
  assert.deepEqual(syms2, ["IB20.SEIZE_HOLDER_POLICY", "SEIZE_HOLDER_POLICY"]);
});

test("routingSymbols: prose words in before/after never route; mock/test entries are ignored", () => {
  const syms = routingSymbols([
    { file: "src/lib/B20Constants.sol", kind: "field_renamed", subject: "B20Constants.SEIZE_HOLDER_POLICY",
      before: "internal constant SEIZE_HOLDER_POLICY documented against the member", after: "internal constant SEIZE_EXEMPT_POLICY", summary: "" },
    { file: "test/lib/mocks/MockB20.sol", kind: "other", subject: "MockB20.policyId() implementation", before: "TRANSFER_SENDER_POLICY", summary: "" },
  ]);
  assert.ok(syms.includes("SEIZE_HOLDER_POLICY"));
  assert.ok(syms.includes("SEIZE_EXEMPT_POLICY"));
  for (const junk of ["internal", "constant", "documented", "against", "member", "policyId", "TRANSFER_SENDER_POLICY"]) {
    assert.ok(!syms.includes(junk), `${junk} must not be a routing symbol`);
  }
});

// ------------------------------------------------------------- decideCall

import { decideCall, pageTitle, MAX_REGENERABLE_CHARS } from "../release-utils.mjs";

const fn = (title, body = "") => `---\ntitle: "${title}"\n---\n${body}`;

test("decideCall: function page is called only when its own symbol changed", () => {
  const page = fn("IB20.seizeWithMemo", "## Signature\n`function seizeWithMemo(...)`");
  assert.equal(decideCall({ role: "function-reference", content: page, diffSlice: "+ /// seizeWithMemo reverts when", symbols: [] }), null);
  assert.equal(decideCall({ role: "function-reference", content: page, diffSlice: "", symbols: ["seizeWithMemo"] }), null);
  assert.match(decideCall({ role: "function-reference", content: page, diffSlice: "+ // transfer changed", symbols: ["transfer"] }), /own symbol seizeWithMemo/);
});

test("decideCall: interface index is called on inventory changes or a symbol on the page", () => {
  const page = fn("IB20 Reference", "| [`SEIZE_HOLDER_POLICY`](/x) | `0xb2` |");
  assert.equal(decideCall({ role: "interface-index", content: page, manifest: [{ kind: "field_renamed", subject: "IB20.SEIZE_EXEMPT_POLICY" }], symbols: [] }), null);
  assert.equal(decideCall({ role: "interface-index", content: page, manifest: [{ kind: "other", subject: "IB20.seizeWithMemo" }], symbols: ["SEIZE_HOLDER_POLICY"] }), null);
  assert.match(decideCall({ role: "interface-index", content: page, manifest: [{ kind: "other", subject: "IB20.seizeWithMemo" }], symbols: ["seizeWithMemo"] }), /no member of IB20/);
  assert.match(decideCall({ role: "interface-index", content: page, manifest: [{ kind: "field_added", subject: "IPolicyRegistry.foo" }], symbols: [] }), /no member of IB20/);
});

test("decideCall: shared reference and guides need a changed symbol in a code span; no symbols means call", () => {
  const page = fn("Errors", "| error | `AccountNotSeizable` |");
  assert.equal(decideCall({ role: "shared-reference", content: page, symbols: ["AccountNotSeizable"] }), null);
  assert.match(decideCall({ role: "guide", content: page, symbols: ["seizeWithMemo"] }), /no changed symbol/);
  assert.equal(decideCall({ role: "guide", content: page, symbols: [] }), null, "no manifest → cannot judge → call");
  assert.match(decideCall({ role: "guide", content: fn("G", "prose mentions AccountNotSeizable"), symbols: ["AccountNotSeizable"] }), /no changed symbol/, "prose is not a code span");
});

test("decideCall: pages over the regenerable budget are skipped before the call; changelog roles always run", () => {
  const big = fn("IB20 Reference", "x".repeat(MAX_REGENERABLE_CHARS + 1));
  assert.match(decideCall({ role: "interface-index", content: big, manifest: [{ kind: "field_added", subject: "IB20.x" }] }), /exceeds/);
  assert.equal(decideCall({ role: "changelog-entry", content: fn("E", "short") }), null);
  assert.equal(decideCall({ role: "changelog-index", content: big }), null, "summary never goes to the model");
  assert.equal(pageTitle(fn("IB20.transfer")), "IB20.transfer");
});

import { changedLines } from "../release-utils.mjs";

test("changedLines: keeps +/- lines only, drops headers and context", () => {
  const diff = "diff --git a/x b/x\n--- a/x\n+++ b/x\n@@ -1,3 +1,3 @@\n context allowance()\n-old seizeWithMemo\n+new seizeWithMemo\n";
  const out = changedLines(diff);
  assert.equal(out, "-old seizeWithMemo\n+new seizeWithMemo");
  assert.ok(!out.includes("allowance"));
});
