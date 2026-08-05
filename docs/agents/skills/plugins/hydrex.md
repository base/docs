---
title: "Hydrex Plugin"
description: "Swapping and concentrated-liquidity on Hydrex via local prepare server → send_calls on Base."
tags: [dex, swap, liquidity, yield]
name: hydrex
version: 0.2.0
integration: http-api
chains: [base]
requires:
  shell: none
  allowlist: [hydrex-agent.com]
  externalMcp: null
  cliPackage: null
auth: none
risk: [slippage, irreversible]
---

# Hydrex Plugin

> [!IMPORTANT]
> Run Base MCP onboarding first (see SKILL.md). Obtain the user's wallet address via `get_wallets` — it is required as `from` or `recipient` in every prepare call. The Hydrex prepare server must be running locally before any write operations.

## Overview

Hydrex is an Omni-Liquidity MetaDEX on Base — concentrated-liquidity swaps aggregated across 0x, OpenOcean, OKX, and KyberSwap, plus liquidity positions that earn fees and rewards automatically. Adding liquidity creates an active earning position immediately; there is no separate staking step. The plugin calls a local prepare server (`https://hydrex-agent.com`) to fetch unsigned calldata, then submits via `send_calls` on Base mainnet (`chainId: 8453`).

## Surface Routing

| Capability | Harness surface (Cursor, Claude Code, Codex) | Chat-only surface (Claude.ai, ChatGPT) |
|---|---|---|
| Read state (quote, positions, portfolio, pools) | Harness HTTP tool → `GET https://hydrex-agent.com/state/*` | User-paste fallback: construct full URL, ask user to open in browser and paste JSON response |
| Prepare calldata (swap, add/remove liquidity) | Harness HTTP tool → `GET https://hydrex-agent.com/prepare/*` | User-paste fallback: same as above |
| Submit transaction | `send_calls` (Base MCP) | `send_calls` (Base MCP) |

The prepare server (`https://hydrex-agent.com`) is not on the Base MCP `web_request` allowlist. On chat-only surfaces, construct the full GET URL with all query parameters and ask the user to open it in a browser, paste the JSON response into chat, then continue with `send_calls`.

## Endpoints

**Server URL:** `https://hydrex-agent.com`

### GET /health

Response: `{ "ok": true, "service": "hydrex-base-skill-server", "chainId": 8453 }`

---

### GET /state/quote

| Parameter | Type | Required | Description |
|---|---|---|---|
| `tokenIn` | address | ✓ | Input token contract address |
| `tokenOut` | address | ✓ | Output token contract address |
| `amount` | string (wei) | ✓ | Input amount in raw units |
| `recipient` | address | ✓ | Wallet that receives output tokens |
| `slippage` | number | — | Slippage tolerance in bps (default: 50 = 0.5%) |
| `source` | string | — | Force aggregator: `ZEROX`, `OPENOCEAN`, `OKX`, `KYBERSWAP` |

Response:
```json
{
  "ok": true,
  "data": {
    "tokenIn": "0x...", "tokenOut": "0x...",
    "amountIn": "1000000", "amountOut": "412345678901234",
    "source": "ZEROX", "priceImpact": "0.12",
    "to": "0x...", "data": "0x...", "value": "0x0"
  }
}
```

Always show `amountOut` (human-readable) and `priceImpact` to the user before executing. Warn and require confirmation if `priceImpact > 5%`.

---

### GET /state/portfolio

```
GET /state/portfolio?address=<walletAddress>
```

Returns token balances and LP positions for the wallet.

---

### GET /state/positions

```
GET /state/positions?address=<walletAddress>
```

Returns all open concentrated liquidity positions owned by the wallet (read from NonfungiblePositionManager on-chain).

Response shape:
```json
{
  "ok": true,
  "count": 2,
  "positions": [
    {
      "positionId": "12345",
      "token0": "0x...", "token1": "0x...",
      "fee": 500, "tickLower": -887220, "tickUpper": 887220,
      "liquidity": "1500000000000000",
      "tokensOwed0": "0", "tokensOwed1": "0"
    }
  ]
}
```

