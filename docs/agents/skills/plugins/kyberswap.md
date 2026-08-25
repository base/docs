---
title: "KyberSwap Plugin"
description: "DEX aggregation on KyberSwap via HTTP API → send_calls across 7 chains, best-rate routing through 50+ liquidity sources."
tags: [dex, swap, liquidity]
name: kyberswap
version: 0.2.0
integration: http-api
chains: [base, ethereum, arbitrum, optimism, polygon, bsc, avalanche]
requires:
  shell: none
  allowlist: [aggregator-api.kyberswap.com, token-api.kyberswap.com]
  externalMcp: null
  cliPackage: null
auth: none
risk: [slippage]
---

# KyberSwap Plugin

> [!IMPORTANT]
> Complete the short Base MCP onboarding flow defined in `SKILL.md` before calling any KyberSwap endpoint. The user's wallet address is fetched lazily when needed.

## Overview

KyberSwap is a DEX aggregator that routes trades across 50+ liquidity sources (Uniswap V2/V3/V4, Curve, Balancer, and others) to find the best execution price across 7 chains. The plugin calls the KyberSwap Aggregator HTTP API to fetch a route quote and build unsigned calldata, then submits the result to Base MCP's `send_calls`. Use KyberSwap when the user wants the best rate across all available liquidity — not just a single protocol's pools.

## Surface Routing

| Capability | Harness surface (Claude Code, Cursor) | Chat-only surface (Claude.ai, ChatGPT) |
|---|---|---|
| GET /routes (quote) | Harness HTTP tool — no allowlist needed | `web_request` — requires `aggregator-api.kyberswap.com` allowlisted |
| POST /route/build (calldata) | Harness HTTP tool — no allowlist needed | `web_request` — requires `aggregator-api.kyberswap.com` allowlisted |
| Token resolution | Harness HTTP tool — no allowlist needed | `web_request` — requires `token-api.kyberswap.com` allowlisted |
| Submit swap | `send_calls` — all surfaces | `send_calls` — all surfaces |

On chat-only surfaces where the allowlist is not configured: inform the user that the swap cannot proceed and direct them to the KyberSwap web UI at `kyberswap.com`. Do **not** improvise a workaround. For the full decision tree, see [../references/custom-plugins.md](../references/custom-plugins.md).

## Endpoints

Base URL: `https://aggregator-api.kyberswap.com/{chain}`

Chain slugs: `base` · `ethereum` · `arbitrum` · `optimism` · `polygon` · `bsc` · `avalanche`

### GET /api/v1/routes

Fetches the best route and returns a `routeSummary` required verbatim in the build step.

```
GET https://aggregator-api.kyberswap.com/{chain}/api/v1/routes
  ?tokenIn={address}
  &tokenOut={address}
  &amountIn={amountInWei}
  &to={walletAddress}
  &slippageTolerance={bps}
  &source=base-mcp
```

