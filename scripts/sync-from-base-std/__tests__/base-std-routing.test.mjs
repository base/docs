import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildProvenanceComment,
  loadDocumentationGuidelines,
  routeCodeChange,
} from "../index.mjs";

const require = createRequire(import.meta.url);
const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
);
const B20_REFERENCE_ROOT = "docs/specifications/b20";
const B20_MANUAL_UPDATE_PAGES = [
  "docs/specifications/b20/specification-overview.mdx",
  "docs/build-on-base/issue-rwa/create-an-asset-token.mdx",
  "docs/build-on-base/accept-payments/request-a-payment.mdx",
];

async function listMdxFiles(root) {
  const out = [];
  async function walk(dir) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(abs);
      else if (entry.isFile() && entry.name.endsWith(".mdx")) {
        out.push(path.relative(REPO_ROOT, abs));
      }
    }
  }
  await walk(root);
  return out.sort();
}

test("routeCodeChange expands page_globs only to existing docs pages", async () => {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "base-std-routing-"));
  const docsRoot = path.join(repoRoot, "docs", "base-chain", "b20", "IB20");
  await fs.mkdir(docsRoot, { recursive: true });
  await fs.writeFile(path.join(docsRoot, "transfer.mdx"), "---\ntitle: transfer\n---\n");
  await fs.writeFile(path.join(docsRoot, "approve.mdx"), "---\ntitle: approve\n---\n");
  try {
    const work = await routeCodeChange(
      {
        code_changes: [
          {
            source_prefix: "src/interfaces/IB20.sol",
            pages: ["docs/base-chain/b20/index.mdx"],
            page_globs: ["docs/base-chain/b20/IB20/**/*.mdx"],
            transformer: "claude",
          },
        ],
      },
      ["src/interfaces/IB20.sol"],
      { repoRoot },
    );
    assert.deepEqual(
      work.map((item) => item.page).sort(),
      [
        "docs/base-chain/b20/IB20/approve.mdx",
        "docs/base-chain/b20/IB20/transfer.mdx",
        "docs/base-chain/b20/index.mdx",
      ],
    );
    assert.deepEqual(work[0].sourceFiles, ["src/interfaces/IB20.sol"]);
  } finally {
    await fs.rm(repoRoot, { recursive: true, force: true });
  }
});

test("route table maps each source file to its own interface subtree, never the whole tree", async () => {
  const routeTable = JSON.parse(
    await fs.readFile(
      path.join(REPO_ROOT, "scripts/sync-from-base-std/route-table.json"),
      "utf8",
    ),
  );
  const allB20Pages = await listMdxFiles(path.join(REPO_ROOT, B20_REFERENCE_ROOT));

  for (const rule of routeTable.code_changes) {
    for (const glob of rule.page_globs || []) {
      assert.notEqual(
        glob,
        `${B20_REFERENCE_ROOT}/**/*.mdx`,
        `rule ${rule.source_prefix} fans out to the whole B20 reference tree`,
      );
    }
    for (const page of rule.pages || []) {
      assert.ok(
        existsSync(path.join(REPO_ROOT, page)),
        `rule ${rule.source_prefix} names a page that does not exist: ${page}`,
      );
    }
  }
  assert.deepEqual(routeTable.manual_update.allowed_pages, B20_MANUAL_UPDATE_PAGES);
  assert.doesNotMatch(
    JSON.stringify(routeTable),
    /specs\/upgrades\/beryl\/b20\/specification|specs\/upgrades\/beryl\/b20\/demos/,
  );

  // An interface change routes to that interface's page + subtree (plus a few
  // shared pages), not to every other interface's subtree.
  const assetWork = await routeCodeChange(
    routeTable,
    ["src/interfaces/IB20Asset.sol"],
    { repoRoot: REPO_ROOT },
  );
  const assetRouted = assetWork.map((item) => item.page);
  const assetSubtree = allB20Pages.filter((p) =>
    p.startsWith(`${B20_REFERENCE_ROOT}/reference/interfaces/ib20-asset/`),
  );
  for (const page of assetSubtree) assert.ok(assetRouted.includes(page), `missing ${page}`);
  assert.ok(assetRouted.includes(`${B20_REFERENCE_ROOT}/reference/interfaces/ib20-asset/index.mdx`));
  assert.ok(
    !assetRouted.some((p) => p.includes("/interfaces/i-policy-registry")),
    "IB20Asset change must not route into the i-policy-registry subtree",
  );
  assert.ok(assetRouted.length < allB20Pages.length / 2);

  // A changelog change routes to the B20 changelog page only, not the
  // reference tree. This is the fan-out that previously produced 120 pages.
  const changelogWork = await routeCodeChange(
    routeTable,
    ["changelog/02_Cobalt_B20_seize.md"],
    { repoRoot: REPO_ROOT },
  );
  assert.ok(
    !changelogWork.some((item) => item.page === `${B20_REFERENCE_ROOT}/changelog.mdx`),
    "entry edit must not route to the summary page",
  );
  assert.ok(
    !changelogWork.some((item) => item.page.includes("/reference/interfaces/")),
    "entry edit must not route into interface subtrees",
  );
});

