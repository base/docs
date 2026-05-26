---
title: "Avantis Plugin"
description: "Skill plugin reference for trading perpetual futures on Avantis from CLI harnesses through Base MCP."
---

# Avantis Plugin

> [!IMPORTANT]
> Complete the short Base MCP onboarding flow defined in `SKILL.md` before calling any Avantis endpoint. The user's wallet address — used as `trader` in every tx-builder call — is fetched lazily when needed.

> [!WARNING]
> ## CLI-only plugin
>
> This plugin fetches Avantis tx-builder calldata from a CLI-capable harness, then submits the unsigned call through Base MCP's `send_calls`. It only works in harnesses with shell/terminal or direct HTTP access, such as Codex, Claude Code, Cursor terminal, or similar CLI-enabled environments. It does not work on chat-only surfaces such as ChatGPT or Claude.ai. If the current surface has no shell or direct HTTP tool, tell the user this Avantis plugin requires CLI access and stop.

Avantis is a perpetual futures DEX on Base mainnet (`chainId` 8453). Use a harness HTTP tool such as `curl`, `fetch`, or a shell command to fetch unsigned calldata from the Avantis tx-builder, then preview or execute it with Base MCP `send_calls`.

Do not sign, approve, or submit transactions unless the user explicitly asks. Generating calldata and `send_calls` approval links is safe, but the user must approve any real transaction.

Prerequisite: the harness must be able to call `tx-builder.avantisfi.com`, `data.avantisfi.com`, `core.avantisfi.com`, and `api.avantisfi.com` directly. Do not route Avantis through Base MCP `web_request` or a user-paste fallback.

No API key or Authorization header is required for the documented public endpoints.

---

## API Services

| Service | Base URL | Purpose |
| --- | --- | --- |
| tx-builder | `https://tx-builder.avantisfi.com` | GET-only unsigned calldata builder for Avantis Trading and USDC calls |
| data | `https://data.avantisfi.com/v2/trading` | Pair configs, leverage rules, fees, open interest, market status |
| core | `https://core.avantisfi.com` | Current open positions, limit orders, and open interest |
| history | `https://api.avantisfi.com` | Closed/all trade history, PnL, referral stats, market-order settlement status |

Source of truth for tx-builder shape:

```
GET https://tx-builder.avantisfi.com/openapi.json
GET https://tx-builder.avantisfi.com/docs
```

---

## Base-Only Rules

