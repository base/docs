import test from "node:test";
import assert from "node:assert/strict";
import { routeCodeChange } from "../index.mjs";

test("routeCodeChange expands page_globs only to existing docs pages", async () => {
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
    [
      "docs/base-chain/b20/IB20/transfer.mdx",
      "docs/base-chain/b20/IB20/approve.mdx",
    ],
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
});
