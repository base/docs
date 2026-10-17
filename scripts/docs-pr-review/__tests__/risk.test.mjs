// Risk label (review ladder) tests. Run inside a base/docs checkout layout:
//   node --test scripts/docs-pr-review/__tests__/risk.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { classifyRisk, renderRisk } from "../risk.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const governance = JSON.parse(fs.readFileSync(path.join(ROOT, ".github", "ia-governance.json"), "utf8"));

const ADDRESS = "0x4200000000000000000000000000000000000006";
const patch = (added = [], removed = []) =>
  ["@@ -1,1 +1,1 @@", ...removed.map((l) => `-${l}`), ...added.map((l) => `+${l}`)].join("\n");
const file = (filename, { status = "modified", added = ["One new line."], removed = [], previous_filename } = {}) => ({
  filename,
  status,
  additions: added.length,
  deletions: removed.length,
  patch: patch(added, removed),
  ...(previous_filename ? { previous_filename } : {}),
});
const classify = (files, extra = {}) => classifyRisk({ files, governance, firstTimeAuthor: false, nav: null, ...extra });
const rules = (r) => r.reasons.map((x) => `${x.level}:${x.rule}`);

const navConfig = (mutate = (c) => c) =>
  JSON.stringify(
    mutate({
      theme: "mint",
      navbar: { links: [] },
      navigation: {
        tabs: [
          { tab: "Get Started", groups: [{ group: "Intro", pages: ["get-started/base", "get-started/why"] }] },
          { tab: "Build on Base", groups: [{ group: "Payments", pages: ["build-on-base/pay"] }] },
          {
            tab: "Specifications",
            groups: [
              { group: "Protocol", pages: ["specs/a", "specs/b", "specs/c", { group: "Bridging", pages: ["specs/d"] }] },
            ],
          },
        ],
      },
      redirects: [
        { source: "/old1", destination: "/new1" },
        { source: "/old2", destination: "/new2" },
        { source: "/old3", destination: "/new3" },
      ],
    }),
  );
const navFile = file("docs/docs.json");

test("low: a small edit outside the primary tabs", () => {
  const r = classify([file("docs/base-chain/node.mdx", { added: ["Fix a typo."], removed: ["Fix a tpyo."] })]);
  assert.equal(r.level, "low");
  assert.deepEqual(rules(r), ["low:small"]);
});

test("low: non-docs files only", () => {
  const r = classify([file("storybook/Button.stories.mdx".replace(".mdx", ".tsx"))]);
  assert.equal(r.level, "low");
  assert.match(r.reasons[0].text, /non-docs files only/);
});

test("critical: an existing approval gate fires (guideline file, CI config, new Get Started page)", () => {
  assert.equal(classify([file("docs/content-guidelines.md")]).level, "critical");
  assert.equal(classify([file(".github/CODEOWNERS")]).level, "critical");
  assert.equal(classify([file("docs/get-started/new-page.mdx", { status: "added" })]).level, "critical");
});

test("critical: renaming a section in Get Started", () => {
  const nav = { base: navConfig(), head: navConfig((c) => ((c.navigation.tabs[0].groups[0].group = "Welcome"), c)) };
  const r = classify([navFile], { nav });
  assert.equal(r.level, "critical");
  assert.ok(rules(r).includes("critical:section-rename"));
});

test("high: navigation change in Build on Base, site-wide settings, redirects", () => {
  const moved = { base: navConfig(), head: navConfig((c) => (c.navigation.tabs[1].groups[0].pages.push("build-on-base/new"), c)) };
  assert.ok(rules(classify([navFile], { nav: moved })).includes("high:primary-nav"));

  const theme = { base: navConfig(), head: navConfig((c) => ((c.theme = "maple"), c)) };
  const t = classify([navFile], { nav: theme });
  assert.equal(t.level, "high");
  assert.ok(rules(t).includes("high:site-settings"));

  const redirects = { base: navConfig(), head: navConfig((c) => ((c.redirects = []), c)) };
  assert.ok(rules(classify([navFile], { nav: redirects })).includes("high:redirects"));
});

