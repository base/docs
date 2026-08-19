---
title: "o1.exchange Plugin"
description: "Token trading on o1.exchange via HTTP API → send_calls on Base, and BSC."
tags: [trading, swap, dex]
name: o1-exchange
version: 0.3.0
integration: http-api
chains: [base, bsc]
requires:
  shell: none
  allowlist: [api.o1.exchange]
  externalMcp: null
  cliPackage: null
auth: none
risk: [slippage, irreversible, low-liquidity]
---

# o1.exchange Plugin

> [!IMPORTANT]
> Run Base MCP onboarding first (see SKILL.md). Authentication is pre-configured — no setup needed.

## Overview

o1.exchange is a trading API for token swaps on Base and BSC with optional Permit2 gasless approvals. The plugin calls the o1.exchange HTTP API to build unsigned transaction calldata. Standard swaps are submitted via `send_calls` (public mempool). Permit2 swaps are submitted via `/order/complete`, which re-encodes signatures server-side and broadcasts through a private mempool relay with MEV protection. A shared API token is pre-configured for all Base MCP Plugin users — no additional authentication setup is needed.

## Auth

All requests require a Bearer token in the `Authorization` header. Use the pre-configured shared token on every request — do not ask the user for a token:

```json
{
  "Authorization": "Bearer d1fa1477bd94e988185fca9d4bbae8d22ee5cafd45d6f9b6a43ba16a8b15f4d3",
  "Content-Type": "application/json"
}
```

Include both headers on every request to `api.o1.exchange`.

The shared token does not expire. If it is revoked or rotated, a new token will be published in a plugin update.

## Surface Routing

| Capability | Surface | Execution Path |
|---|---|---|
| Build swap tx | Harness with HTTP (Claude Code, Cursor, Codex) | Harness HTTP tool → POST api.o1.exchange |
| Build swap tx | Chat-only (Claude.ai, ChatGPT) | `web_request` → POST api.o1.exchange (host must be allowlisted). **CORS caveat:** `api.o1.exchange` does not serve CORS preflight (`OPTIONS` returns 404). If `web_request` is browser-routed and triggers a preflight, the request will fail. This path works only when `web_request` is server-side proxied. |
| Build swap tx | Chat-only, not allowlisted | Inform user that `api.o1.exchange` must be added to the `web_request` allowlist; stop |
| Submit tx (standard) | Any | `send_calls` with unsigned calldata from API response |
| Submit tx (Permit2) | Any | POST `/order/complete` with Permit2 signature → server re-encodes and broadcasts via private relay |

See [custom-plugins.md](../references/custom-plugins.md) for the full HTTP routing decision tree.

## Endpoints

Base URL: `https://api.o1.exchange/api/v2`

### POST /order

Builds unsigned transaction(s) for a token swap.

**Request:**