- All tx-builder calldata is for Base mainnet only.
- All tx-builder responses return `chainId: 8453`.
- There is no supported chain selector query parameter.
- Collateral is USDC only. ETH is used only for gas and Avantis execution fee `value`.
- Canonical Base USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`.
- Default USDC spender is Avantis `TradingStorage`: `0x8a311D7048c35985aa31C131B9A13e03a5f7422d`.

Fetch current contract addresses when needed:

```
GET https://tx-builder.avantisfi.com/addresses
```

---

## tx-builder Response Shape

All calldata-producing tx-builder endpoints return an envelope:

```json
{
  "ok": true,
  "data": {
    "to": "0x44914408af82bC9983bbb330e3578E1105e11d4e",
    "from": "0x1111111111111111111111111111111111111111",
    "data": "0x19cde9a1...",
    "value": "0x13e52b9abe000",
    "chainId": 8453,
    "description": "Open long BTC/USD 10x with 100 USDC (market)",
    "meta": {}
  }
}
```

Only `response.data.to`, `response.data.value`, and `response.data.data` are passed to Base MCP `send_calls`.

```json
{
  "chain": "base",
  "calls": [
    {
      "to": "<response.data.to>",
      "value": "<response.data.value>",
      "data": "<response.data.data>"
    }
  ]
}
```

`from` is informational and identifies who must sign. If `delegate=` is used, `from` becomes the delegate address. `nonce` and gas fields are intentionally omitted; the wallet manages them.

---

## Units And Scaling

tx-builder request inputs use human decimals:

| Surface | Unit behavior |
| --- | --- |
| tx-builder `collateralUsdc`, `amountUsdc`, `openPrice`, `takeProfit`, `stopLoss`, `leverage`, `slippagePercent` | Human decimals, not raw scaled integers |
| data API `/v2/trading` | Human decimals |
| core `/user-data` positions and limit orders | Raw strings: USDC fields divide by `1e6`, price and leverage fields divide by `1e10` |
| history API | Mixed, mostly human decimals; check each endpoint shape |
| tx-builder response `value` | Hex wei string |

Do not pass `1e6` USDC base units or `1e10` price units to tx-builder query parameters.

---

## Orchestration Pattern

For an open trade:

```
get_wallets -> trader address
HTTP GET /v2/trading -> validate pair, market status, leverage, and min position
HTTP GET /user-data?trader=... -> inspect existing positions/orders
HTTP GET /token/approve if allowance may be missing -> send_calls preview
HTTP GET /trade/open -> send_calls preview
poll /v2/market-order-initiated/status/<txHash> only after a real tx is submitted
HTTP GET /user-data?trader=... -> confirm final state only after execution
```

For management actions (close, cancel, margin, TP/SL), always read `core /user-data` first and use a real `positions[].index` or `limitOrders[].index`. The tx-builder can encode calldata for a requested index even if that position/order does not exist, so preflight is required to avoid likely reverts.

---

## Step 1 - Validate Pair, Leverage, Liquidity

```
GET https://data.avantisfi.com/v2/trading
```

Top-level shape:

```json
{
  "dataVersion": 1.5,
  "pairInfos": { "1": {} },
  "groupInfo": { "0": {} },
  "pairCount": 102
}
```

Use `pairInfos["<pairIndex>"]` to inspect a pair. Important fields:

| Field | Meaning |
| --- | --- |
| `index` | Pair index used by tx-builder and onchain calls |
| `from`, `to` | Symbol components, for example `BTC` and `USD` |
| `isPairListed` | Must be true to open new trades |
| `leverages.minLeverage`, `leverages.maxLeverage` | Fixed-fee leverage envelope for `market`, `limit`, `stop_limit` |
| `leverages.pnlMinLeverage`, `leverages.pnlMaxLeverage` | ZFP leverage envelope for `market_zero_fee` |
| `pairMinLevPosUSDC` | Minimum notional: `collateralUsdc * leverage` |
| `pairOI`, `pairMaxOI` | Pair open interest and cap |
| `groupIndex` | Lookup key into `groupInfo` |
| `feed.attributes.is_open` or `feed.attributes.isOpen` | Market-open flag |
| `lazerFeed.state` | `stable` generally maps to `priceSourcing=1` for Lazer endpoints |

Minimum position check (BELOW_MIN_POS):

The tx-builder rejects with `400 BAD_REQUEST` when `collateralUsdc * leverage < pairMinLevPosUSDC`. This is the `BELOW_MIN_POS` condition. Always validate before calling `/trade/open`:

```
positionSize = collateralUsdc * leverage
if positionSize < pair.pairMinLevPosUSDC -> BELOW_MIN_POS error, increase collateral or leverage
```

To compute the minimum collateral required for a given leverage:

```
minCollateral = ceil(pair.pairMinLevPosUSDC / leverage)
```

Example: `pairMinLevPosUSDC=100`, `leverage=10` → minimum `collateralUsdc` is `10`. With `leverage=1` → minimum is `100`.

Liquidity check:

```
pairAvailable = pairMaxOI - pairOI
groupAvailable = groupInfo[pair.groupIndex].groupMaxOI - groupInfo[pair.groupIndex].groupOI
available = min(pairAvailable, groupAvailable)
positionSize = collateralUsdc * leverage
```

For BTC/USD around a small test amount, `collateralUsdc=1` and `leverage=100` can satisfy the 100 USDC minimum notional for `market_zero_fee` when 100x is inside the ZFP leverage range.

---

## Step 2 - Check User Positions And Limit Orders

```
GET https://core.avantisfi.com/user-data?trader=<address>
```

Response:

```json
{
  "positions": [],
  "limitOrders": []
}
```

Key fields:

| Field | Scaling | Use |
| --- | --- | --- |
| `pairIndex` | none | tx-builder `pairIndex` |
| `index` | none | tx-builder `tradeIndex` |
| `buy` | none | `true` is long, `false` is short |
| `collateral` | divide by `1e6` | Use as `collateralUsdc` when closing full size |
| `leverage` | divide by `1e10` | Display and validation |
| `openPrice`, `tp`, `sl`, `liquidationPrice` | divide by `1e10` | Display and TP/SL decisions |
| `isPnl` | none | true means ZFP trade |

Unknown or malformed traders can return empty arrays rather than an error.

---

## Step 3 - Approve USDC

Exact approval:

```
GET https://tx-builder.avantisfi.com/token/approve
  ?trader=<address>
  &amountUsdc=1