test("high: other tabs — 3 nav items moved, or a group removed", () => {
  const moved = {
    base: navConfig(),
    head: navConfig((c) => {
      c.navigation.tabs[2].groups = [{ group: "Protocol", pages: [{ group: "Bridging", pages: ["specs/d", "specs/a", "specs/b", "specs/c"] }] }];
      return c;
    }),
  };
  assert.ok(rules(classify([navFile], { nav: moved })).includes("high:nav-moves"));

  const groupGone = { base: navConfig(), head: navConfig((c) => ((c.navigation.tabs[2].groups[0].pages = ["specs/a", "specs/b", "specs/c", "specs/d"]), c)) };
  assert.ok(rules(classify([navFile], { nav: groupGone })).includes("high:group-removed"));
});

test("medium: other docs.json changes", () => {
  const small = { base: navConfig(), head: navConfig((c) => (c.navigation.tabs[2].groups[0].pages.push("specs/e"), c)) };
  const r = classify([navFile], { nav: small });
  assert.equal(r.level, "medium");
  assert.ok(rules(r).includes("medium:docs-json"));
});

test("high: added contract address, RPC URL, or key-handling text; the value is never echoed", () => {
  const a = classify([file("docs/base-chain/contracts.mdx", { added: [`WETH: ${ADDRESS}`] })]);
  assert.equal(a.level, "high");
  assert.ok(!JSON.stringify(a).includes(ADDRESS));
  assert.equal(classify([file("docs/base-chain/rpc.mdx", { added: ["Use https://mainnet.base.org"] })]).level, "high");
  assert.equal(classify([file("docs/base-chain/x.mdx", { added: ["Export your private key first."] })]).level, "high");
  // Removing an address is not adding one.
  assert.equal(classify([file("docs/base-chain/x.mdx", { added: ["Removed."], removed: [ADDRESS] })]).level, "low");
});

test("high: legal pages, workflows, package.json, lockfiles", () => {
  for (const f of ["docs/privacy-policy.mdx", ".github/workflows/deploy.yml", "package.json", "scripts/package-lock.json"]) {
    assert.equal(classify([file(f)]).level, "high", f);
  }
});

test("medium: chain-id or fee numbers, code under scripts/ or examples/, pages added or removed", () => {
  assert.equal(classify([file("docs/base-chain/x.mdx", { added: ["Chain ID 8453"] })]).level, "medium");
  assert.equal(classify([file("scripts/lint.mjs")]).level, "medium");
  assert.equal(classify([file("examples/app/index.ts")]).level, "medium");
  assert.equal(classify([file("docs/base-chain/new.mdx", { status: "added" })]).level, "medium");
  assert.equal(
    classify([file("docs/base-chain/new.mdx", { status: "renamed", previous_filename: "docs/base-chain/old.mdx" })]).level,
    "medium",
  );
});

test("medium: small content edit in Get Started or Build on Base; high when it is big", () => {
  assert.equal(classify([file("docs/get-started/why.mdx")]).level, "medium");
  assert.equal(classify([file("docs/build-on-base/pay.mdx")]).level, "medium");
  const eleven = Array.from({ length: 11 }, (_, i) => `Line ${i}.`);
  assert.equal(classify([file("docs/get-started/why.mdx", { added: eleven })]).level, "high");
  assert.equal(classify([file("docs/build-on-base/pay.mdx", { added: eleven })]).level, "medium");
  const twentyOne = Array.from({ length: 21 }, (_, i) => `Line ${i}.`);
  assert.equal(classify([file("docs/build-on-base/pay.mdx", { added: twentyOne })]).level, "high");
});

test("size: more than 20 lines or more than 3 files raises low to medium", () => {
  const many = Array.from({ length: 21 }, (_, i) => `Line ${i}.`);
  assert.equal(classify([file("docs/base-chain/x.mdx", { added: many })]).level, "medium");
  const four = ["a", "b", "c", "d"].map((n) => file(`docs/base-chain/${n}.mdx`));
  assert.equal(classify(four).level, "medium");
  const deleted = Array.from({ length: 20 }, (_, i) => `Old ${i}.`);
  assert.ok(rules(classify([file("docs/base-chain/x.mdx", { added: [], removed: deleted })])).includes("medium:page-deletes"));
});