test("route rules carry a kind, and changelog index vs entry are routed differently", async () => {
  const routeTable = JSON.parse(
    await fs.readFile(
      path.join(REPO_ROOT, "scripts/sync-from-base-std/route-table.json"),
      "utf8",
    ),
  );
  const KINDS = new Set(["interface", "product-doc", "changelog-entry", "changelog-index"]);
  for (const rule of routeTable.code_changes) {
    assert.ok(KINDS.has(rule.kind), `rule ${rule.source_prefix} has kind '${rule.kind}'`);
  }
  const summary = `${B20_REFERENCE_ROOT}/changelog.mdx`;

  // The index (README.md / CHANGELOG.md) is the only thing that reaches the summary page.
  for (const src of ["changelog/README.md", "CHANGELOG.md"]) {
    const work = await routeCodeChange(routeTable, [src], { repoRoot: REPO_ROOT });
    assert.deepEqual(work.map((w) => [w.page, w.kinds]), [[summary, ["changelog-index"]]], src);
  }
  // A per-feature entry is classified as changelog-entry and never touches the summary.
  const entry = await routeCodeChange(
    routeTable,
    ["changelog/02_Cobalt_B20_seize.md"],
    { repoRoot: REPO_ROOT },
  );
  assert.ok(!entry.some((w) => w.page === summary), "entry edit must not route to the summary");
  assert.deepEqual(
    entry.map((w) => [w.page, w.kinds]),
    [["docs/base-chain/specs/reference/b20/changelog/02-cobalt-b20-seize.mdx", ["changelog-entry"]]],
  );
  // Derivation follows the naming convention in content-guidelines.md.
  const multiplier = await routeCodeChange(
    routeTable,
    ["changelog/02_Cobalt_B20Asset_multiplier.md", "changelog/02_Cobalt_PolicyRegistry_composite_policy.md"],
    { repoRoot: REPO_ROOT },
  );
  assert.deepEqual(multiplier.map((w) => w.page).sort(), [
    "docs/base-chain/specs/reference/b20/changelog/02-cobalt-b20asset-multiplier.mdx",
    "docs/base-chain/specs/reference/b20/changelog/02-cobalt-policyregistry-composite-policy.mdx",
  ]);
  // A future hardfork/feature derives a path even before the page exists
  // (processPage skips missing pages until creation lands).
  const future = await routeCodeChange(routeTable, ["changelog/03_Denim_B20_pause_v2.md"], { repoRoot: REPO_ROOT });
  assert.deepEqual(future.map((w) => w.page), ["docs/base-chain/specs/reference/b20/changelog/03-denim-b20-pause-v2.mdx"]);
  // Authoring helpers in the same directory route nowhere.
  for (const src of ["changelog/AGENTS.md", "changelog/TEMPLATE_POINT_FORM.md"]) {
    assert.deepEqual(await routeCodeChange(routeTable, [src], { repoRoot: REPO_ROOT }), [], src);
  }
  // Interface sources are classified as interface.
  const iface = await routeCodeChange(routeTable, ["src/interfaces/IB20.sol"], { repoRoot: REPO_ROOT });
  assert.ok(iface.length > 0);
  for (const w of iface) assert.deepEqual(w.kinds, ["interface"]);
  // A mixed PR keeps both kinds on a page routed by both.
  const mixed = await routeCodeChange(
    routeTable,
    ["src/interfaces/IB20.sol", "changelog/README.md"],
    { repoRoot: REPO_ROOT },
  );
  const overview = mixed.find((w) => w.page === `${B20_REFERENCE_ROOT}/specification-overview.mdx`);
  assert.deepEqual(overview.kinds, ["interface"]);
  assert.deepEqual(mixed.find((w) => w.page === summary).kinds, ["changelog-index"]);
});

