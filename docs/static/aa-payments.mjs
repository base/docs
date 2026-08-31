// Native account abstraction (EIP-8130) payments on Vibenet.
//
// Imports ./aa.mjs — the vendored EIP-8130 client built from the viem
// `feat/eip-8130-production` branch. Released viem has no ./eip8130 export, so
// the bundle is the only way to sign a native AA transaction. Relative ESM
// resolution works because both files are served from /static/.
//
// The flow is deliberately split into three steps so a demo can show them
// separately: create an account, fund it, then spend from it.

import {
  createPublicClient,
  encodeWalletCalls,
  generatePrivateKey,
  getTransactionCount,
  http,
  newSmartAccount,
  privateKeyToAccount,
  waitForTransactionReceipt,
} from "./aa.mjs";

export const CHAIN_ID = 84538453;
export const API_URL = "https://api.vibes.base.org";
// The 8130-aware JSON-RPC passthrough. The plain devnet RPC does not carry the
// 8130 extensions (config sequences, phase statuses on receipts).
export const ACCOUNT_RPC = `${API_URL}/api/vibenet/account/rpc`;
export const USDV = "0x1eb657FD80bfc3C03e6C5f485E65ec698dC205A8";
export const USDV_DECIMALS = 6;

// Structural gas floors, mirroring the reference demo's `estimateTxGas`:
//   base 45k + deploy 160k + 22k per call, doubled for fallback safety.
// A transaction carrying `create` cannot be simulated — the account does not
// exist yet, so the node rejects eth_estimateGas with -32602. The floor is then
// the sole gas source, so it over-provisions on purpose: unused gas is
// refunded, an under-estimate is an on-chain OOG revert.
const GAS_DEPLOY_AND_CALL = 454000n; // 2 * (45k + 160k + 22k)
const GAS_CALL_ONLY = 134000n; //       2 * (45k + 22k)

const client = createPublicClient({
  chain: {
    id: CHAIN_ID,
    name: "Vibenet",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [ACCOUNT_RPC] } },
  },
  transport: http(ACCOUNT_RPC),
});

async function post(path, body) {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const parsed = await response.json().catch(() => null);
  if (!response.ok) throw new Error(parsed?.error ?? `${path} returned ${response.status}`);
  return parsed;
}

function randomHex(bytes) {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return `0x${Array.from(buffer, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

/** A fresh random address. Nobody holds its key — it is only a destination. */
export function randomAddress() {
  return randomHex(20);
}

/** ERC-20 transfer calldata. Selector constant, both args left-padded to 32 bytes. */
export function erc20Transfer(to, amount) {
  return `0xa9059cbb${to.slice(2).toLowerCase().padStart(64, "0")}${BigInt(amount)
    .toString(16)
    .padStart(64, "0")}`;
}

/** Live deployment addresses. Refetched so a devnet reset needs no code change. */
export async function contracts() {
  const response = await fetch(`${API_URL}/api/vibenet/contracts`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Contract lookup failed (${response.status})`);
  return response.json();
}

/** Has the account been deployed on chain yet? */
export async function isDeployed(address) {
  const code = await client.request({ method: "eth_getCode", params: [address, "latest"] });
  return !!code && code !== "0x";
}

/** USDV balance, straight from the token contract. */
export async function usdvBalanceOf(address) {
  const data = `0x70a08231${address.slice(2).toLowerCase().padStart(64, "0")}`;
  return BigInt(await client.request({ method: "eth_call", params: [{ to: USDV, data }, "latest"] }));
}

/**
 * Step 1 — create a counterfactual EIP-8130 smart account.
 *
 * The address is derived via CREATE2 from the salt, proxy code and initial
 * actors, so it is known and fundable before any transaction exists. Nothing is
 * broadcast here: no deployment, no gas, no network write.
 */
