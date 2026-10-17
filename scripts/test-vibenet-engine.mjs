import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import { keccak256 } from "./lib/keccak256.mjs";

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
assert.match(loader, /fetchText\("\/static\/vibenet-engine\.txt\?v=7"\)/, "versioned shared engine is fetched by the snippet loader");
// docs.base.org serves `script-src 'self' 'unsafe-inline' 'unsafe-eval' https:`
// with no blob:, so Blob module URLs fail with "Failed to evaluate the Vibenet engine".
assert.doesNotMatch(loader, /createObjectURL|new Blob|type = "module"/, "loader must not evaluate the engine from blob: URLs");

{
  // Run the real loader against the real artifacts with a minimal window shim.
  const files = { "/static/aa.txt": aa.toString("utf8"), "/static/vibenet-engine.txt?v=7": engineSource };
  const shim = {};
  const fetchShim = async (path) => ({ ok: path in files, status: path in files ? 200 : 404, text: async () => files[path] });
  const saved = { window: globalThis.window, fetch: globalThis.fetch, CustomEvent: globalThis.CustomEvent };
  globalThis.window = Object.assign(shim, { dispatchEvent() {}, localStorage: undefined });
  globalThis.fetch = fetchShim;
  globalThis.CustomEvent ??= class extends Event {};
  try {
    const load = new Function(`${loader}\nreturn loadVibenetEngine;`)();
    const api = await load();
    assert.equal(api.ENGINE_VERSION, 7, "linked engine publishes its API on window");
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
assert.equal(engine.ENGINE_VERSION, 7);
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

// Every name the engine imports must exist in the pinned bundle. The 2026-10-02
// Keystore-free reset re-pinned aa.txt without newSmartAccount, keccak256, and
// friends; an engine importing a dropped name evaluates to undefined and every
// live demo falls back to mock.
const aaModule = await import(pathToFileURL(tempAa).href);
const engineImports = engineSource.match(/^import \{([\s\S]*?)\} from "\.\/aa\.txt";/m)?.[1]
  .split(",").map((name) => name.trim()).filter(Boolean);
assert.ok(engineImports?.length, "engine has a single import block from ./aa.txt");
for (const name of engineImports) {
  assert.notEqual(aaModule[name], undefined, `vendored bundle must export ${name} (imported by vibenet-engine.txt)`);
}
for (const name of ["toEoaAccount", "k1Authenticator", "estimateGas", "getTransactionReceipt", "allPhasesSucceeded"]) {
  assert.ok(engineImports.includes(name), `engine uses the Keystore-free EIP-8130 surface (${name})`);
}
for (const name of ["newSmartAccount", "encodeWalletCalls", "vibenetDevnetDeployment", "canonicalAuthenticators", "keccak256"]) {
  assert.doesNotMatch(engineSource, new RegExp(`\\b${name}\\(|^\\s+${name},$`, "m"), `engine no longer uses ${name}`);
}

// Precomputed keccak256 constants (the bundle no longer exports keccak256).
for (const [label, name] of [
  ...["MINT_ROLE", "BURN_ROLE", "BURN_BLOCKED_ROLE", "SEIZE_ROLE", "PAUSE_ROLE", "UNPAUSE_ROLE", "METADATA_ROLE", "OPERATOR_ROLE"].map((n) => ["role", n]),
  ...["TRANSFER_SENDER_POLICY", "TRANSFER_RECEIVER_POLICY", "TRANSFER_EXECUTOR_POLICY", "MINT_RECEIVER_POLICY", "SEIZE_EXEMPT_POLICY", "SEIZE_RECEIVER_POLICY"].map((n) => ["scope", n]),
]) {
  assert.match(engineSource, new RegExp(`  ${name}: "${keccak256(name)}"`), `${label} ${name} is keccak256("${name}")`);
}
assert.match(engineSource, new RegExp(`PolicyCreated: "${keccak256("PolicyCreated(uint64,address,uint8)")}"`), "PolicyCreated topic");
assert.match(engineSource, new RegExp(`Memo: "${keccak256("Memo(address,bytes32)")}"`), "Memo topic");

{
  // The live account path: with no network, the shared account must be the
  // signer's own EOA (no CREATE2 smart account) and must sign a K1-authenticated
  // EIP-8130 transaction with raw call phases.
  const genesis = `0x${"ab".repeat(32)}`;
  const savedFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    const { id, method } = JSON.parse(options.body);
    assert.equal(method, "eth_getBlockByNumber", "getSharedAccount only reads the genesis block");
    return { ok: true, status: 200, json: async () => ({ jsonrpc: "2.0", id, result: { hash: genesis } }) };
  };
  try {
    const shared = await engine.getSharedAccount();
    assert.equal(shared.genesisHash, genesis);
    assert.equal(shared.implementation, undefined, "no account implementation is resolved");
    assert.equal(shared.account.address, shared.signer.address, "sender is the secp256k1 EOA itself");
    assert.match(shared.account.address, /^0x[0-9a-fA-F]{40}$/);
    assert.equal(shared.account.source, "eip8130");
    assert.equal(typeof shared.account.signTransaction, "function");
    assert.equal((await engine.getSharedAccount()).account.address, shared.account.address, "account is stable within a genesis");
    const serialized = await shared.account.signTransaction({
      chainId: engine.CHAIN_ID,
      from: shared.account.address,
      calls: [[{ to: engine.B20_FACTORY, value: 0n, data: "0x" }]],
      nonceKey: 0n,
      nonceSequence: 0n,
      maxFeePerGas: 1_000_000_000n,
      maxPriorityFeePerGas: 1_000_000n,
      gas: 200_000n,
    });
    assert.match(serialized, /^0x[0-9a-f]+$/i, "EOA signs an EIP-8130 transaction");
    assert.ok(serialized.toLowerCase().includes(aaModule.k1Authenticator.slice(2).toLowerCase()), "sender auth carries the K1 authenticator");
  } finally {
    globalThis.fetch = savedFetch;
  }
}
assert.match(engineSource, /ACCOUNT_STORAGE_KEY = "base\.docs\.vibenet\.account\.v2"/, "storage key is bumped past v1 smart-account records");
assert.match(engineSource, /LEGACY_ACCOUNT_STORAGE_KEYS = \["base\.docs\.vibenet\.account\.v1"\]/, "stale v1 records are dropped");
for (const [name, source] of [["Stablecoin", snippet], ["Asset", assetSnippet], ["Payments", paymentsSnippet]]) {
  assert.doesNotMatch(source, /base\.docs\.vibenet\.account\.v1/, `${name} snippet reads the current storage key`);
}
assert.match(
  engineSource,
  /senderAuthAuthenticator: k1Authenticator,/,
  "gas is estimated with the K1 sender authenticator",
);
assert.match(engineSource, /from: account\.address,\n\s*calls: phases,/, "the signed transaction names its EOA sender and carries raw phases");

assert.match(
  engineSource,
  /hash = await rpc\("eth_sendRawTransaction", \[serialized\]\);\n\s*\} catch \(error\) \{\n\s*throw Object\.assign\(error, \{ submitted: true \}\);/,
  "a lost eth_sendRawTransaction response is reported as possibly submitted",
);
assert.match(
  engineSource,
  /receipt = await waitForReceipt\(hash\);\n\s*\} catch \(error\) \{\n\s*throw Object\.assign\(error, \{ submitted: true, hash \}\);/,
  "a receipt wait failure keeps the submitted transaction hash",
);

{
  const waiter = engineSource.slice(engineSource.indexOf("async function waitForReceipt"), engineSource.indexOf("async function ensureFunded"));
  assert.match(waiter, /getTransactionReceipt\(client, \{ hash \}\)/, "receipts are polled over HTTP");
  assert.match(waiter, /throw new Error\(`Timed out waiting for the receipt/, "a receipt that never lands times out");
  const tail = engineSource.slice(engineSource.indexOf("receipt = await waitForReceipt(hash);"));
  assert.match(tail, /allPhasesSucceeded\(receipt\.eip8130 \?\? \{\}\)/, "every call phase must succeed");
}
{
  const funding = engineSource.slice(engineSource.indexOf("async function ensureFunded"), engineSource.indexOf("async function highestNonce"));
  assert.equal(funding.match(/faucet\/drip/g)?.length, 2, "faucet drip is retried once");
  assert.match(funding, /setTimeout\(resolve, 11_000\)/, "retry waits out the 10s faucet cooldown");
}

console.log("Vibenet engine and Mintlify loader checks passed.");
