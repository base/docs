---
title: "Balancer Plugin"
description: "Swaps and liquidity on Balancer through a shell: read pools/quotes from the Balancer API, build calldata with the Balancer SDK, submit via send_calls. CLI-only — requires terminal access; unsupported on chat-only surfaces."
tags: [dex, swap, liquidity, yield]
name: balancer
version: 0.1.0
integration: cli-only
chains: [base, ethereum, arbitrum, optimism, avalanche]
requires:
  shell: required        # the SDK encodes calldata in Node and reads run via curl — no shell, no plugin
  allowlist: []          # the API is reached from the shell (curl), so no host allowlisting is needed
  externalMcp: null
  cliPackage: null       # no published Balancer CLI — the shell path is a short Node script using @balancer/sdk
auth: none
risk: [slippage, low-liquidity]
---

# Balancer Plugin

> [!IMPORTANT]
> Run Base MCP onboarding first (see SKILL.md). No per-session auth — the Balancer API is public. Fetch the user's wallet address (via `get_wallets`) when a quote/build needs it; the SDK also needs it as `sender`/`recipient` for any v2-routed swap.

> [!WARNING]
> ## CLI-only plugin
>
> Every step — reads, quotes, and calldata — runs in the agent's shell: `curl` for the Balancer API and a short Node script (`@balancer/sdk`) to encode transactions. It works only in harnesses with shell/terminal access (Claude Code, Codex, Cursor, …). On chat-only surfaces (Claude.ai, ChatGPT) it does **not** work — do not fall back to a user-paste URL or a substitute MCP. If there is no shell, tell the user the Balancer plugin requires terminal access and stop (they can use `https://balancer.fi` manually). Quotes are not offered without the ability to execute them.

## Overview

Balancer is an automated market maker (AMM) for token swaps and liquidity provision on Base, Ethereum, Arbitrum, Optimism, and Avalanche (v2 and v3 pools, including yield-bearing "boosted" pools). This plugin runs entirely in a shell: it **reads** pool data and Smart Order Router (SOR) quotes from the Balancer API (`https://api-v3.balancer.fi`) with `curl`, **encodes unsigned calldata** for the chosen action with the Balancer SDK (`@balancer/sdk`), and submits it through Base MCP `send_calls`. The API returns swap *paths* and pool state, **not** calldata — the SDK's `buildCall()` turns a path/pool plus a slippage tolerance into the `{ to, callData, value }` a transaction needs, and its `query()` simulation needs a Base RPC. Because every step requires running code (`curl`, then Node), the plugin is **CLI-only**: on a surface without a shell it cannot run — see [`## Surface Routing`](#surface-routing).

## Surface Routing

| Capability | Surface with shell (Claude Code, Codex, Cursor) | Chat-only surface (Claude.ai, ChatGPT) |
|---|---|---|
| Read pools / quotes (`curl` the Balancer API) | ✅ harness HTTP tool / `curl` | ❌ unsupported |
| Build + submit a swap or LP change (Node SDK → `send_calls`) | ✅ run the SDK script, then `send_calls` | ❌ unsupported |