Use `positionId` with `/prepare/remove-liquidity`.

---

### GET /state/trade-history

```
GET /state/trade-history?address=<walletAddress>
```

Returns past swaps executed through Hydrex for the wallet.

---

### GET /state/pools

Discovers Hydrex pools — including each pool's contract address, token addresses, and decimals — from the Hydrex stats API. This is how the agent resolves a `pool` address (and `token0`/`token1`/`decimals0`/`decimals1`) for `/prepare/add-liquidity` and `/prepare/remove-liquidity` when the user only gives a token pair.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `tokenA` | string | — | Token symbol (e.g. `USDC`) or address; matches either side of the pair (order-independent) |
| `tokenB` | string | — | Second token symbol or address, for unordered pair matching |
| `token0` | string | — | Order-specific token0 symbol or address |
| `token1` | string | — | Order-specific token1 symbol or address |
| `liquidityType` | string | — | Filter by pool type: `integral`, `classic-volatile`, `classic-stable` |
| `days` | number | — | Stats lookback window in days, 1–30 (default: 1) |
| `limit` | number | — | Max upstream pairs to scan, 1–1000 (default: 1000) |

Pass `tokenA` + `tokenB` to find pools for a specific pair regardless of token order. With no token filters it returns every pool. Results are sorted by TVL (USD) descending, so `pools[0]` is the deepest pool for the pair.

Response:
```json
{
  "ok": true,
  "count": 1,
  "summary": { },
  "pools": [
    {
      "id": "0x<poolAddress>",
      "pool": "0x<poolAddress>",
      "liquidityType": "integral",
      "fee": "500",
      "token0": { "address": "0x...", "symbol": "USDC", "name": "USD Coin", "decimals": 6 },
      "token1": { "address": "0x...", "symbol": "WETH", "name": "Wrapped Ether", "decimals": 18 },
      "tvlUsd": "1234567.89",
      "volumeUsd": "...", "feesUsd": "...", "averageFee": "..."
    }
  ]
}
```

Each entry gives the `pool` address plus `token0`/`token1` addresses and decimals — exactly the inputs `/prepare/add-liquidity` needs (use them directly, preserving the returned token0/token1 order). Handling:

- **`count = 0`** — no pool exists for that pair; tell the user and do not call a prepare endpoint.
- **`count > 1`** — multiple pools/fee tiers; show the options (`tvlUsd`, `fee`, `liquidityType`) and let the user choose before proceeding.
- **`count = 1`** — use it; confirm with the user before any write.