| Param | Required | Notes |
|---|---|---|
| `tokenIn` | ✅ | Token address. Native token: `0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE` |
| `tokenOut` | ✅ | Token address |
| `amountIn` | ✅ | Amount in base units — plain integer string. 1 ETH = `1000000000000000000`, 100 USDC = `100000000` |
| `to` | recommended | Recipient wallet address |
| `slippageTolerance` | recommended | Basis points (50 = 0.5%). See [Risks & Warnings](#risks--warnings) |
| `source` | recommended | Pass `base-mcp` for attribution |

Response shape:

```json
{
  "data": {
    "routeSummary": {
      "amountIn": "100000000",
      "amountInUsd": "100.00",
      "amountOut": "38650000000000000",
      "amountOutUsd": "99.71",
      "gas": "300000",
      "gasUsd": "0.29",
      "...": "other fields — pass verbatim to build step"
    },
    "routerAddress": "0x6131B5fae19EA4f9D964eAc0408E4408b66337b5"
  }
}
```

Keep the complete `routeSummary` object exactly as returned — it is required verbatim in the build step.

### POST /api/v1/route/build

Builds encoded swap calldata from a previously fetched route.

```json
{
  "url": "https://aggregator-api.kyberswap.com/{chain}/api/v1/route/build",
  "method": "POST",
  "headers": { "content-type": "application/json", "x-client-id": "base-mcp" },
  "body": {
    "routeSummary": { "...": "complete object from GET response" },
    "sender": "<walletAddress>",
    "recipient": "<walletAddress>",
    "slippageTolerance": 50,
    "deadline": "<current unix timestamp + 1200>",
    "source": "base-mcp"
  }
}
```

Do not modify or truncate `routeSummary`. Routes expire in ~30 seconds — if this step fails with "return amount is not enough", re-fetch the route and retry.

Response shape:

```json
{
  "data": {
    "amountIn": "100000000",
    "amountOut": "38650000000000000",
    "gas": "300000",
    "transactionValue": "0",
    "routerAddress": "0x6131B5fae19EA4f9D964eAc0408E4408b66337b5",
    "data": "0x..."
  }
}
```

`transactionValue` is a **decimal** wei string (e.g. `"0"` for ERC-20 input, `"10000000000000000"` for 0.01 ETH). Hex-encode it before passing as `value` in `send_calls`: `"0x" + BigInt(transactionValue).toString(16)`. Non-zero only for native token input.

### GET /api/v1/public/tokens (token resolution)

Resolve a token symbol to its contract address when not in the known-addresses table in `## Notes`.

```
GET https://token-api.kyberswap.com/api/v1/public/tokens
  ?chainIds={chainId}
  &name={symbol}
  &isWhitelisted=true
```

Pick the result with exact `symbol` match and highest `marketCap`. If no whitelisted match, retry without `isWhitelisted`.

Chain IDs: base=8453, ethereum=1, arbitrum=42161, optimism=10, polygon=137, bsc=56, avalanche=43114

## Orchestration

### Swap

1. `get_wallets` → `walletAddress`.
2. Resolve token symbols to addresses — use the `## Notes` table first, then the token-api endpoint.
3. Compute `amountIn` in base units: multiply human amount by `10^decimals` (ETH=18, USDC=6, WBTC=8).
4. Determine slippage: default `50` bps for common pairs, `100` bps for long-tail tokens. Apply thresholds in `## Risks & Warnings` before proceeding.
5. `GET /api/v1/routes` → `routeSummary`, `amountOut`, `amountOutUsd`, `gasUsd`. Show the quoted output and gas cost to the user; confirm before proceeding.
6. `POST /api/v1/route/build` → `data` (swap calldata), `transactionValue`, `routerAddress`. Verify `routerAddress` equals `0x6131B5fae19EA4f9D964eAc0408E4408b66337b5` — abort and warn the user if it differs.
7. Build calls array:
   - **Native tokenIn** → `[swap_call]`
   - **ERC-20 tokenIn** → `[approval_call, swap_call]` — always include approval, no allowance check needed.
   - **USDT on Ethereum** — if existing allowance is non-zero, prepend a zero-approval call before the real approval.
8. `send_calls(chain, calls)` → `approvalUrl`, `requestId`.
9. Present `approvalUrl` to the user. Do not auto-approve. Call `get_request_status(requestId)` only after the user acts.

## Submission

Target tool: **`send_calls`**

Map POST /route/build output into `send_calls` as follows:

**ERC-20 tokenIn — approval + swap batch:**

```json
{
  "chain": "<chain string>",
  "calls": [
    {
      "to": "<tokenIn address>",
      "value": "0x0",
      "data": "<ERC-20 approve calldata>"
    },
    {
      "to": "0x6131B5fae19EA4f9D964eAc0408E4408b66337b5",
      "value": "<hex(transactionValue)>",
      "data": "<data from /route/build response>"
    }
  ]
}
```

**Native tokenIn — swap only:**

```json
{
  "chain": "<chain string>",
  "calls": [
    {
      "to": "0x6131B5fae19EA4f9D964eAc0408E4408b66337b5",
      "value": "<hex(transactionValue)>",
      "data": "<data from /route/build response>"
    }
  ]
}
```

`hex(transactionValue)`: `"0x" + BigInt(transactionValue).toString(16)` — `transactionValue` is a decimal wei string from the API.

**ERC-20 approval calldata encoding:**

```
Function: approve(address spender, uint256 amount)
Selector: 0x095ea7b3
spender:  000000000000000000000000{router without 0x}
amount:   {amountIn as 32-byte hex, left-padded with zeros}

Example — approve 100 USDC (amountIn = 100000000 = 0x5F5E100):
0x095ea7b3
  0000000000000000000000006131b5fae19ea4f9d964eac0408e4408b66337b5
  0000000000000000000000000000000000000000000000000000000005f5e100
```

Use chain name strings (`base`, `ethereum`, `arbitrum`, `optimism`, `polygon`, `bsc`, `avalanche`) — not numeric chain IDs. After `send_calls` returns an approval URL, follow the flow in [../references/approval-mode.md](../references/approval-mode.md).

## Example Prompts

**"Swap 100 USDC to ETH on Base"**

1. `get_wallets` → address.
2. `GET /api/v1/routes` on `base` — tokenIn=`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` (USDC, 6 dec), tokenOut=`0xEeee...eEEE`, amountIn=`100000000`.
3. Show quoted output and gas to user; confirm.
4. `POST /api/v1/route/build` → `data` (swap calldata), `transactionValue`=`"0"` → hex-encode to `"0x0"`.
5. Encode approve calldata: router spends `100000000` USDC.
6. `send_calls("base", [approval_call, swap_call])`.

**"Swap 0.1 ETH to USDC on Arbitrum"**

1. `get_wallets` → address.
2. `GET /api/v1/routes` on `arbitrum` — tokenIn=`0xEeee...eEEE`, tokenOut=`0xaf88d065e77c8cC2239327C5EDb3A432268e5831` (USDC), amountIn=`100000000000000000`.
3. Show quoted output and gas to user; confirm.
4. `POST /api/v1/route/build` → `data` (swap calldata), `transactionValue`=`"10000000000000000"` → hex-encode to `"0xde0b6b3a7640000"` (non-zero, native input).
5. No approval needed — native ETH.
6. `send_calls("arbitrum", [swap_call])` with value=transactionValue.

**"What's the best rate to swap 500 MATIC to USDC on Polygon?"** *(read-only)*

1. `get_wallets` → address.
2. `GET /api/v1/routes` on `polygon` — tokenIn=`0xEeee...eEEE`, tokenOut=`0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359` (USDC), amountIn=`500000000000000000000`.
3. Return `amountOutUsd` and `gasUsd` to the user — no transaction submitted.

## Risks & Warnings

- **Slippage** — Swaps can fill materially worse than the quoted price if market conditions shift between quote and execution. Apply the following thresholds:

  | Tolerance | Level | Action |
  |---|---|---|
  | ≤ 100 bps (1%) | Normal | Proceed. |
  | > 100 and ≤ 500 bps (5%) | Elevated | Mention the value and ask the user to confirm. |
  | > 500 and ≤ 2000 bps (20%) | High | Warn that the trade can fill significantly below quote and is a likely sandwich target. Require explicit confirmation. |
  | > 2000 bps | Very high | Strongly warn; do not submit without the user re-confirming the exact number. |

  If the user does not specify slippage, default to `50` bps for common pairs (ETH/USDC, WBTC/ETH) and `100` bps for long-tail or volatile tokens. Always pass an explicit value — the API defaults to 0 bps if `slippageTolerance` is omitted, causing most trades to fail.

## Notes

**Router address (same on all supported chains):** `0x6131B5fae19EA4f9D964eAc0408E4408b66337b5`

**Native token sentinel (ETH/BNB/MATIC/AVAX/etc.):** `0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE`

**Common token addresses:**

| Token | Chain | Address |
|---|---|---|
| USDC | Base | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| USDC | Arbitrum | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` |
| USDC | Ethereum | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` |
| USDC | Optimism | `0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85` |
| USDC | Polygon | `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359` |
| WETH | Base | `0x4200000000000000000000000000000000000006` |
| DAI | Base | `0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb` |
| cbBTC | Base | `0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf` |

KyberSwap splits trades across multiple pools when beneficial — `routeSummary` may describe a multi-hop or split route. Pass it as-is; do not modify it.

USDT on Ethereum: if existing allowance is non-zero, the approve call will revert — send a zero-approval first (`amount = 0x0...0`), then the real approval.
