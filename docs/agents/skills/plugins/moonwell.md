---
title: "Moonwell Plugin"
description: "Lend, borrow, and manage positions on Moonwell."
tags: [lending, borrowing, yield]
name: moonwell
version: 0.2.0
integration: http-api
chains: [base, optimism]
requires:
  shell: none
  allowlist: [api.moonwell.fi]
  externalMcp: null
  cliPackage: null
auth: none
risk: [liquidation]
---

# Moonwell Plugin

> [!IMPORTANT]
> Complete the short Base MCP onboarding flow defined in `SKILL.md` before calling any Moonwell endpoint. The user's wallet address — required for `prepare` and position queries — is fetched lazily when needed.

## Overview

Moonwell is a Compound v2 lending protocol on Base and Optimism. The plugin reads positions/rates and prepares unsigned calldata over the Moonwell HTTP API, then executes via `send_calls`. No additional MCP server required — everything goes through an HTTP call + `send_calls`.

**Supported chains:** Base (8453), Optimism (10).

## Surface Routing

Moonwell is HTTP-only; every capability follows the standard HTTP routing in [../references/custom-plugins.md](../references/custom-plugins.md).

| Capability | Path |
|-----------|------|
| Read markets/rates/positions/health | Harness HTTP tool if available, else `web_request` GET against `api.moonwell.fi`. |
| Prepare a lend/borrow action | Harness HTTP tool or `web_request` (GET or POST) → calldata → `send_calls`. |

## Endpoints

### Read endpoints (use web_request GET)

```
GET https://api.moonwell.fi/v1/markets?chain=base
GET https://api.moonwell.fi/v1/markets/USDC?chain=base
GET https://api.moonwell.fi/v1/rates?chain=base&asset=USDC
GET https://api.moonwell.fi/v1/yield?chain=base&sort=apy&min-tvl=1000000&limit=5
GET https://api.moonwell.fi/v1/positions/<address>?chain=base
GET https://api.moonwell.fi/v1/health/<address>?chain=base
GET https://api.moonwell.fi/v1/rewards/<address>?chain=base
GET https://api.moonwell.fi/v1/token-balance/<address>?chain=base&asset=USDC
```

Market reads are edge-cached 30 s. User-scoped reads (`positions`, `health`, `rewards`, `token-balance`) are never cached.

`/positions` returns an array — one entry per market. Use `?active=true` to filter out markets where both `suppliedUsd` and `borrowedUsd` are zero.

### Prepare endpoints (use web_request → send_calls)

Verbs: `supply`, `withdraw`, `borrow`, `repay`.

**GET form** (query params):

```
GET https://api.moonwell.fi/v1/prepare/supply?chain=base&asset=USDC&amountDecimal=100&from=<address>
```

**POST form** (JSON body — pass as the `body` object parameter to `web_request`):

```json
{
  "url": "https://api.moonwell.fi/v1/prepare/supply",
  "method": "POST",
  "headers": { "content-type": "application/json" },
  "body": { "chain": "base", "asset": "USDC", "amountDecimal": "100", "from": "<address>" }
}
```

Both return identical response shapes. Use GET when simpler; use POST when the body is complex.

#### Key parameters

| Field | Notes |
|-------|-------|
| `chain` | `base` (default), `optimism`, or chain ID |
| `asset` | Symbol: `USDC`, `WETH`, `ETH` (alias for WETH) |
| `amountDecimal` | Human-readable string, e.g. `"100"`. Use this **or** `amount` (base units), never both. |
| `from` | User's wallet address (from `get_wallets`) |

## Orchestration

```
web_request(https://api.moonwell.fi/v1/prepare/<verb>?...)
  → { data: { transactions: [ { to, data, value, chainId }, ... ] } }
      ↓
send_calls(chain, calls mapped from transactions[])
  → approvalUrl + requestId
      ↓
User approves at the returned approval URL (present as "Approve Transaction" — see ../references/approval-mode.md)
      ↓
get_request_status(requestId) → confirmed
```

Steps in `transactions[]` are ordered — `approve` and `enter-market` come before the protocol action. Execute them as a single `send_calls` batch.

## Submission

Target tool: **`send_calls`**.

A `prepare/<verb>` response returns ordered transaction steps:

```json
{
  "data": {
    "transactions": [
      { "step": "approve",          "to": "0x...", "data": "0x...", "value": "0x0", "chainId": 8453 },
      { "step": "enter-market",     "to": "0x...", "data": "0x...", "value": "0x0", "chainId": 8453 },
      { "step": "moonwell-supply",  "to": "0x...", "data": "0x...", "value": "0x0", "chainId": 8453 }
    ]
  }
}
```

Pass all items as the `calls` array to `send_calls`, mapping `chainId` from any transaction item to the Base MCP chain string (`base` for Base mainnet, `optimism` for Optimism). Then walk the approval flow (see [../references/approval-mode.md](../references/approval-mode.md)) and poll `get_request_status`.

## Example Prompts

### Supply 100 USDC on Base

```
1. get_wallets → address
2. web_request GET /token-balance/<address>?chain=base&asset=USDC  → confirm balance ≥ 100
3. web_request GET /prepare/supply?chain=base&asset=USDC&amountDecimal=100&from=<address>
4. send_calls(chain="base", calls from transactions[])
5. User approves → get_request_status(requestId)
```

### Borrow USDC against collateral

```
1. get_wallets → address
2. web_request GET /health/<address>?chain=base    → verify health > 1.5
3. web_request GET /prepare/borrow?chain=base&asset=USDC&amountDecimal=50&from=<address>
4. send_calls(chain="base", calls from transactions[])
5. User approves → get_request_status(requestId)
```

### Check positions and health

```
1. get_wallets → address
2. web_request GET /positions/<address>?chain=base&active=true  → show per-market balances
3. web_request GET /health/<address>?chain=base                 → show health factor
```

## Risks & Warnings

- **Liquidation risk.** Borrowing against collateral can be liquidated if the position's health factor falls too low. Always read `/health/<address>` before and after a borrow or withdraw, and surface the value to the user.

### Health factor guide

| Value | Status |
|-------|--------|
| `> 1.5` | Healthy |
| `1.1 – 1.5` | Caution |
| `< 1.1` | Liquidation risk |
| `null` | No borrows |

## Notes

- **mTokens** — ERC-20 receipt tokens (mUSDC, mWETH…); exchange rate accrues over time
- **WETH special-case** — borrow/withdraw deliver native ETH; supply/repay require ERC-20 WETH. Both `asset=ETH` and `asset=WETH` resolve to the same mWETH market
- **Compound v2 error codes** — `mint`, `borrow`, `repay` return non-zero codes for business-logic failures without reverting. Check the onchain receipt after broadcast
- **Base has two mUSDC entries** — the current market and a deprecated bridged-USDC market. Disambiguate by `marketAddress` or `deprecated: true`

### Chain IDs from Moonwell

| Chain | Moonwell chainId | Base MCP `chain` |
|-------|------------------|------------------|
| Base mainnet | `8453` | `base` |
| Optimism | `10` | `optimism` |
