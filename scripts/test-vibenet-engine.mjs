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
const paymentsSnippet = await readFile(new URL("docs/snippets/PaymentsDemo.jsx", root), "utf8");
const loaderOf = (source) => {
  const start = source.indexOf("  const loadVibenetEngine = () => {");
  assert.notEqual(start, -1, "snippet defines loadVibenetEngine");
  return source.slice(start, source.indexOf("\n  };\n", start) + "\n  };\n".length);
};
const loader = loaderOf(snippet);
for (const [name, source] of [["Asset", assetSnippet], ["Payments", paymentsSnippet]]) {
  assert.equal(loaderOf(source), loader, `${name} snippet loader is identical to StablecoinDemo's`);
}
for (const [name, source] of [["Stablecoin", snippet], ["Asset", assetSnippet], ["Payments", paymentsSnippet]]) {
  assert.doesNotMatch(source, /^\s*import\s/m, `${name} Mintlify snippet must not contain imports`);
}
assert.match(loader, /fetchText\("\/static\/aa\.txt"\)/, "AA artifact is fetched lazily by the snippet loader");
assert.match(loader, /fetchText\("\/static\/vibenet-engine\.txt\?v=6"\)/, "versioned shared engine is fetched by the snippet loader");
// docs.base.org serves `script-src 'self' 'unsafe-inline' 'unsafe-eval' https:`
// with no blob:, so Blob module URLs fail with "Failed to evaluate the Vibenet engine".
assert.doesNotMatch(loader, /createObjectURL|new Blob|type = "module"/, "loader must not evaluate the engine from blob: URLs");

{
  // Run the real loader against the real artifacts with a minimal window shim.
  const files = { "/static/aa.txt": aa.toString("utf8"), "/static/vibenet-engine.txt?v=6": engineSource };
  const shim = {};
  const fetchShim = async (path) => ({ ok: path in files, status: path in files ? 200 : 404, text: async () => files[path] });
  const saved = { window: globalThis.window, fetch: globalThis.fetch, CustomEvent: globalThis.CustomEvent };
  globalThis.window = Object.assign(shim, { dispatchEvent() {}, localStorage: undefined });
  globalThis.fetch = fetchShim;
  globalThis.CustomEvent ??= class extends Event {};
  try {
    const load = new Function(`${loader}\nreturn loadVibenetEngine;`)();
    const api = await load();
    assert.equal(api.ENGINE_VERSION, 6, "linked engine publishes its API on window");
    assert.equal(api.CHAIN_ID, 84538453);
    assert.equal(typeof api.sendCalls, "function");
    assert.equal(await load(), api, "second load reuses the published engine");
  } finally {
    Object.assign(globalThis, saved);
  }
}

const tempAa = "/tmp/base-docs-aa-test.mjs";
const tempEngine = "/tmp/base-docs-vibenet-engine-test.mjs";
await writeFile(tempAa, aa);
await writeFile(
  tempEngine,
  engineSource.replace('"./aa.txt"', JSON.stringify(pathToFileURL(tempAa).href)),
);
const engine = await import(`${pathToFileURL(tempEngine).href}?v=${Date.now()}`);

assert.equal(engine.CHAIN_ID, 84538453);
assert.equal(engine.ENGINE_VERSION, 6);
assert.equal(engine.ASSET_FEATURE, "0xcdcc772fe4cbdb1029f822861176d09e646db96723d4c1e82ddfdeb8163ef54c");
assert.equal(engine.units(1), 1_000_000n);
assert.equal(engine.displayUnits(25_500_000n), 25.5);
assert.equal(engine.memoToBytes32("invoice-8842").length, 66);
assert.equal(engine.bytes32ToMemo(engine.memoToBytes32("invoice-8842")), "invoice-8842");
assert.equal(engine.decodeRevert({ data: "0x4b344b11" }).name, "SupplyCapExceeded");
assert.equal(engine.decodeRevert({ data: "0xa43fec12" }).name, "PolicyForbids");
assert.equal(engine.decodeRevert({ data: "0xfd8c4245" }).name, "ContractPaused");
assert.equal(engine.decodeRevert({ data: "0x91dbbc8d" }).name, "AccountNotSeizable");
assert.equal(typeof engine.seize, "function");
assert.equal(typeof engine.createAsset, "function");
assert.equal(typeof engine.configureAssetControls, "function");
assert.equal(typeof engine.announceDistribution, "function");
assert.equal(typeof engine.updateUIMultiplier, "function");
assert.equal(typeof engine.balanceOfUI, "function");
assert.equal(typeof engine.waitForTimestamp, "function");
assert.equal(engine.updateMultiplier, undefined, "demos use the Cobalt scheduled setter, not the deprecated instant one");
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

