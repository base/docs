import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildProvenanceComment,
  loadKnownRoutes,
  loadStyleGuide,
  renderProvenanceSection,
  routeCodeChange,
  validateMdx,
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

test("loadStyleGuide reads the root content instructions", async () => {
  const expected = (
    await fs.readFile(path.join(REPO_ROOT, "content-instructions.md"), "utf8")
  ).trim();

  assert.ok(expected.length > 0);
  assert.equal(await loadStyleGuide({ repoRoot: REPO_ROOT }), expected);
});

test("internal-link validation accepts index aliases and configured redirects", async () => {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "base-std-routes-"));
  const docsRoot = path.join(repoRoot, "docs");
  const b20Root = path.join(docsRoot, "base-chain", "specs", "reference", "b20");
  await fs.mkdir(b20Root, { recursive: true });
  await fs.writeFile(path.join(b20Root, "index.mdx"), "---\ntitle: B20\n---\n");
  await fs.writeFile(
    path.join(docsRoot, "docs.json"),
    JSON.stringify({
      redirects: [
        { source: "/legacy-b20" },
        { source: "/legacy-reference/:slug*" },
      ],
    }),
  );

  try {
    const routes = await loadKnownRoutes({ repoRoot });
    assert.ok(routes.exact.has("/base-chain/specs/reference/b20"));
    assert.ok(routes.exact.has("/base-chain/specs/reference/b20/index"));

    const current = "---\ntitle: Example\n---\n\nExisting copy.\n";
    const withValidLinks = `${current}\n[B20](/base-chain/specs/reference/b20#factory)\n[literal](/legacy-b20)\n[old](/legacy-reference/interfaces/IB20)\n`;
    assert.equal(
      validateMdx(withValidLinks, "docs/example.mdx", routes, current),
      null,
    );
  } finally {
    await fs.rm(repoRoot, { recursive: true, force: true });
  }
});

test("internal-link validation ignores retained legacy links but rejects new broken links", async () => {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "base-std-link-delta-"));
  const docsRoot = path.join(repoRoot, "docs");
  await fs.mkdir(docsRoot, { recursive: true });
  await fs.writeFile(path.join(docsRoot, "index.mdx"), "---\ntitle: Home\n---\n");

  try {
    const routes = await loadKnownRoutes({ repoRoot });
    const current = "---\ntitle: Example\n---\n\n[Legacy](/retired-page)\n";
    const retainedLegacyLink = `${current}\nUpdated copy.\n`;
    assert.equal(
      validateMdx(retainedLegacyLink, "docs/example.mdx", routes, current),
      null,
    );

    const newBrokenLink = `${retainedLegacyLink}\n[Broken](/missing-page)\n`;
    assert.match(
      validateMdx(newBrokenLink, "docs/example.mdx", routes, current),
      /broken new internal link\(s\): `\/missing-page`/,
    );
  } finally {
    await fs.rm(repoRoot, { recursive: true, force: true });
  }
});

test("renderProvenanceSection combines touched docs pages and source files", () => {
  const section = renderProvenanceSection(
    "code-change",
    { source_repo: "base/base-std", sha: "abcdef0123456789" },
    [
      {
        page: "docs/base-chain/specs/reference/b20/index.mdx",
        sourceFiles: ["changelog/02_policy.md"],
      },
    ],
  );

  assert.match(section, /^\n## Files touched & source provenance\n/m);
  assert.match(section, /\| Docs page \| Source file\(s\) in base \|/);
  assert.match(section, /`docs\/base-chain\/specs\/reference\/b20\/index\.mdx`/);
  assert.match(section, /https:\/\/github\.com\/base\/base-std\/blob\/abcdef0123456789\/changelog\/02_policy\.md/);
  assert.doesNotMatch(section, /^## Files touched$/m);

  const releaseSection = renderProvenanceSection(
    "release",
    { source_repo: "base/base-std", tag: "v1.2.3" },
    [{ page: "docs/base-chain/specs/reference/b20/index.mdx" }],
  );
  assert.match(releaseSection, /\| Docs page \| Source provenance \|/);
  assert.match(releaseSection, /releases\/tag\/v1\.2\.3/);

  const manualSection = renderProvenanceSection(
    "manual-update",
    { source_refs: ["https://example.test/source"] },
    [{ page: "docs/base-chain/specs/reference/b20/index.mdx" }],
  );
  assert.match(manualSection, /https:\/\/example\.test\/source/);
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
