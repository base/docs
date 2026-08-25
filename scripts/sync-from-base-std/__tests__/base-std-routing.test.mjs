import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { routeCodeChange } from "../index.mjs";

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