Never guess or fabricate a pool address — discover it here, or ask the user (addresses are also listed on the Hydrex app at https://hydrex.fi).

---

### GET /prepare/swap

| Parameter | Type | Required | Description |
|---|---|---|---|
| `tokenIn` | address | ✓ | Input token address |
| `tokenOut` | address | ✓ | Output token address |
| `amount` | string | ✓ | Human-readable input amount (e.g. `"1.5"`) |
| `decimals` | number | — | Decimals of `tokenIn` (default: 18) |
| `recipient` | address | ✓ | Wallet that receives output tokens |
| `slippage` | number | — | Slippage in bps (default: 50) |
| `source` | string | — | Optional aggregator override |

Example:
```
GET /prepare/swap?tokenIn=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913&tokenOut=0x4200000000000000000000000000000000000006&amount=1.5&decimals=6&recipient=0xYourWallet&slippage=50
```

Response:
```json
{
  "ok": true,
  "quote": {
    "tokenIn": "0x...", "tokenOut": "0x...",
    "amountIn": "1500000", "amountOut": "618522345678901",
    "source": "ZEROX", "priceImpact": "0.08"
  },
  "transactions": [
    { "step": "approve-tokenIn", "to": "0x<tokenIn>",   "data": "0x...", "value": "0x0", "chainId": 8453 },
    { "step": "swap",            "to": "0x<SwapRouter>", "data": "0x<calldata>", "value": "0x0", "chainId": 8453 }
  ]
}
```

The `transactions[]` array length is not fixed. For an ERC-20 `tokenIn`, an `approve-tokenIn` step is prepended **only when** the wallet's current allowance is too low — if allowance is already sufficient, just the `swap` step is returned. Native ETH swaps never include an approve step. Always pass every returned transaction to `send_calls` in order, rather than assuming a single call.

---

### GET /prepare/add-liquidity

| Parameter | Type | Required | Description |
|---|---|---|---|
| `from` | address | ✓ | Wallet providing liquidity |
| `pool` | address | ✓ | Pool contract address — resolve from the token pair via `GET /state/pools`, or ask the user (also listed on https://hydrex.fi) |
| `token0` | address | ✓ | token0 address (must match pool order) |
| `token1` | address | ✓ | token1 address (must match pool order) |
| `decimals0` | number | — | token0 decimals (default: 18) |
| `decimals1` | number | — | token1 decimals (default: 18) |
| `amount0` | string | ✓ | Desired token0 amount, human-readable |
| `amount1` | string | ✓ | Desired token1 amount, human-readable |
| `rangePreset` | string | — | Named range around current price: `tight` (±1%), `narrow` (±5%), `common` (±12.5%), `wide` (±20%). Used when no other range option is given (default: `common`) |
| `priceLower` | number | — | Custom lower price bound (token1/token0). Must be sent together with `priceUpper` |
| `priceUpper` | number | — | Custom upper price bound (token1/token0). Must be sent together with `priceLower` |
| `fullRange` | boolean | — | If `true`, spreads liquidity across the entire price range (always-active, V2-style). Default `false` |
| `slippage` | number | — | Slippage in bps (default: 50) |

The range is set in **exactly one** of these mutually exclusive ways — `rangePreset`, a custom `priceLower`+`priceUpper`, or `fullRange`. Sending more than one returns `400` ("Choose only one range option…"); sending only one of `priceLower`/`priceUpper` returns `400` ("A custom range requires both…"). If you send none, the server uses the `common` preset (±12.5%).

Response — three transactions, always in this order:
```json
{
  "ok": true,
  "position": { "tickLower": -887220, "tickUpper": 887220, "amount0": "0.05", "amount1": "100.0" },
  "transactions": [
    { "step": "approve-token0", "to": "0x<token0>", "data": "0x...", "value": "0x0", "chainId": 8453 },
    { "step": "approve-token1", "to": "0x<token1>", "data": "0x...", "value": "0x0", "chainId": 8453 },
    { "step": "mint",           "to": "0x<NFPM>",   "data": "0x...", "value": "0x0", "chainId": 8453 }
  ]
}
```

#### Price range selection

Choose one of three mutually exclusive ways to set the range (the server does the percentage→price math on-chain, so the agent only passes the choice):

| Option | How to send it | Resulting range |
|---|---|---|
| Named preset | `rangePreset=tight` | ±1% of current price |
| Named preset | `rangePreset=narrow` | ±5% |
| Named preset | `rangePreset=common` *(default)* | ±12.5% |
| Named preset | `rangePreset=wide` | ±20% |
| Custom | `priceLower=<p>&priceUpper=<p>` | exact bounds you supply |
| Full range | `fullRange=true` | entire price range (always-active) |

If the user gives no preference, the server applies the `common` preset (**±12.5%**). Always tell the user which range was used, e.g. "I'm using the `common` ±12.5% range around the current price — say the word for a tighter (`narrow`/`tight`), wider (`wide`), full, or custom range."

---

### GET /prepare/remove-liquidity

| Parameter | Type | Required | Description |
|---|---|---|---|
| `from` | address | ✓ | Wallet that owns the position |
| `positionId` | number | ✓ | NFT tokenId from `/state/positions` |
| `pool` | address | ✓ | Pool contract address — the matching position from `/state/positions` identifies the pair (`token0`/`token1`/`fee`); resolve the address via `GET /state/pools` (or ask the user) |
| `decimals0` | number | — | token0 decimals (default: 18) |
| `decimals1` | number | — | token1 decimals (default: 18) |
| `liquidityPercent` | number | — | Percentage to remove, 1–100 (default: 100) |
| `slippage` | number | — | Slippage in bps (default: 50) |

Response:
```json
{
  "ok": true,
  "transactions": [
    { "step": "remove-liquidity", "to": "0x<NFPM>", "data": "0x...", "value": "0x0", "chainId": 8453 }
  ]
}
```

All prepare endpoints return `{ "ok": false, "error": "..." }` on failure — surface the `error` field to the user and do not call `send_calls`.

## Orchestration

### Swap

```
1. get_wallets                                → address
2. GET /state/quote?tokenIn=...&tokenOut=...&amount=...&recipient=<address>
     → show amountOut (human-readable) and priceImpact
     → if priceImpact > 5%, warn user and require confirmation
3. GET /prepare/swap?tokenIn=...&tokenOut=...&amount=...&recipient=<address>
     → transactions[]
4. send_calls(chain="base", calls=[{to, value, data} for each tx])
5. get_request_status(requestId) — poll automatically until success or failed
     → report outcome; do NOT ask user to type anything
```

### Add liquidity (enter a position)

```
1. get_wallets                                → address
2. GET /state/positions?address=<address>     → show existing positions for context
     → if count = 0 (no positions yet), that's fine — this will be the user's first
       position; continue without prompting for an existing one
3. Resolve the pool: GET /state/pools?tokenA=<t0>&tokenB=<t1>
     → count = 0: no pool exists, tell the user and stop
     → count > 1: show options (tvlUsd, fee, liquidityType) and let the user pick
     → use the chosen pool's pool/token0/token1/decimals; never guess an address
4. Confirm: pool address, token pair, amounts, range (preset/custom/full; default `common` ±12.5%)
5. GET /prepare/add-liquidity?from=<address>&pool=<pool>&token0=<t0>&token1=<t1>
       &decimals0=<d0>&decimals1=<d1>&amount0=<a0>&amount1=<a1>
       [ one range option only: &rangePreset=<tight|narrow|common|wide>
         | &priceLower=<p>&priceUpper=<p> | &fullRange=true ]
     → show position.tickLower, tickUpper, amount0, amount1 to user before proceeding
6. send_calls(chain="base", calls from transactions[])
7. get_request_status(requestId) — poll automatically until success or failed
```

### Remove liquidity (exit a position)

```
1. get_wallets                                → address
2. GET /state/positions?address=<address>     → list positionId values
     → if count = 0 (no open positions), tell the user they have nothing to remove
       and stop — do not call /prepare/remove-liquidity
3. Confirm which positionId and what percentage to remove (default: 100%)
   → resolve the pool address with GET /state/pools?tokenA=<position.token0>&tokenB=<position.token1>
     (match on the position's fee tier when count > 1)
4. GET /prepare/remove-liquidity?from=<address>&positionId=<id>&pool=<pool>
       &decimals0=<d0>&decimals1=<d1>[&liquidityPercent=<pct>]
     → transactions[]
5. send_calls(chain="base", calls from transactions[])
6. get_request_status(requestId) — poll automatically until success or failed
```

## Submission

Target tool: **`send_calls`**

Map every `transactions[]` array from a prepare endpoint into `send_calls`:

```json
{
  "chain": "base",
  "calls": [
    { "to": "<tx.to>", "value": "<tx.value>", "data": "<tx.data>" }
  ]
}
```

Pass all transactions in a single `calls` array — Base MCP executes them atomically in one user approval. After `send_calls` returns, immediately call `get_request_status(requestId)` and poll until the status is `success` or `failed`. Do not ask the user to type or paste anything during polling. See [approval-mode.md](../references/approval-mode.md).

## Example Prompts

**"Swap 5 USDC for ETH on Hydrex"**
1. `get_wallets` → wallet address
2. `GET /state/quote?tokenIn=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913&tokenOut=0x4200000000000000000000000000000000000006&amount=5000000&recipient=<address>` → show amountOut, priceImpact
3. `GET /prepare/swap?tokenIn=0x833589...&tokenOut=0x420000...&amount=5&decimals=6&recipient=<address>&slippage=50`
4. `send_calls(chain="base", calls=[swap tx])`
5. Poll `get_request_status` → report outcome

**"Show my Hydrex liquidity positions"**
1. `get_wallets` → wallet address
2. `GET /state/positions?address=<address>` → display each positionId, token pair, tick range, and liquidity

**"Add liquidity to the USDC/ETH pool on Hydrex — 100 USDC and 0.04 ETH"**
1. `get_wallets` → wallet address
2. `GET /state/positions?address=<address>` → existing position context (count may be 0 — fine for a first position)
3. `GET /state/pools?tokenA=USDC&tokenB=WETH` → pick the pool (if count > 1, let the user choose); read its pool/token0/token1/decimals. Range defaults to the `common` preset (±12.5%) unless the user picks another; inform the user of the range used
4. `GET /prepare/add-liquidity?from=<address>&pool=<pool>&token0=<USDC>&token1=<WETH>&decimals0=6&decimals1=18&amount0=100&amount1=0.04`
5. Show returned `position` (tickLower, tickUpper, amounts) to user
6. `send_calls(chain="base", calls=[approve-token0, approve-token1, mint])`
7. Poll `get_request_status` → report outcome

**"Remove 50% of liquidity from Hydrex position #12345"** *(chat-only surface fallback)*
1. `get_wallets` → wallet address
2. `web_request` cannot reach `https://hydrex-agent.com` → construct the full URL and ask the user to open it in a browser and paste the JSON response into chat
3. On receiving JSON, `send_calls(chain="base", calls from transactions[])`
4. Poll `get_request_status` → report outcome

## Risks & Warnings

- **Slippage** — swap and liquidity operations fill at market price; actual output can differ from the quote. Default tolerance is 50 bps (0.5%). Always check `priceImpact` before executing; if `priceImpact > 5%`, warn the user and wait for explicit confirmation. Never auto-raise slippage.
- **Irreversible** — onchain transactions cannot be undone once approved. Always show the user the full operation details (amounts, price range for LP positions, positionId for removals) and confirm before calling `send_calls`.

## Notes

### Well-known token addresses (Base mainnet)

| Symbol | Address | Decimals |
|---|---|---|
| USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | 6 |
| WETH | `0x4200000000000000000000000000000000000006` | 18 |
| ETH (native) | Use the `value` field; no `tokenIn` address needed | 18 |

For other tokens, look up the address (and decimals) via `GET /state/pools` (returns `token0`/`token1` with `address`, `symbol`, and `decimals`), or ask the user to supply the contract address.

### Error handling

| Condition | Action |
|---|---|
| `get_wallets` returns no wallet | Tell user to connect their Base Account and retry |
| `/state/positions` returns `count: 0` | For add-liquidity, proceed — this is the user's first position. For remove-liquidity, tell the user they have no open positions and stop |
| Pool address unknown | Resolve via `GET /state/pools` (by token pair); if it returns `count: 0`, no pool exists — tell the user and stop. Never guess an address |
| `/state/pools` returns `count > 1` | Multiple pools/fee tiers for the pair; show `tvlUsd`/`fee`/`liquidityType` and let the user choose |
| `/state/quote` returns `priceImpact > 5%` | Warn user; require confirmation before proceeding |
| Prepare endpoint returns `ok: false` | Surface the `error` field; do not call `send_calls` |
| `send_calls` approval rejected | Inform user the transaction was cancelled; offer to retry |
| `get_request_status` shows failure | Parse the failure reason and suggest next steps |

### Liquidity notes

- Adding liquidity creates a concentrated liquidity position that earns fees and rewards automatically — no separate staking step is required.
- Removing liquidity fully exits the position and returns both tokens to the wallet.
- The `positionId` is the NFT tokenId from the NonfungiblePositionManager; always fetch current positions via `/state/positions` before a remove.
