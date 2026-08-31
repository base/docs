import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildProvenanceComment,
  loadDocumentationGuidelines,
  routeCodeChange,
} from "../index.mjs";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
);
const B20_REFERENCE_GLOB = "docs/base-chain/specs/reference/b20/**/*.mdx";
const B20_STANDALONE_PAGES = [
  "docs/base-chain/network-information/b20-token-standard.mdx",
  "docs/apps/guides/accept-b20-payments.mdx",
  "docs/get-started/launch-b20-token.mdx",
];
const B20_MANUAL_UPDATE_PAGES = [
  "docs/base-chain/specs/reference/b20/index.mdx",
  ...B20_STANDALONE_PAGES,
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

test("B20 source changes route to the complete current B20 documentation set", async () => {
  const routeTable = JSON.parse(
    await fs.readFile(
      path.join(REPO_ROOT, "scripts/sync-from-base-std/route-table.json"),
      "utf8",
    ),
  );
  const expected = [
    ...(await listMdxFiles(
      path.join(REPO_ROOT, "docs/base-chain/specs/reference/b20"),
    )),
    ...B20_STANDALONE_PAGES,
  ].sort();

  for (const rule of routeTable.code_changes) {
    assert.deepEqual(rule.pages, B20_STANDALONE_PAGES);
    assert.deepEqual(rule.page_globs, [B20_REFERENCE_GLOB]);
  }
  assert.deepEqual(routeTable.manual_update.allowed_pages, B20_MANUAL_UPDATE_PAGES);

  const work = await routeCodeChange(
    routeTable,
    ["src/interfaces/IB20Asset.sol"],
    { repoRoot: REPO_ROOT },
  );
  const routed = work.map((item) => item.page).sort();

  assert.deepEqual(routed, expected);
  assert.doesNotMatch(
    JSON.stringify(routeTable),
    /specs\/upgrades\/beryl\/b20\/specification|specs\/upgrades\/cobalt\/eip-8130|specs\/upgrades\/beryl\/b20\/demos/,
  );
});

test("loadDocumentationGuidelines reads the canonical content and IA guidelines", async () => {
  const contentGuidelines = (
    await fs.readFile(path.join(REPO_ROOT, "content-guidelines.md"), "utf8")
  ).trim();
  const iaGuidelines = (
    await fs.readFile(path.join(REPO_ROOT, "docs/ia-guidelines.md"), "utf8")
  ).trim();
  const loaded = await loadDocumentationGuidelines({ repoRoot: REPO_ROOT });

  assert.ok(contentGuidelines.length > 0);
  assert.ok(iaGuidelines.length > 0);
  assert.match(loaded, /Source: content-guidelines\.md/);
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