// The account implementation fallback is load-bearing: Vibenet's
// /api/vibenet/contracts has omitted its `eip8130` block after past resets, and
// then the vendored bundle's canonical devnet set is the only source of a
// DefaultAccount address. Guard the shape here — if a re-pin drops or renames this export, the
// demos silently lose their only fallback.
const aaModule = await import(pathToFileURL(tempAa).href);
assert.equal(
  typeof aaModule.vibenetDevnetDeployment?.accounts?.default,
  "string",
  "vendored bundle must export vibenetDevnetDeployment.accounts.default",
);
assert.match(
  aaModule.vibenetDevnetDeployment.accounts.default,
  /^0x[0-9a-fA-F]{40}$/,
  "fallback DefaultAccount must be an address",
);
assert.match(
  engineSource,
  /vibenetDevnetDeployment\?\.accounts\?\.default/,
  "engine falls back to the bundled canonical deployment",
);
assert.match(
  engineSource,
  /account: Boolean\(implementation\)/,
  "probeCapabilities reports account-implementation liveness so demos degrade instead of throwing",
);

assert.match(
  engineSource,
  /hash = await rpc\("eth_sendRawTransaction", \[serialized\]\);\n\s*\} catch \(error\) \{\n\s*throw Object\.assign\(error, \{ submitted: true \}\);/,
  "a lost eth_sendRawTransaction response is reported as possibly submitted",
);
assert.match(
  engineSource,
  /waitForTransactionReceipt\(client, \{ hash, timeout: 60_000 \}\);\n\s*\} catch \(error\) \{\n\s*throw Object\.assign\(error, \{ submitted: true, hash \}\);/,
  "a receipt wait failure keeps the submitted transaction hash",
);

{
  // After a final receipt, a failed deployment check must keep the hash and receipt.
  const tail = engineSource.slice(engineSource.indexOf("receipt = await waitForTransactionReceipt(client"));
  const deploy = tail.slice(tail.indexOf("if (!deployed) {"), tail.indexOf("return { hash, receipt, faucetHash"));
  assert.ok(tail.indexOf("if (!deployed) {") > tail.indexOf('receipt.status === "0x0"'), "deployment is checked only after the receipt is final");
  assert.match(deploy, /try \{\n\s*await waitUntilDeployed\(account\.address\);\n\s*\} catch \(error\) \{/, "waitUntilDeployed failures are caught");
  assert.match(deploy, /\{ cause: error, hash, receipt, deploymentUnverified: true \}/, "a deployment check failure preserves the known hash and receipt");
  assert.doesNotMatch(deploy, /submitted: true/, "a confirmed transaction is not reported as merely submitted");
  const waiter = engineSource.slice(engineSource.indexOf("async function waitUntilDeployed"), engineSource.indexOf("export async function sendCalls"));
  assert.match(waiter, /throw new Error\(`account \$\{address\} still has no code`\)/, "an account that never gets code fails verification");
}
{
  const funding = engineSource.slice(engineSource.indexOf("async function ensureFunded"), engineSource.indexOf("async function highestNonce"));
  assert.equal(funding.match(/faucet\/drip/g)?.length, 2, "faucet drip is retried once");
  assert.match(funding, /setTimeout\(resolve, 11_000\)/, "retry waits out the 10s faucet cooldown");
}

console.log("Vibenet engine and Mintlify loader checks passed.");