```

Unlimited approval:

```
GET https://tx-builder.avantisfi.com/token/approve?trader=<address>
```

Optional custom spender:

```
GET https://tx-builder.avantisfi.com/token/approve
  ?trader=<address>
  &amountUsdc=100
  &spender=<address>
```

`spender` defaults to `TradingStorage`. Pass the returned `response.data` call to `send_calls`. Approval must be confirmed onchain before trade calls that require allowance can succeed, unless approval and action are submitted as a valid batch and the wallet/account contract supports the batch.

---

## Step 4 - Open A Trade

```
GET https://tx-builder.avantisfi.com/trade/open
  ?trader=<address>
  &pair=BTC/USD
  &side=long
  &orderType=market
  &collateralUsdc=100
  &leverage=10
  &slippagePercent=1
```

Parameters:

| Parameter | Required | Notes |
| --- | --- | --- |
| `trader` | yes | EVM address that owns the position |
| `pair` or `pairIndex` | yes | Pair symbols accept `/`, `-`, or `_`, for example `BTC/USD`, `btc-usd`, `BTC_USD` |
| `side` | yes | `long` or `short` |
| `orderType` | no | `market`, `limit`, `stop_limit`, or `market_zero_fee`; default is `market` |
| `collateralUsdc` | yes | Human-decimal USDC, must be greater than zero |
| `leverage` | yes | Human multiplier; pair envelope is enforced |
| `slippagePercent` | no | Human percent, default `1`; must be greater than 0 and `<= 100` |
| `openPrice` | required for limit/stop_limit | Human-decimal price; optional market override |
| `takeProfit` | no | Human-decimal TP price |
| `stopLoss` | no | Human-decimal SL price |
| `executionFeeEth` | no | Default about `0.00035` ETH; max 1 ETH |
| `delegate` | no | Wraps call in `Trading.delegatedAction(trader, calldata)` |
| `skipValidation` | no | `true` bypasses pre-trade checks; avoid unless explicitly requested |

Order types:

| `orderType` | Meaning |
| --- | --- |
| `market` | Fixed-fee market open; price is auto-resolved if `openPrice` omitted |
| `limit` | Limit order; `openPrice` required |
| `stop_limit` | Stop-limit order; `openPrice` required |
| `market_zero_fee` | Zero-Fee Protocol / ZFP market open; uses `pnlMinLeverage` and `pnlMaxLeverage` |

Example ZFP around a small notional:

```
GET https://tx-builder.avantisfi.com/trade/open
  ?trader=<address>
  &pair=BTC/USD
  &side=long
  &orderType=market_zero_fee
  &collateralUsdc=1
  &leverage=100
  &slippagePercent=1