export async function createAccount() {
  const { eip8130 } = await contracts();
  const implementation = eip8130?.DefaultAccount;
  if (!implementation) throw new Error("Vibenet reported no DefaultAccount implementation");
  const signer = privateKeyToAccount(generatePrivateKey());
  return newSmartAccount({ signer, implementation, salt: randomHex(32) });
}

/**
 * Step 2 — fund the account from the Vibenet faucet.
 *
 * Note what this actually is: the faucet holds a minter role on the USDV B20
 * token, so the drip MINTS tokens (an ERC-20 `Transfer` from the zero address)
 * rather than moving them from anyone's balance. ETH is a genuine transfer out
 * of the faucet's prefunded pool. Neither is a payment — this is setup.
 */
export async function fundAccount(address) {
  const drips = await Promise.all([
    post("/api/vibenet/faucet/drip", { address }),
    post("/api/vibenet/faucet/drip-usdv", { address }),
  ]);
  await Promise.all(
    drips.map((drip) => waitForTransactionReceipt(client, { hash: drip.tx_hash, timeout: 60000 })),
  );
  return drips.map((drip) => drip.tx_hash);
}

/**
 * Step 3 — spend from the account. THIS is the payment: a real ERC-20 transfer
 * out of a funded balance to a recipient.
 *
 * If the account has never transacted, the change that creates it rides along
 * in `accountChanges`, so this single transaction both deploys the account and
 * makes the payment. Deployment state is read live rather than cached — a
 * stale flag either re-attaches a create to a deployed account (revert) or
 * omits it from an undeployed one (revert).
 */
export async function sendUsdv({ account, to, amount = 1000000n, onStep = () => {} }) {
  const deployed = await isDeployed(account.address);
  const accountChanges = deployed ? [] : [account.createChange];

  onStep(
    deployed
      ? "Signing the transfer…"
      : "Signing — this one transaction deploys the account and pays…",
  );

  const nonceSequence = await getTransactionCount(client, {
    address: account.address,
    nonceKey: 0n,
  });
  const calls = encodeWalletCalls({
    account: account.address,
    calls: [[{ to: USDV, value: 0n, data: erc20Transfer(to, amount) }]],
  });
  const serialized = await account.signTransaction({
    chainId: CHAIN_ID,
    accountChanges,
    calls,
    nonceKey: 0n,
    nonceSequence,
    maxFeePerGas: 1000000000n,
    maxPriorityFeePerGas: 1000000n,
    gas: deployed ? GAS_CALL_ONLY : GAS_DEPLOY_AND_CALL,
  });

  onStep("Broadcasting…");
  const hash = await client.request({ method: "eth_sendRawTransaction", params: [serialized] });

  onStep("Waiting for inclusion…", { hash });
  const receipt = await waitForTransactionReceipt(client, { hash, timeout: 60000 });
  if (receipt.status === "0x0") throw new Error(`Transaction reverted (${hash})`);
  const phases = receipt.eip8130?.phaseStatuses ?? [];
  const failedPhase = phases.findIndex((status) => status === "0x0");
  if (failedPhase !== -1) throw new Error(`Phase ${failedPhase} reverted (${hash})`);

  return {
    hash,
    deployedByThisTx: !deployed,
    blockNumber: Number(BigInt(receipt.blockNumber)),
    gasUsed: Number(BigInt(receipt.gasUsed)),
    phases,
  };
}

/** Format a raw integer token amount for display. */
export function formatUnits(value, decimals = USDV_DECIMALS) {
  const raw = BigInt(value).toString().padStart(decimals + 1, "0");
  const whole = raw.slice(0, -decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const fraction = raw.slice(-decimals).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

const api = {
  CHAIN_ID, API_URL, ACCOUNT_RPC, USDV, USDV_DECIMALS,
  createAccount, fundAccount, sendUsdv, isDeployed, usdvBalanceOf,
  contracts, randomAddress, erc20Transfer, formatUnits,
};

if (typeof window !== "undefined") {
  window.__vibenetAa = api;
  window.dispatchEvent(new CustomEvent("vibenet-aa:ready"));
}

export default api;