test("size: 3+ pages removed outside primary tabs, 10+ pages removed, 500+ lines deleted are high", () => {
  const three = ["a", "b", "c"].map((n) => file(`docs/base-chain/${n}.mdx`, { status: "removed", added: [] }));
  assert.ok(rules(classify(three)).includes("high:pages-removed"));
  const big = Array.from({ length: 500 }, (_, i) => `Old ${i}.`);
  assert.ok(rules(classify([file("docs/base-chain/x.mdx", { added: [], removed: big })])).includes("high:lines-deleted"));
});

test("first-time author: medium alone, high with another medium signal", () => {
  assert.equal(classify([file("docs/base-chain/x.mdx")], { firstTimeAuthor: true }).level, "medium");
  assert.equal(classify([file("scripts/lint.mjs")], { firstTimeAuthor: true }).level, "high");
});

test("missing information sends the PR to a person", () => {
  assert.equal(classify([file("docs/base-chain/x.mdx")], { firstTimeAuthor: null }).level, "high");
  assert.equal(classify([file("docs/base-chain/x.mdx")], { changedFiles: 400 }).level, "high");
  const noPatch = { filename: "docs/base-chain/x.mdx", status: "modified", additions: 3, deletions: 0 };
  assert.equal(classify([noPatch]).level, "high");
  assert.equal(classify([navFile], { nav: { base: "{", head: navConfig() } }).level, "high");
  assert.equal(classify([navFile], { nav: { error: "HTTP 500" } }).level, "high");
  assert.equal(classifyRisk({ files: [file("docs/base-chain/x.mdx")], governance: null, firstTimeAuthor: false }).level, "high");
});

test("size only raises: a high signal stays high in a tiny PR", () => {
  const r = classify([file("docs/terms-of-service.mdx", { added: ["x"] })]);
  assert.equal(r.level, "high");
});

test("renderRisk: level line, reasons, and a rule-only machine record", () => {
  const r = classify([file("docs/base-chain/contracts.mdx", { added: [`WETH: ${ADDRESS}`, "Chain ID 8453"] })]);
  const md = renderRisk(r);
  assert.match(md, /\*\*Risk:\*\* High \(one human reviewer/);
  assert.match(md, /shadow mode, not enforced/);
  assert.match(md, /Lower-level signals/);
  assert.match(md, /<!-- docs-pr-review:risk \{"level":"high","rules":\["high:contract-address","medium:chain-id-fee"\]\} -->/);
  assert.ok(!md.includes(ADDRESS));
});

test("planRiskLabels: exactly one risk label, other labels untouched", async () => {
  const { planRiskLabels } = await import("../risk.mjs");
  assert.deepEqual(planRiskLabels([], "high"), { add: "risk: high", remove: [] });
  assert.deepEqual(planRiskLabels(["risk: high", "docs"], "high"), { add: null, remove: [] });
  assert.deepEqual(planRiskLabels(["risk: low", "skip-ai-review", "risk: medium"], "critical"), {
    add: "risk: critical",
    remove: ["risk: low", "risk: medium"],
  });
});

test("reviewModelFor: Luna for low, Sonnet for everything else, variables override", async () => {
  const { reviewModelFor } = await import("../risk.mjs");
  assert.equal(reviewModelFor("low", {}), "gpt-6-luna");
  for (const level of ["medium", "high", "critical"]) assert.equal(reviewModelFor(level, {}), "claude-sonnet-5-5");
  assert.equal(reviewModelFor("low", { DOCS_PR_REVIEW_MODEL_LOW: "gpt-6-sol" }), "gpt-6-sol");
  assert.equal(reviewModelFor("high", { CLAUDE_MODEL: "claude-opus-5-5" }), "claude-opus-5-5");
  // An unset repository variable arrives as an empty string and falls back to the default.
  assert.equal(reviewModelFor("low", { DOCS_PR_REVIEW_MODEL_LOW: "" }), "gpt-6-luna");
});