```json
{
  "networkId": 8453,
  "signerAddress": "<wallet address>",
  "tokenAddress": "<token contract address>",
  "uiAmount": "100",
  "direction": "buy",
  "slippageBps": 300,
  "mevProtection": true
}
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `networkId` | number | Yes | `8453` (Base), `1399811149` (Solana) or `56` (BSC) |
| `signerAddress` | string | Yes | User's wallet address (`0x…`) |
| `tokenAddress` | string | Yes | Token contract address to trade |
| `uiAmount` | string | Yes | Human-readable amount (e.g. `"100"`, `"0.5"`) |
| `direction` | string | Yes | `"buy"` or `"sell"` |
| `slippageBps` | number | Yes | Slippage tolerance in basis points (100 bps = 1%) |
| `mevProtection` | boolean | Yes | Request MEV protection from the API. **Note:** MEV protection only applies when the transaction is submitted through the `/order/complete` relay (used in the Permit2 flow). Transactions submitted via `send_calls` go through the public mempool regardless of this flag. |
| `quoteTokenAddress` | string | No | Stablecoin to quote against (Base only) |
| `poolAddress` | string | No | Specific liquidity pool address (Base, Solana, BSC) |

**Response:**

```json
{
  "success": true,
  "id": "<batch-id>",
  "transactions": [
    {
      "id": "<tx-id>",
      "unsigned": "0x02f8…<RLP-encoded transaction hex>",
      "permit2": {
        "eip712": {
          "domain": { },
          "types": { },
          "values": { }
        }
      }
    }
  ]
}
```

> [!WARNING]
> **`unsigned` is a raw RLP-encoded transaction hex string**, not a structured object. You must RLP-decode it to extract the `to`, `data`, and `value` fields needed by `send_calls`. See the [RLP decoding step](#rlp-decoding) below.

`permit2` is present only when a gasless Permit2 approval is available (Base only). When absent, decode and submit the `unsigned` transaction via `send_calls`.

### POST /order/complete

Submits transactions with Permit2 signatures to the o1.exchange relay for server-side re-encoding and broadcasting through the private mempool. **Required for Permit2 swaps** — the server accepts the raw Permit2 signature, re-encodes the calldata correctly (supporting variable-length ERC-1271/6492 smart-account signatures), and broadcasts with MEV protection. Not used in the standard (non-Permit2) `send_calls` flow.

**Request:**

```json
{
  "id": "<batch-id from /order>",
  "transactions": [
    {
      "id": "<tx-id>",
      "permit2": {
        "eip712": {
          "signature": "0x<permit2 signature>"
        }
      }
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "transactions": [
    {
      "hash": "0x…",
      "status": "pending",
      "tokenDelta": "…"
    }
  ]
}
```

## RLP Decoding

The `/order` endpoint returns `transactions[].unsigned` as a raw RLP-encoded transaction hex string (e.g. `"0x02f8…"`). Before calling `send_calls`, decode the RLP to extract transaction fields.

An EIP-1559 (type `0x02`) RLP transaction decodes to the following field order:

```
[chainId, nonce, maxPriorityFeePerGas, maxFeePerGas, gasLimit, to, value, data, accessList]
```

Extract fields by position:

| Index | Field | Use |
|---|---|---|
| 0 | `chainId` | Strip (not needed for `send_calls`) |
| 1 | `nonce` | Strip |
| 2 | `maxPriorityFeePerGas` | Strip |
| 3 | `maxFeePerGas` | Strip |
| 4 | `gasLimit` | Strip |
| 5 | `to` | Pass to `send_calls` as `to` (hex address) |
| 6 | `value` | Pass to `send_calls` as `value` (hex wei) |
| 7 | `data` | Pass to `send_calls` as `data` (hex calldata) |
| 8 | `accessList` | Strip |

**Decoding steps:**

1. If `unsigned` starts with `0x02`, strip the `0x02` type prefix byte before RLP decoding (the remaining bytes are the RLP-encoded payload).
2. RLP-decode the payload into a list of fields.
3. Extract `to` (index 5), `value` (index 6), and `data` (index 7).
4. Convert `to` to a checksummed `0x`-prefixed address. Convert `value` to a `0x`-prefixed hex string (pass `"0x0"` if zero/empty). Pass `data` as the `0x`-prefixed hex string.

> [!NOTE]
> If the harness environment supports a library like `ethers.js` (`Transaction.from(unsigned)`) or Python `rlp`/`eth_account`, use that instead of manual decoding. The manual field-position approach is a fallback for LLM-driven decoding without library access.

## Orchestration

### Standard swap (no Permit2)

1. `get_wallets` → wallet address.
2. Confirm trade parameters with the user: token, amount, direction, slippage. See [Risks & Warnings](#risks--warnings) before proceeding with elevated slippage.
3. `web_request` POST `https://api.o1.exchange/api/v2/order` with auth headers and swap parameters.
4. Verify `success: true` in response.
5. [RLP-decode](#rlp-decoding) each `transactions[].unsigned` hex string to extract `to`, `data`, and `value`. Map `networkId` to chain string (`8453` → `"base"`, `56` → `"bsc"`).
6. `send_calls(chain, calls)` → `approvalUrl` + `requestId`.
7. Present the approval URL: [Approve Transaction](approvalUrl). In CLI harnesses, also auto-open the link. Do not approve on the user's behalf.
8. After the user confirms approval, call `get_request_status(requestId)` once.

### Permit2 swap (Base only)

When `transactions[].permit2` is present in the `/order` response, **do not** perform client-side signature replacement in `unsigned.data`. EOA signatures are 65 bytes, but smart-account signatures (ERC-1271/6492) are variable-length and ABI-encoded with a length prefix and offset — splicing into a fixed-size slot produces malformed calldata. Instead, submit the Permit2 signature to `/order/complete` and let the server re-encode the calldata correctly.

1. Follow steps 1–4 of the standard swap.
2. For each transaction with `permit2.eip712`: use Base MCP `sign` (type `eth_signTypedData_v4`) to sign the EIP-712 typed data → user approves → retrieve the signature.
3. `web_request` POST `https://api.o1.exchange/api/v2/order/complete` with auth headers and the batch payload:
   ```json
   {
     "id": "<batch-id from /order>",
     "transactions": [
       {
         "id": "<tx-id>",
         "permit2": {
           "eip712": {
             "signature": "0x<signature from step 2>"
           }
         }
       }
     ]
   }
   ```
4. Verify `success: true`. The server re-encodes the calldata with the actual Permit2 signature (supporting both EOA and smart-account signatures) and broadcasts through the private mempool relay with MEV protection.
5. Present the returned `transactions[].hash` to the user for tracking.

If `sign` does not support `eth_signTypedData_v4`, fall back to the standard swap path without Permit2 (no gasless approval).

## Submission

**Target tool:** `send_calls` (standard swaps only — Permit2 swaps use `/order/complete` instead; see [Permit2 swap](#permit2-swap-base-only)).

[RLP-decode](#rlp-decoding) each `transactions[].unsigned` hex string from the `/order` response, then map the extracted fields into `send_calls`:

```json
{
  "chain": "base",
  "calls": [
    {
      "to": "<decoded to>",
      "data": "<decoded data>",
      "value": "<decoded value>"
    }
  ]
}
```

- `value` is hex-encoded wei (e.g. `"0x2386f26fc10000"` = 0.01 ETH). Pass `"0x0"` if the decoded value is empty or zero.
- Only `to`, `data`, and `value` are needed — all other decoded fields (nonce, gas, chainId, etc.) are stripped.
- Chain string mapping: `networkId` `8453` → `"base"`, `56` → `"bsc"`.
- Preserve transaction ordering when multiple transactions are returned in the batch.
- **MEV note:** Transactions submitted via `send_calls` are broadcast through the public mempool. The `mevProtection` flag in the `/order` request does not provide MEV protection for this path. Only Permit2 swaps routed through `/order/complete` are broadcast via the private mempool relay.
- Follow the approval/polling flow in [approval-mode.md](../references/approval-mode.md).

## Example Prompts

**Buy 100 USDC worth of a token on Base**
1. `get_wallets` → address.
2. `web_request` POST `/order` with `networkId: 8453`, `signerAddress: <address>`, `tokenAddress: <token>`, `uiAmount: "100"`, `direction: "buy"`, `slippageBps: 300`, `mevProtection: true`.
3. RLP-decode `transactions[].unsigned` → extract `to`, `data`, `value` → `send_calls(chain="base", calls)`.
4. User approves → `get_request_status(requestId)`.

**Sell tokens on Base**
1. `get_wallets` → address.
2. `web_request` POST `/order` with `networkId: 8453`, `signerAddress: <address>`, `tokenAddress: <token>`, `uiAmount: "<amount>"`, `direction: "sell"`, `slippageBps: 300`, `mevProtection: true`.
3. RLP-decode `transactions[].unsigned` → extract `to`, `data`, `value` → `send_calls(chain="base", calls)`.
4. User approves → `get_request_status(requestId)`.

**Buy a token with tight slippage**
1. `get_wallets` → address.
2. `web_request` POST `/order` with `slippageBps: 100` (1%), `mevProtection: true`.
3. RLP-decode `transactions[].unsigned` → extract `to`, `data`, `value` → `send_calls(chain="base", calls)`.
4. User approves → `get_request_status(requestId)`.

**Swap into a specific pool on Base**
1. `get_wallets` → address.
2. `web_request` POST `/order` with `poolAddress: <pool>`, `direction: "buy"`, `slippageBps: 300`, `mevProtection: true`.
3. RLP-decode `transactions[].unsigned` → extract `to`, `data`, `value` → `send_calls(chain="base", calls)`.
4. User approves → `get_request_status(requestId)`.

## Risks & Warnings

- **Slippage** — trades can fill materially worse than expected. Default to `300` bps (3%). For volatile or low-liquidity tokens, the user may need `500`–`1000` bps. Warn before submitting slippage above `500` bps; require explicit confirmation above `1000` bps. Never silently increase slippage.
- **Irreversible** — onchain swaps cannot be undone once confirmed. Always present the trade parameters (token, amount, direction, slippage) to the user and require explicit confirmation before calling `send_calls`.
- **Low liquidity** — arbitrary tokens and pool-targeted trades (`poolAddress`) may have thin liquidity, leading to high price impact and poor fills. Warn the user when trading tokens without well-known liquidity or when targeting a specific pool. Consider suggesting smaller trade sizes or wider slippage tolerance.
- **MEV exposure** — standard swaps submitted via `send_calls` go through the public mempool and are **not** MEV-protected, even if `mevProtection: true` was set in the `/order` request. Only Permit2 swaps routed through `/order/complete` receive private mempool relay protection.

## Notes

- **Network IDs:** `8453` = Base, `56` = BSC. Solana (`1399811149`) is supported by the o1.exchange API but not by Base MCP.
- **Slippage guidance:** Normal `300` bps (3%); volatile tokens `500`–`1000` bps (5–10%); increase for large trades.
- **MEV protection:** `mevProtection: true` requests MEV protection from the API. This only takes effect when submitting through `/order/complete` (Permit2 flow). Standard swaps via `send_calls` go through the public mempool regardless. Still recommended to set `true` on all `/order` requests.
- **Permit2 signatures:** Do not perform client-side replacement of the signature placeholder in `unsigned.data`. Submit the Permit2 signature to `/order/complete` for server-side re-encoding, which correctly handles both EOA (65-byte) and smart-account (variable-length ERC-1271/6492) signatures.
- **Quote token:** `quoteTokenAddress` specifies which stablecoin to quote against (Base only). Omit to use the default.
- **Pool selection:** `poolAddress` targets a specific liquidity pool. Omit to let the API choose the best route.
- **API token:** A shared token is pre-configured for Base MCP Plugin users — no generation or setup required.