```

Example limit:

```
GET https://tx-builder.avantisfi.com/trade/open
  ?trader=<address>
  &pair=BTC/USD
  &side=long
  &orderType=limit
  &openPrice=90000
  &collateralUsdc=2
  &leverage=50
  &takeProfit=100000
  &stopLoss=80000
```

---

## Step 5 - Close, Cancel, Margin, TP/SL

Read `core /user-data` first. Use real indices from the returned arrays.

Close full or partial collateral:

```
GET https://tx-builder.avantisfi.com/trade/close
  ?trader=<address>
  &pairIndex=<positions[i].pairIndex>
  &tradeIndex=<positions[i].index>
  &collateralUsdc=<human decimal collateral to close>
```

Cancel a resting limit or stop-limit order:

```
GET https://tx-builder.avantisfi.com/trade/cancel
  ?trader=<address>
  &pairIndex=<limitOrders[i].pairIndex>
  &tradeIndex=<limitOrders[i].index>
```

Deposit or withdraw margin:

```
GET https://tx-builder.avantisfi.com/margin/update
  ?trader=<address>
  &pairIndex=<positions[i].pairIndex>
  &tradeIndex=<positions[i].index>
  &action=deposit
  &collateralUsdc=1
```

`action` is `deposit` or `withdraw`. If `priceUpdateData` and `priceSourcing` are omitted, tx-builder fetches required Pyth bytes server-side.

Set TP and SL together:

```
GET https://tx-builder.avantisfi.com/tpsl/update
  ?trader=<address>
  &pairIndex=<positions[i].pairIndex>
  &tradeIndex=<positions[i].index>
  &takeProfit=100000
  &stopLoss=80000
```

`takeProfit` is required and must be greater than zero. `stopLoss` is required; pass `stopLoss=0` to clear SL.

Open limit order modification is not exposed as a current tx-builder endpoint. To replace a resting limit order, cancel the existing order with `/trade/cancel`, then create a new `/trade/open` limit or stop-limit order.

---

## Delegated Trading

Set a delegate:

```
GET https://tx-builder.avantisfi.com/delegate/set
  ?trader=<address>
  &delegate=<delegateAddress>
```

Remove a delegate:

```
GET https://tx-builder.avantisfi.com/delegate/remove?trader=<address>
```

After a delegate is set, trade-side tx-builder endpoints accept `delegate=<delegateAddress>`. The response `from` becomes the delegate, and the delegate signs/broadcasts. The position still belongs to `trader`.

---

## Batching With send_calls

`send_calls` accepts multiple Base calls:

```json
{
  "chain": "base",
  "calls": [
    {
      "to": "<approve.data.to>",
      "value": "<approve.data.value>",
      "data": "<approve.data.data>"
    },
    {
      "to": "<open.data.to>",
      "value": "<open.data.value>",
      "data": "<open.data.data>"
    }
  ]
}
```

Useful preview batches:

- Approval plus open trade.
- Approval plus margin deposit.
- Cancel resting order plus create replacement limit order.
- Multiple independent generated calls, if all are Base calls and logically safe to preview together.

Keep approval before the action that needs allowance. Do not combine calls from different chains.

---

## Settlement Polling

Market opens and closes settle after the submitted transaction emits an initiated event. Only poll when you have a real tx hash from a submitted transaction.

```
GET https://api.avantisfi.com/v2/market-order-initiated/status/<txHash>
```

Expected logical statuses:

- `executed`
- `canceled`
- `pending`

Unknown hashes can return HTTP 200 with:

```json
{
  "success": false,
  "errorMessage": "Market order not found for the given transaction hash"
}
```

Use exponential backoff and stop after a reasonable timeout. Do not claim a position opened or closed until onchain state or the settlement API confirms it.

---

## Query Trade History And PnL

History endpoints use a legacy envelope:

```json
{ "success": true }
{ "success": false, "errorMessage": "..." }
```

Always check `success` before reading data.

| Endpoint | Purpose |
| --- | --- |
| `GET https://api.avantisfi.com/v2/history/portfolio/history/<address>/0/20` | Closed trades, paginated; limit max 20 |
| `GET https://api.avantisfi.com/v2/history/portfolio/all/<address>/0/20` | All trades, open and closed |
| `GET https://api.avantisfi.com/v2/history/portfolio/top/<address>` | Top 3 by net PnL |
| `GET https://api.avantisfi.com/v2/history/portfolio/top/<address>/5` | Top N by net PnL |
| `GET https://api.avantisfi.com/v2/history/portfolio/profit-loss/<address>` | Aggregate PnL |
| `GET https://api.avantisfi.com/v2/history/portfolio/profit-loss/<address>/grouped` | Aggregate PnL by pair |
| `GET https://api.avantisfi.com/v2/history/referral/stats/<address>` | Referral stats |