This plugin is **CLI-only** — it needs shell/terminal access for every operation, including reads (calldata can only be built by running the SDK, and quotes alone aren't useful without it). On a chat-only surface, do not improvise: no user-paste URL, no substitute MCP. Tell the user the Balancer plugin requires a shell (e.g. Claude Code) and stop; if they only want to act manually, point them to `https://balancer.fi`.

## Commands

Everything runs in the agent's shell. Reads are HTTP POSTs to the Balancer API via `curl` (or the harness HTTP tool). Writes build calldata with a short Node script using `@balancer/sdk` (there is **no Balancer CLI** — the SDK is a library you import). One-time setup in a working dir:

```bash
npm init -y >/dev/null 2>&1
npm i @balancer/sdk viem
export RPC_URL="<a Base RPC HTTPS endpoint>"   # buildCall's query() simulation needs an RPC
```

`chain` arguments take the API's uppercase `GqlChain` enum (`BASE`, `MAINNET`, `ARBITRUM`, `OPTIMISM`, `AVALANCHE`), not the Base MCP chain string — see [`## Notes`](#notes). The API is keyless and self-documenting via GraphQL introspection; if a query errors on a field, confirm names against the live schema.

### Read pools & quotes

Single endpoint: `POST https://api-v3.balancer.fi/` with a JSON `{ "query", "variables" }` body, run with `curl`.

**Quote / route a swap** — `sorGetSwapPaths` (returns paths + expected amounts + price impact; no calldata):

```graphql
query SwapPaths($chain: GqlChain!, $tokenIn: String!, $tokenOut: String!, $swapType: GqlSorSwapType!, $swapAmount: AmountHumanReadable!) {
  sorGetSwapPaths(chain: $chain, tokenIn: $tokenIn, tokenOut: $tokenOut, swapType: $swapType, swapAmount: $swapAmount) {
    returnAmount
    priceImpact { priceImpact error }
    paths { protocolVersion pools isBuffer inputAmountRaw outputAmountRaw tokens { address decimals } }
  }
}
```

`swapType`: `EXACT_IN` (amount is the input) or `EXACT_OUT` (amount is the desired output). `swapAmount` is human-readable (e.g. `"100"`). The returned `paths[].protocolVersion` drives the submission batch (see [`## Submission`](#submission)).

`priceImpact.priceImpact` is **nullable**: for some valid multi-hop routes the API can't compute it and returns `{ priceImpact: null, error: "Price impact could not be calculated for this path. The swap path is still valid and can be executed." }` (USDC→WETH does this right now). Treat a null with that message as *unknown*, **not** as a failure or a high-impact warning — say "price impact unavailable", fall back to comparing the SOR `returnAmount` against the input (and the pool's TVL), and don't block the swap on it. Only a non-null, genuinely high `priceImpact` is a warning sign (see [`## Risks & Warnings`](#risks--warnings)).

**Discover pools** — `poolGetPools` (filter, sort by TVL/APR):

```graphql
query Pools($first: Int, $orderBy: GqlPoolOrderBy, $orderDirection: GqlPoolOrderDirection, $where: GqlPoolFilter) {
  poolGetPools(first: $first, orderBy: $orderBy, orderDirection: $orderDirection, where: $where) {
    id address chain type name symbol protocolVersion
    dynamicData { totalLiquidity volume24h aprItems { apr type } }
    poolTokens { address symbol weight }
  }
}
```

Example variables: `{ "first": 10, "orderBy": "totalLiquidity", "orderDirection": "desc", "where": { "chainIn": ["BASE"], "minTvl": 100000 } }`. Single pool: `poolGetPool(id, chain)`. Tokens/prices: `tokenGetTokens(chains)`, `tokenGetCurrentPrices(chains)`. A pool's `id` is the argument to the SDK's `fetchPoolState`.

### Build a swap (`build-swap.mjs`)

Fetch SOR paths, simulate, then encode the action call **together with its version-correct approval(s)** and emit a ready-to-submit payload — `{ chain, calls }` (plus `protocolVersion`/`minAmountOut` for display) that maps straight onto `send_calls`. Building the whole batch in the script (not just the action call) is deliberate: each approval's target is derived from the **same `call.to` the SDK returns**, so a v3 Permit2 approval can never be hand-paired with a v2 Vault target. That mismatch passes per-call encoding (each approval is individually valid) and only reverts at the action call — usually as an uninformative `unable to estimate gas`. ERC20 input only; for native-ETH input set `wethIsEth: true` and drop the approval call(s) (see [`## Submission`](#submission)).

```js
import { BalancerApi, Swap, SwapKind, Slippage, ChainId, Token, TokenAmount } from "@balancer/sdk";
import { encodeFunctionData } from "viem";

const chainId = ChainId.BASE;
const RPC_URL = process.env.RPC_URL;
// args: sender (wallet from get_wallets), tokenIn, tokenInDecimals, tokenOut, humanAmount, slippagePct
const [sender, tokenIn, decIn, tokenOut, amount, slippagePct = "0.5"] = process.argv.slice(2);

const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3";   // canonical Permit2, same on every chain
const CHAIN_STRINGS = { 8453: "base", 1: "ethereum", 42161: "arbitrum", 10: "optimism", 43114: "avalanche" };

const api = new BalancerApi("https://api-v3.balancer.fi/", chainId);
const inAmount = TokenAmount.fromHumanAmount(new Token(chainId, tokenIn, Number(decIn)), amount);
const paths = await api.sorSwapPaths.fetchSorSwapPaths({
  chainId, tokenIn, tokenOut, swapKind: SwapKind.GivenIn, swapAmount: inAmount,
});

// The SOR routes per pair through Balancer v2 or v3. v3 makes msg.sender the sender/recipient;
// v2 settles through the V2 Vault and REQUIRES sender/recipient — without them buildCall throws
// "Input Validation: Swap input missing parameter sender/recipient for Balancer v2".
const usesV2 = paths.some((p) => p.protocolVersion === 2);

const swap = new Swap({ chainId, paths, swapKind: SwapKind.GivenIn });
const queryOutput = await swap.query(RPC_URL);          // onchain simulation → expected out
const call = swap.buildCall({
  queryOutput,
  slippage: Slippage.fromPercentage(slippagePct),       // sets minAmountOut
  deadline: 9999999999n,
  ...(usesV2 ? { sender, recipient: sender } : {}),     // v2 only; v3 rejects sender/recipient
  wethIsEth: false,                                      // true → use native ETH as tokenIn/out
});

// Assemble the FULL send_calls array here, deriving every approval target from the SAME call.to
// the SDK returned — so a v3 Permit2 approval can't be paired with a v2 Vault target.
const amountIn = inAmount.amount;                        // raw base units (bigint)
const ERC20_APPROVE = [{ name: "approve", type: "function", stateMutability: "nonpayable",
  inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] }];
const PERMIT2_APPROVE = [{ name: "approve", type: "function", stateMutability: "nonpayable",
  inputs: [{ name: "token", type: "address" }, { name: "spender", type: "address" },
           { name: "amount", type: "uint160" }, { name: "expiration", type: "uint48" }], outputs: [] }];
const approve = (spender) => encodeFunctionData({ abi: ERC20_APPROVE, functionName: "approve", args: [spender, amountIn] });
const hex = (v) => "0x" + (v ?? 0n).toString(16);

const calls = [];
if (usesV2) {
  // v2: plain ERC20 allowance to the V2 Vault (call.to), then the Vault call. No Permit2.
  calls.push({ to: tokenIn, value: "0x0", data: approve(call.to) });
} else {
  // v3: ERC20 approve Permit2, then Permit2 approves the Router (call.to), then the Router call.
  calls.push({ to: tokenIn, value: "0x0", data: approve(PERMIT2) });
  calls.push({ to: PERMIT2, value: "0x0", data: encodeFunctionData({
    abi: PERMIT2_APPROVE, functionName: "approve",
    args: [tokenIn, call.to, amountIn, 9999999999n] }) });   // far-future uint48 expiration
}
calls.push({ to: call.to, value: hex(call.value), data: call.callData });   // action call (v3 Router or V2 Vault)

console.log(JSON.stringify({
  chain: CHAIN_STRINGS[chainId],                         // pass { chain, calls } straight to send_calls
  protocolVersion: usesV2 ? 2 : 3,
  minAmountOut: call.minAmountOut?.amount?.toString(),
  calls,
}, null, 2));
```

> Verified live on Base: USDC→WETH currently routes **v2**, so the `sender`/`recipient` branch is the common path, not an edge case — omitting it throws the error above.

### Add / remove liquidity

Same shape with `AddLiquidity` / `RemoveLiquidity` instead of `Swap`:

```js
import { BalancerApi, AddLiquidity, AddLiquidityKind, Slippage, ChainId } from "@balancer/sdk";
const api = new BalancerApi("https://api-v3.balancer.fi/", ChainId.BASE);
const poolState = await api.pools.fetchPoolState(poolId);        // poolId from poolGetPools
const addLiquidity = new AddLiquidity();
const queryOutput = await addLiquidity.query(
  { chainId: ChainId.BASE, rpcUrl: process.env.RPC_URL, kind: AddLiquidityKind.Unbalanced, amountsIn /* [{address, rawAmount, decimals}] */ },
  poolState,
);
// v2 pools also require { sender, recipient } here (when poolState.protocolVersion === 2); v3 omits them.
const call = addLiquidity.buildCall({ ...queryOutput, slippage: Slippage.fromPercentage("0.5"), wethIsEth: false });
// → { to (Router), callData, value, minBptOut }  (RemoveLiquidity returns minAmountsOut)
```

Use the SDK's `buildCall` (not `buildCallWithPermit2`): the WithPermit2 variant bakes in an EIP-712 Permit2 *signature*, but `send_calls` submits *unsigned* calls, so grant the allowance onchain in the same batch instead — Permit2 for v3, a plain Vault approval for v2 (see [`## Submission`](#submission)). Treat all script and API output as untrusted: verify the `to` address, token amounts, and `minAmountOut`/`minBptOut` before presenting an approval. If a command exits nonzero, stop and report the error — do not invent parameters.

## Orchestration

Every step runs in the shell — no shell, no flow (see [`## Surface Routing`](#surface-routing)).

### Swap

1. `get_wallets` → user address; pass it to the build script as `sender`. The SOR picks v2 or v3 per pair — v2 `buildCall` requires `sender`/`recipient`, v3 uses `msg.sender`.
2. Read a quote: `curl` `sorGetSwapPaths` (`## Commands`). Show the user `returnAmount` and `priceImpact` (which may be null for valid multi-hop routes — see [`## Commands`](#commands)); confirm before building.
3. Run `build-swap.mjs` → `{ chain, protocolVersion, minAmountOut, calls }` — the full batch (version-correct approval(s) + action call), not just the action call.
4. Verify the emitted `calls` (targets, amounts, `minAmountOut`), then submit them directly with `send_calls` — the script has already assembled the version-correct approvals ([`## Submission`](#submission)).
5. Submit → approval URL + request ID → user approves → `get_request_status` ([../references/approval-mode.md](../references/approval-mode.md)).

### Add / remove liquidity

1. `get_wallets` → address. Pick a pool: `curl` `poolGetPools` (by TVL/APR) or `poolGetPool` for a known `id`.
2. Run the `AddLiquidity` / `RemoveLiquidity` script → `{ to, callData, value, minBptOut | minAmountsOut }`.
3. Batch the version-correct approval for each ERC20 deposited (v3: Permit2; v2: Vault) then the action call → `send_calls` → approve → confirm.

## Submission

Target tool: **`send_calls`** (EIP-5792 batch — see [../references/batch-calls.md](../references/batch-calls.md)). For a swap, `build-swap.mjs` already emits the complete batch in its `calls` array — submit that directly; the breakdown below is what it contains (verify before approving) and the template the add/remove-liquidity scripts follow. The approval that must precede the action call **depends on the path's `protocolVersion`** (the value the script emits; the SOR chooses v2 or v3 per pair). `send_calls` submits *unsigned* calls, so grant any allowance onchain in the batch — never `buildCallWithPermit2` (it bakes in an EIP-712 signature). For an ERC20 input/deposit:

**v3 (`protocolVersion: 3`)** — settles through a v3 Router (`call.to`) that pulls tokens via **Permit2**. Batch in order:

1. `tokenIn.approve(PERMIT2, amountIn)` — ERC20 `approve(address,uint256)` to canonical Permit2 `0x000000000022D473030F116dDEE9F6B43aC78BA3`. Skip if allowance already covers `amountIn`.
2. `PERMIT2.approve(tokenIn, router, amountIn, expiration)` — Permit2 AllowanceTransfer `approve(address,address,uint160,uint48)`, `router` = `call.to`.
3. The Router call: `{ to: call.to, value: call.value, data: call.callData }`.

**v2 (`protocolVersion: 2`)** — settles through the **Balancer V2 Vault** (`call.to` = `0xBA12222222228d8Ba445958a75a0704d566BF2C8`, same on every chain), which pulls tokens via a **plain ERC20 allowance to the Vault — no Permit2**. Batch in order:

1. `tokenIn.approve(VAULT, amountIn)` — ERC20 `approve(address,uint256)` to the V2 Vault (`call.to`). Skip if already approved.
2. The Vault call: `{ to: call.to, value: call.value, data: call.callData }`.

For a **native-ETH** input (`wethIsEth: true`), omit the approval call(s) and pass the ETH via `value` (both versions). The **v3** batch maps as:

```json
{
  "chain": "base",
  "calls": [
    { "to": "<tokenIn>",  "value": "0x0", "data": "<approve(PERMIT2, amountIn)>" },
    { "to": "0x000000000022D473030F116dDEE9F6B43aC78BA3", "value": "0x0", "data": "<permit2.approve(...)>" },
    { "to": "<call.to>",  "value": "<call.value as hex wei, e.g. 0x0>", "data": "<call.callData>" }
  ]
}
```

- **`to`** — `0x`-prefixed target; for the action call, the `call.to` the SDK returns (a v3 Router or the V2 Vault — never hardcode it).
- **`value`** — hex wei. The SDK returns a bigint; convert (`"0x" + value.toString(16)`), or `0x0` when zero.
- **`chain`** — map the SDK `chainId` to the Base MCP chain string: `8453 → base`, `1 → ethereum`, `42161 → arbitrum`, `10 → optimism`, `43114 → avalanche`.

Then follow the standard approval flow ([../references/approval-mode.md](../references/approval-mode.md)): present the returned URL as **"Approve Transaction"**, auto-open it in the shell harness, then poll `get_request_status` once after the user confirms.

## Example Prompts

```
Swap 100 USDC for WETH on Base through Balancer
```
1. `get_wallets` → address.
2. `curl` `sorGetSwapPaths(chain: BASE, tokenIn: <USDC>, tokenOut: <WETH>, swapType: EXACT_IN, swapAmount: "100")`; show `returnAmount` + `priceImpact`.
3. `node build-swap.mjs <wallet> <USDC> 6 <WETH> 100 0.5` → `{ chain, protocolVersion, minAmountOut, calls }` (USDC→WETH routes v2, so `calls` = ERC20 `approve(Vault)` + Vault call).
4. Verify the emitted `calls`, then `send_calls({ chain: "base", calls })`.
5. User approves → `get_request_status`.

```
What's the best Balancer pool for ETH yield on Base?
```
1. `curl` `poolGetPools(where: { chainIn: ["BASE"], minTvl: 100000 }, orderBy: apr, orderDirection: desc, first: 10)`.
2. Filter to ETH-bearing pools; report APR (`dynamicData.aprItems`), TVL, and pool type. (Read still runs in the shell via `curl`.)

```
Add 500 USDC and 0.2 WETH to a Balancer pool on Base
```
1. `get_wallets` → address; pick the pool (`curl` `poolGetPools` / `poolGetPool` → `id`).
2. Run the `AddLiquidity` script (`amountsIn` = USDC + WETH) → `{ to, callData, value, minBptOut }`.
3. Batch the version-correct approval for **each** deposited ERC20 (v3: Permit2; v2: Vault), then the action call → `send_calls` → approve → confirm.

```
Swap 1 WETH to USDC on Balancer — I'm on Claude.ai
```
1. No shell here → this plugin can't run. Tell the user Balancer needs a terminal harness (e.g. Claude Code); do **not** attempt a user-paste URL or a substitute MCP.
2. If they only want to act manually, point them to `https://balancer.fi/swap`.

## Risks & Warnings

- **slippage** — swaps and liquidity changes can fill worse than quoted. The SDK derives `minAmountOut` / `minBptOut` (and `minAmountsOut` on removes) from the slippage you pass to `buildCall` (default 0.5%). Show the user the SOR `returnAmount` and `priceImpact` before submitting, and confirm the slippage. Never silently widen slippage to force a fill — re-quote and let the user decide.
- **low-liquidity** — thin or newly-created pools mean large price impact, failed fills, and impermanent-loss exposure on volatile pairs. Check the pool's `dynamicData.totalLiquidity` (TVL) and the SOR `priceImpact` before swapping or LPing; warn the user when `priceImpact` is high (e.g. > 1%). A **null** `priceImpact` carrying the API's "…still valid and can be executed" note is *unknown*, not high — don't treat it as an error or silently block on it; say it's unavailable and fall back to TVL and the `returnAmount`. Don't auto-route through, or LP into, a pool the user didn't intend, and don't add liquidity to a pool you couldn't read TVL for.

## Notes

- **No CLI / shell required** — there is no published Balancer CLI; the shell path is a short Node script using `@balancer/sdk` (hence `cliPackage: null`, `shell: required`). The SDK encodes calldata locally and its `query()` needs a Base RPC, so calldata cannot be produced without running code — there is no chat-only path.
- **API** — `https://api-v3.balancer.fi/` (test: `https://test-api-v3.balancer.fi/`); public GraphQL, keyless, rate-limited. Reached from the shell with `curl` / the harness HTTP tool, so the host needs no allowlisting (`allowlist: []`). Self-documenting via introspection. The schema defines a `GqlSorCallData` type but no query returns it — the API does not hand back calldata.
- **Chain mapping** — API `GqlChain` (uppercase) ↔ Base MCP chain string ↔ SDK `ChainId`: `BASE`/`base`/`8453`, `MAINNET`/`ethereum`/`1`, `ARBITRUM`/`arbitrum`/`42161`, `OPTIMISM`/`optimism`/`10`, `AVALANCHE`/`avalanche`/`43114`. `GqlChain` uses `MAINNET` for Ethereum, not `ethereum`.
- **SDK** — `@balancer/sdk` (the `b-sdk` repo). `Swap` / `AddLiquidity` / `RemoveLiquidity` each expose `.query(rpcUrl)` → `.buildCall(...)` → `{ to, callData, value, minAmountOut | minBptOut | minAmountsOut }`. `query()` needs a Base RPC HTTPS URL. In v3, `msg.sender` is sender and recipient (no `sender`/`recipient` params); **v2 `buildCall` requires `sender` and `recipient`** — pass the wallet for any pair the SOR routes through v2, or it throws `Input Validation: Swap input missing parameter sender/recipient for Balancer v2`.
- **Permit2 (v3 only)** — canonical address `0x000000000022D473030F116dDEE9F6B43aC78BA3` on every chain. v3 Routers pull funds via Permit2; with unsigned `send_calls` batches, grant the allowance onchain (the two approve calls in [`## Submission`](#submission)) instead of `buildCallWithPermit2`'s signature. v2 doesn't use Permit2 — it approves the V2 Vault directly (see below).
- **Router addresses** — always use the `to` the SDK returns; don't hardcode. The SDK picks the right Router per chain/version (e.g. boosted/ERC4626 "nested" pools on Base route through the Composite Liquidity Router `0xf23b4DB826DbA14c0e857029dfF076b1c0264843`). Canonical list: the [Base deployment-addresses page](https://docs.balancer.fi/developer-reference/contracts/deployment-addresses/base.html).
- **v2 vs v3 settlement** — the SOR routes each pair through v2 or v3 by liquidity (common Base pairs like USDC↔WETH, WETH↔cbETH, USDC↔DAI currently route **v2**), and `buildCall` returns the version-correct target: a **v3 Router**, or the **Balancer V2 Vault** `0xBA12222222228d8Ba445958a75a0704d566BF2C8` (same on every chain). Consequences: v2 needs `sender`/`recipient` on `buildCall` and a plain ERC20 approval to the Vault; v3 omits them and approves via Permit2. The script emits `protocolVersion` so the agent picks the right batch. `isBuffer: true` steps are ERC4626 wrap/unwrap hops through v3 boosted-pool buffers.
- **Decimals** — `swapAmount` and human amounts are not raw base units. Fetch token decimals from `tokenGetTokens` (or onchain) before building `TokenAmount`.
- **Chain scope** — `chains` is the full intersection of Balancer V3 deployments and Base MCP's `send_calls` support: base, ethereum, arbitrum, optimism, avalanche. The same read → SDK → `send_calls` flow applies to all five — change `chainId` / the `chain` string and let `buildCall` resolve that chain's Router. Balancer V3 also runs on Gnosis, Sonic, HyperEVM, Plasma, and Monad, but Base MCP can't route `send_calls` there, so they're out of scope; Polygon and BSC are the reverse (Base MCP supports them, V3 isn't deployed).
