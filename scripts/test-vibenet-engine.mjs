import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const root = new URL("../", import.meta.url);
const aaPath = new URL("docs/static/aa.txt", root);
const enginePath = new URL("docs/static/vibenet-engine.txt", root);
const snippetPath = new URL("docs/snippets/StablecoinDemo.jsx", root);
const assetSnippetPath = new URL("docs/snippets/AssetDemo.jsx", root);
const metaPath = new URL("docs/static/aa.meta.json", root);

const [aa, engineSource, snippet, assetSnippet, metaSource] = await Promise.all([
  readFile(aaPath),
  readFile(enginePath, "utf8"),
  readFile(snippetPath, "utf8"),
  readFile(assetSnippetPath, "utf8"),
  readFile(metaPath, "utf8"),
]);
const meta = JSON.parse(metaSource);
const artifactHash = createHash("sha256").update(aa).digest("hex");
assert.equal(artifactHash, meta.artifact_sha256, "aa.txt must match aa.meta.json");

assert.match(engineSource, /from "\.\/aa\.txt"/, "engine keeps the loader-rewritten relative AA specifier");
assert.match(snippet, /replace\('\"\.\/aa\.txt\"'/, "snippet rewrites the AA specifier before Blob evaluation");
assert.doesNotMatch(snippet, /^\s*import\s/m, "Mintlify snippet must not contain imports");
assert.match(snippet, /fetchText\("\/static\/aa\.txt"\)/, "AA artifact is fetched lazily by the snippet loader");
assert.match(snippet, /fetchText\("\/static\/vibenet-engine\.txt\?v=2"\)/, "versioned shared engine is fetched by the snippet loader");
assert.match(assetSnippet, /replace\('\"\.\/aa\.txt\"'/, "Asset snippet rewrites the AA specifier before Blob evaluation");
assert.doesNotMatch(assetSnippet, /^\s*import\s/m, "Asset Mintlify snippet must not contain imports");
assert.match(assetSnippet, /fetchText\("\/static\/aa\.txt"\)/, "Asset snippet lazy-loads the AA artifact");
assert.match(assetSnippet, /fetchText\("\/static\/vibenet-engine\.txt\?v=2"\)/, "Asset snippet uses the versioned shared engine");

const tempAa = "/tmp/base-docs-aa-test.mjs";
const tempEngine = "/tmp/base-docs-vibenet-engine-test.mjs";
await writeFile(tempAa, aa);
await writeFile(
  tempEngine,
  engineSource.replace('"./aa.txt"', JSON.stringify(pathToFileURL(tempAa).href)),
);
const engine = await import(`${pathToFileURL(tempEngine).href}?v=${Date.now()}`);

assert.equal(engine.CHAIN_ID, 84538453);
assert.equal(engine.ENGINE_VERSION, 2);
assert.equal(engine.ASSET_FEATURE, "0xcdcc772fe4cbdb1029f822861176d09e646db96723d4c1e82ddfdeb8163ef54c");
assert.equal(engine.units(1), 1_000_000n);
assert.equal(engine.displayUnits(25_500_000n), 25.5);
assert.equal(engine.memoToBytes32("invoice-8842").length, 66);
assert.equal(engine.bytes32ToMemo(engine.memoToBytes32("invoice-8842")), "invoice-8842");
assert.equal(engine.decodeRevert({ data: "0x4b344b11" }).name, "SupplyCapExceeded");
assert.equal(engine.decodeRevert({ data: "0xa43fec12" }).name, "PolicyForbids");
assert.equal(engine.decodeRevert({ data: "0xfd8c4245" }).name, "ContractPaused");
assert.equal(typeof engine.createAsset, "function");
assert.equal(typeof engine.configureAssetControls, "function");
assert.equal(typeof engine.announceDistribution, "function");
assert.equal(typeof engine.updateMultiplier, "function");
assert.equal(typeof engine.assetDetails, "function");
const memoTopic = engine.memoToBytes32("invoice-8842");
const decodedMemo = engine.readMemoFromReceipt({
  logs: [{
    topics: [
      "0x6989f5818dcfd11f8cd53b27c94cec33dae1589735f03e639cba54553a1825e8",
      `0x${"0".repeat(64)}`,
      memoTopic,
    ],
    logIndex: "0x2",
  }],
});
assert.equal(decodedMemo.text, "invoice-8842");
assert.equal(decodedMemo.logIndex, 2);

console.log("Vibenet engine and Mintlify loader checks passed.");