test("every route-table page exists and is listed in docs.json navigation", async () => {
  const routeTable = JSON.parse(
    await fs.readFile(
      path.join(REPO_ROOT, "scripts/sync-from-base-std/route-table.json"),
      "utf8",
    ),
  );
  const { loadNavigation, collectNavigationPages } = require("../../lib/docs-utils.js");
  const navSet = new Set(collectNavigationPages(loadNavigation(path.join(REPO_ROOT, "docs"))));
  const routeOf = (page) =>
    page.replace(/^docs\//, "").replace(/\.mdx?$/, "").replace(/\/index$/, "");

  const sources = uniqueSourcePrefixes(routeTable);
  const work = await routeCodeChange(routeTable, sources, { repoRoot: REPO_ROOT });
  const routed = [
    ...work.map((item) => item.page),
    ...routeTable.manual_update.allowed_pages,
  ];
  assert.ok(routed.length > 0);
  // Interface member pages are deliberately kept out of the sidebar and
  // linked from their interface landing page, so they count as reachable
  // when that landing page is in the nav.
  const reachable = (page) => {
    const route = routeOf(page);
    if (navSet.has(route)) return true;
    const parent = route.split("/").slice(0, -1).join("/");
    return /\/reference\/interfaces\/[^/]+$/.test(parent) && navSet.has(parent);
  };
  for (const page of routed) {
    assert.ok(existsSync(path.join(REPO_ROOT, page)), `missing on disk: ${page}`);
    assert.ok(reachable(page), `not reachable from docs.json navigation: ${page}`);
  }
  // Every glob must expand to at least one page, or a docs move has silently
  // disconnected a source file from its reference pages.
  for (const rule of routeTable.code_changes) {
    if (!rule.page_globs?.length) continue;
    const ruleWork = await routeCodeChange(routeTable, [rule.source_prefix], { repoRoot: REPO_ROOT });
    assert.ok(
      ruleWork.length > (rule.pages || []).length,
      `page_globs for ${rule.source_prefix} expand to no pages`,
    );
  }
});

function uniqueSourcePrefixes(routeTable) {
  return [...new Set(routeTable.code_changes.map((rule) => rule.source_prefix))];
}

test("loadDocumentationGuidelines reads the canonical content and IA guidelines", async () => {
  const contentGuidelines = (
    await fs.readFile(path.join(REPO_ROOT, "docs/content-guidelines.md"), "utf8")
  ).trim();
  const iaGuidelines = (
    await fs.readFile(path.join(REPO_ROOT, "docs/ia-guidelines.md"), "utf8")
  ).trim();
  const loaded = await loadDocumentationGuidelines({ repoRoot: REPO_ROOT });

  assert.ok(contentGuidelines.length > 0);
  assert.ok(iaGuidelines.length > 0);
  assert.match(loaded, /Source: docs\/content-guidelines\.md/);
  assert.match(loaded, /Source: docs\/ia-guidelines\.md/);
  assert.ok(loaded.includes(contentGuidelines));
  assert.ok(loaded.includes(iaGuidelines));
});

test("buildProvenanceComment cannot inject a second HTML comment boundary", () => {
  const comment = buildProvenanceComment("manual-update", {
    intent: "Update docs --> <script>alert(1)</script> --!>",
    source_refs: ["https://example.test/<!--> --!>"],
  });
  const body = comment.split("\n").slice(1, -1).join("\n");

  assert.match(comment, /^<!--\n/);
  assert.match(comment, /\n-->$/);
  assert.doesNotMatch(body, /[<>]/);
});