Observed edge case: for a wallet with no visible portfolio, some history endpoints may return `success:false` with `Unable to get the portfolio.` while others return `success:true` with empty data. Treat this as an empty/unknown portfolio unless the user expected existing history.

PnL convention:

- For ZFP trades, prefer `_mapped_netPnl` where present.
- For fixed-fee trades, prefer `_mapped_grossPnl` where present.

---

## Error Handling

tx-builder errors:

```json
{
  "ok": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Position size 0.01 USDC is below the minimum of 100 USDC for BTC/USD (collateral 0.01 x leverage 1)"
  }
}
```

Common tx-builder error codes:

| Code | Meaning |
| --- | --- |
| `VALIDATION_ERROR` | Query shape problem: bad address, missing required field, numeric range error |
| `BAD_REQUEST` | Domain validation failed: min position, leverage envelope, liquidity, invalid TP/SL |
| `UPSTREAM_ERROR` | Data or price feed dependency failed |
| `NOT_FOUND` | Unknown route or pair index |
| `INTERNAL_ERROR` | Unexpected service error |

Recommended handling:

- Surface validation messages directly.
- For `/trade/open`, inspect `meta.validation` on success and show the user the position size, min position, leverage envelope, and available liquidity when useful.
- For history endpoints, check `success`; if false, show `errorMessage`.
- For management actions, do not rely on tx-builder to prove the position/order exists. Verify with `core /user-data`.

BELOW_MIN_POS recovery:

When the error message indicates a minimum position violation (`collateral * leverage < pairMinLevPosUSDC`), do not retry blindly. Compute what is needed and suggest corrections:

```
minPositionUsdc = pair.pairMinLevPosUSDC   // from data API or meta.validation.minPositionUsdc
minCollateral   = ceil(minPositionUsdc / requestedLeverage)
minLeverage     = ceil(minPositionUsdc / requestedCollateral)
```

Present the user with concrete options: increase collateral to `minCollateral`, increase leverage to `minLeverage` (within the pair envelope), or both. Do not silently adjust parameters without user confirmation.

---

## Current tx-builder Endpoint Inventory

| Endpoint | Calldata? | Purpose |
| --- | --- | --- |
| `GET /` | No | Service index |
| `GET /health` | No | Health and chainId |
| `GET /addresses` | No | Contract addresses |
| `GET /pairs` | No | Pair summaries |
| `GET /pairs/<index>` | No | Single pair details |
| `GET /trade/open` | Yes | Open market, ZFP, limit, or stop-limit trade |
| `GET /trade/close` | Yes | Close a trade |
| `GET /trade/cancel` | Yes | Cancel a resting limit or stop-limit order |
| `GET /margin/update` | Yes | Deposit or withdraw collateral |
| `GET /tpsl/update` | Yes | Update TP and SL |
| `GET /delegate/set` | Yes | Set delegate |
| `GET /delegate/remove` | Yes | Remove delegate |
| `GET /token/approve` | Yes | Approve USDC |
| `GET /docs` | No | Swagger UI |
| `GET /openapi.json` | No | OpenAPI spec |
