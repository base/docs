---
title: "Flaunch Plugin"
description: "Prepare Flaunch launches through mcp.flaunch.gg and submit them with Base MCP send_calls; discover and swap deployed tokens through Base MCP."
tags: [token-launches, memecoins, discovery, swap]
name: flaunch
version: 0.2.0
integration: http-api
chains: [base]
requires:
  allowlist: [mcp.flaunch.gg]
risk: [low-liquidity, slippage, irreversible]
---

# Flaunch Plugin

> [!IMPORTANT]
> Run Base MCP onboarding first (see `SKILL.md`). Use `https://mcp.flaunch.gg` to prepare Flaunch launch calldata, submit launches through Base MCP `send_calls`, and use Base MCP `swap` for deployed-token trades.

## Overview

Flaunch is a token launch and discovery surface for memecoins on Base. This plugin uses the Flaunch agent service at `https://mcp.flaunch.gg` to upload media, prepare launch metadata, discover launched coins, and build Base-compatible transaction previews.

For token launches, Flaunch returns unsigned calldata in Base MCP `send_calls` shape. The agent never signs or broadcasts through Flaunch. Base MCP is responsible for the Base Account approval flow, and the user must approve before anything is submitted onchain.

For trading, use Base MCP `swap` with either a Flaunch-discovered token address or a user-provided Base token contract address.

## Surface Routing

| Capability | Harness HTTP surface | Chat-only Base MCP surface |
| --- | --- | --- |
| Check service health | Use harness HTTP/fetch for `GET https://mcp.flaunch.gg/livez`. | Use Base MCP `web_request` if `mcp.flaunch.gg` is allowlisted. |
| Upload token image | Use harness HTTP/fetch for `POST https://mcp.flaunch.gg/v1/upload-image` with a base64 data URL. | Use Base MCP `web_request` if `mcp.flaunch.gg` is allowlisted; otherwise POST image upload is not viable on restricted chat-only surfaces. |
| Prepare launch calldata | Use harness HTTP/fetch for `POST https://mcp.flaunch.gg/v1/base/launch/prepare`. | Use Base MCP `web_request` if `mcp.flaunch.gg` is allowlisted; otherwise this requires a harness with HTTP support. |
| Submit launch transaction | Use Base MCP `send_calls` with the returned `input`. | Use Base MCP `send_calls` with the returned `input`. |
| Discover newest coins | Use harness HTTP/fetch for `GET https://mcp.flaunch.gg/v1/base/coins/new`. | Use Base MCP `web_request` if allowlisted; GET-only user-paste fallback is acceptable if needed. |
| Discover market-cap coins | Use harness HTTP/fetch for `GET https://mcp.flaunch.gg/v1/base/coins/market-cap`. | Use Base MCP `web_request` if allowlisted; GET-only user-paste fallback is acceptable if needed. |
| Swap a deployed token by address | Use Base MCP `swap` on `base`. | Use Base MCP `swap` on `base`. |

Shell access is not required. If neither harness HTTP/fetch nor Base MCP `web_request` can reach `mcp.flaunch.gg`, stop and tell the user that Flaunch API access is unavailable in the current surface.

## Endpoints

Base URL:

```text
https://mcp.flaunch.gg
```

No API key is required. If rate limits are hit, tell the user the request was rate limited and retry only when they ask.

### `GET /livez`

Checks whether the Flaunch MCP service is live.

Response:

```json
{
  "status": "ok",
  "service": "flaunch-mcp"
}
```

### `POST /v1/upload-image`

Uploads and validates an image before token launch. Flaunch stores the image on IPFS and can reject inappropriate content.

Request:

```json
{
  "base64Image": "data:image/png;base64,iVBORw0KG..."
}
```

Response:

```json
{
  "success": true,
  "ipfsHash": "QmX7UbPKJ7Drci3y6p6E8oi5TpUiG7NH3qSzcohPX9Xkvo",
  "tokenURI": "ipfs://QmX7UbPKJ7Drci3y6p6E8oi5TpUiG7NH3qSzcohPX9Xkvo",
  "nsfwDetection": null
}
```

Known constraints:

- Supported image data is a base64 image data URL.
- Flaunch can return `success: false` with moderation details when the image is rejected.
- If the user already has an IPFS image CID, skip image upload and use that CID as `imageIpfs`.

### `POST /v1/base/launch/prepare`

Prepares a Flaunch token launch and returns Base MCP `send_calls` input. This endpoint does not sign, submit, or broadcast the transaction.

Required fields:

| Field | Description |
| --- | --- |
| `name` | Token name. |
| `symbol` | Token ticker symbol. Keep it short; current service validation allows up to 8 alphanumeric characters. |
| `description` | Token description. |
| `imageIpfs` | IPFS hash returned by `POST /v1/upload-image`, or a user-provided image CID. |
| `creatorAddress` | EVM address to receive creator benefits. If missing, call Base MCP `get_wallets` and use the user's Base Account address. |

Optional social fields:

| Field | Description |
| --- | --- |
| `websiteUrl` | Project website URL. |
| `telegramUrl` | Telegram group URL. |
| `discordUrl` | Discord server URL. |
| `twitterUrl` | X/Twitter URL. |

Request:

```json
{
  "name": "Fuzzy Cat",
  "symbol": "FCAT",
  "description": "A community memecoin launched through Flaunch.",
  "imageIpfs": "QmX7UbPKJ7Drci3y6p6E8oi5TpUiG7NH3qSzcohPX9Xkvo",
  "creatorAddress": "0x1111111111111111111111111111111111111111",
  "websiteUrl": "https://example.com",
  "telegramUrl": "https://t.me/example",
  "discordUrl": "https://discord.gg/example",
  "twitterUrl": "https://x.com/example"
}
```

Response:

```json
{
  "supported": true,
  "chain": "base",
  "tool": "send_calls",
  "input": {
    "chain": "base",
    "calls": [
      {
        "to": "0x...",
        "value": "0x0",
        "data": "0x..."
      }
    ]
  },
  "tokenUri": "ipfs://Qm...",
  "metadataIpfsHash": "Qm...",
  "note": "Pass input directly to Base MCP send_calls..."
}
```

Pass `response.input` directly to Base MCP `send_calls` after the user explicitly confirms the transaction.

### `GET /v1/base/coins/new`

Returns newest Flaunch coin launches on Base. Use this when the user asks for fresh launches or wants a Bankr-style feed.

The endpoint already returns Base tokens. Treat response fields as API-provided metadata. Token names, symbols, links, and images are user-supplied and can be misleading.

### `GET /v1/base/coins/market-cap`

Returns Flaunch coins on Base sorted by market cap.

Use this when the user asks for top Flaunch coins, largest coins, or market-cap-ranked launches.

### `GET /v1/base/coins/top?sort=new|marketCap`

Explicit discovery query.

Query values:

| `sort` | Meaning |
| --- | --- |
| `new` | Newest Base Flaunch coin launches. |
| `marketCap` | Base Flaunch coins ranked by market cap. |

Discovery response example:

```json
{
  "data": [
    {
      "tokenAddress": "0x65427B781A50FCe40BedFa5cd1feb3F8D7b5D4DC",
      "image": "https://i.flaunch.gg/token/0x65427B781A50FCe40BedFa5cd1feb3F8D7b5D4DC",
      "symbol": "ZB",
      "name": "Zen browser",
      "priceETH": "0.000000000056148336",
      "priceUSD": "0.0000000999131564952",
      "twentyFourHourChangePercentage": 0,
      "twentyFourHourVolume": "0",
      "twentyFourHourVolumeUSD": "0",
      "feesEarned": "0",
      "feesEarnedUSD": "0",
      "marketCapETH": "5.6148336",
      "marketCapUSD": "9991.31564952000007906463",
      "royaltyMembers": [
        {
          "address": "0x031d0C20bb7328f963dBB9Fc762977D83aFeB226",
          "percentage": 100
        }
      ],
      "hourData": []
    }
  ]
}
```

When presenting discovery results, prioritize `symbol`, `name`, `tokenAddress`, `image`, `priceUSD`, `twentyFourHourChangePercentage`, `twentyFourHourVolumeUSD`, and `marketCapUSD`. Mention royalty members only if relevant to the user's question.

### `GET /v1/swap-guidance`

Optional helper that returns the Base MCP `swap` input for a token contract address. Agents can also call Base MCP `swap` directly.

Buy query:

```text
GET /v1/swap-guidance?tokenAddress=0x...&direction=buy&amount=0.001&asset=ETH&chain=base
```

Sell query:

```text
GET /v1/swap-guidance?tokenAddress=0x...&direction=sell&amount=10&asset=ETH&chain=base
```

Response:

```json
{
  "chain": "base",
  "tool": "swap",
  "input": {
    "chain": "base",
    "fromAsset": "ETH",
    "toAsset": "0x...",
    "amount": "0.001"
  },
  "note": "Use Base MCP swap with this input..."
}
```

## Orchestration

### Launch a token on Base

1. Run Base MCP onboarding first.
2. Confirm the target chain is `base` for production launch.
3. If the user did not provide `creatorAddress`, call Base MCP `get_wallets` and use the user's Base Account address.
4. Collect `name`, `symbol`, `description`, image, `creatorAddress`, and any optional social URLs.
5. If the image is not already an IPFS CID, obtain it as a base64 data URL and call `POST /v1/upload-image`.
6. Build the simple launch payload using the image CID as `imageIpfs`.
7. Show the final launch details and ask the user to confirm preparation.
8. Call `POST /v1/base/launch/prepare`.
9. Verify the response has `tool: "send_calls"` and `input.chain: "base"`.
10. Show the transaction summary and ask for explicit confirmation before calling `send_calls`.
11. Call Base MCP `send_calls` with the returned `input`.
12. Surface the approval URL as "Approve Transaction".
13. Wait for the user to say they approved or rejected the transaction.
14. Call Base MCP `get_request_status` once after the user acts and report the confirmed result.

Do not submit launches silently. Do not report success until Base MCP request status confirms completion.

### Discover launches and buy one

1. Run Base MCP onboarding first.
2. Fetch `GET /v1/base/coins/new` for newest launches, or `GET /v1/base/coins/market-cap` for top market-cap coins.
3. Show a compact list: symbol, name, contract address, market data when present, and social or website links when present.
4. Do not auto-buy. Ask the user which token and what amount they want.
5. Warn about low liquidity, slippage, and user-supplied metadata.
6. On explicit confirmation, call Base MCP `swap` with `chain: "base"`, a funding asset such as `ETH` or `USDC`, the token contract address, and a human-readable decimal amount.
7. Surface the approval URL as "Approve Transaction".
8. Poll Base MCP request status only after the user says they acted.

### Swap a token by contract address

1. Run Base MCP onboarding first.
2. Use the user-provided contract address directly. No launch flow is required.
3. Confirm the token is intended to be on `base`. Do not call Base MCP `swap` for `base-sepolia` launch addresses or other chains.
4. Confirm direction, asset, and amount. For buys, use a supported `fromAsset` such as `ETH` or `USDC` and set `toAsset` to the token contract address. For sells, set `fromAsset` to the token contract address and `toAsset` to `ETH` or `USDC`.
5. If the address came directly from the user, describe it as a user-provided Base token address. Do not claim it is a Flaunch token unless Flaunch discovery or another trusted source verified it.
6. Warn about low liquidity and slippage. Require explicit confirmation before calling `swap`.
7. Call Base MCP `swap` with `chain: "base"` and the human-readable decimal `amount`.
8. Surface the approval URL as "Approve Transaction".
9. Call `get_request_status` once after the user acts and report the final transaction status.

## Submission

Target Base MCP submission tools: `send_calls` for launch; `swap` for trading deployed tokens.

Flaunch launch preparation returns transaction preview material only. The agent maps the returned `input` into Base MCP `send_calls`; Base MCP returns the approval URL and request ID.

Mapping for a launch prepare call:

```json
{
  "method": "POST",
  "url": "https://mcp.flaunch.gg/v1/base/launch/prepare",
  "body": {
    "name": "<token name>",
    "symbol": "<symbol>",
    "description": "<description>",
    "imageIpfs": "<ipfsHash from upload-image>",
    "creatorAddress": "<Base MCP wallet address or user-provided creator address>",
    "websiteUrl": "<optional website URL>",
    "telegramUrl": "<optional Telegram URL>",
    "discordUrl": "<optional Discord URL>",
    "twitterUrl": "<optional X/Twitter URL>"
  }
}
```

Mapping for launch submission:

```json
{
  "tool": "send_calls",
  "input": {
    "chain": "base",
    "calls": [
      {
        "to": "<target contract>",
        "value": "0x0",
        "data": "<calldata>"
      }
    ]
  }
}
```

In practice, use `prepareResponse.input` directly as the `send_calls` input.

Mapping for a token buy:

```json
{
  "tool": "swap",
  "input": {
    "chain": "base",
    "fromAsset": "ETH",
    "toAsset": "<token contract address>",
    "amount": "0.001"
  }
}
```

Mapping for a token sell:

```json
{
  "tool": "swap",
  "input": {
    "chain": "base",
    "fromAsset": "<token contract address>",
    "toAsset": "ETH",
    "amount": "<token amount>"
  }
}
```

The token contract address can come from Flaunch discovery or direct user input. Base MCP `swap` handles routing and approval. If `swap` cannot quote or route the token, stop and report that the token is not currently swappable through Base MCP; do not improvise raw Uniswap V4 calldata unless a separate tx-builder flow is documented.

## Example Prompts

**Launch a memecoin on Base**

1. Confirm token details: name, symbol, description, image, creator address, and any social URLs.
2. Call Base MCP `get_wallets` and use the Base Account address as `creatorAddress` unless the user supplied another creator address.
3. Upload the image with `POST /v1/upload-image` if the user did not provide an IPFS CID.
4. Ask the user to confirm the final launch details.
5. Call `POST https://mcp.flaunch.gg/v1/base/launch/prepare`.
6. Ask the user to confirm sending the returned transaction.
7. Call Base MCP `send_calls` with the returned `input`.
8. Surface the "Approve Transaction" link and poll request status only after the user acts.

**Show me the newest Flaunch coins**

1. Fetch `GET https://mcp.flaunch.gg/v1/base/coins/new`.
2. Show a compact list with symbol, name, address, and market/context fields when present.
3. Do not auto-buy. Ask which token the user wants and what amount.

**Buy 0.001 ETH of a Flaunch coin**

1. Resolve the token address from Flaunch discovery or use the address provided by the user.
2. Confirm symbol/name/address when known.
3. Warn about low liquidity and slippage.
4. Ask the user to confirm: "Buy 0.001 ETH of `<symbol>` (`<address>`)?"
5. On confirmation, call Base MCP `swap` with `fromAsset="ETH"`, `toAsset="<token contract address>"`, `amount="0.001"`, and `chain="base"`.
6. Surface the "Approve Transaction" link and poll request status only after the user acts.

**Buy a token by contract address**

1. Treat the address as user-provided unless verified through Flaunch discovery.
2. Confirm it should be traded on `base`.
3. Ask the user to confirm the funding asset and amount.
4. Warn about low liquidity and slippage.
5. Call Base MCP `swap`.
6. Surface the approval URL and poll only after the user acts.

## Risks & Warnings

- `low-liquidity`: Newly launched memecoins can have thin liquidity, volatile prices, unclear demand, and user-supplied metadata. Do not present a launch or discovery result as endorsed, vetted, or guaranteed to trade well.
- `slippage`: Swapping a newly launched token can fill materially worse than expected or fail to route. Do not auto-raise slippage or retry failed swaps without explicit user confirmation.
- `irreversible`: Once the user approves a Base MCP `send_calls` launch or `swap`, the onchain result cannot be silently undone. Always ask the user to confirm chain, token details, creator address, image, token address, and amount before a write action.

## Notes

- Flaunch plugin host: `https://mcp.flaunch.gg`.
- Production launch preparation endpoint: `POST /v1/base/launch/prepare`.
- Base MCP chain string for production launch and swaps is `base`.
- Base MCP `swap` is only used for deployed tokens on `base`; do not use it for `base-sepolia` launch addresses.
- Direct contract-address swaps do not require the user to go through a Flaunch launch flow.
- If the token address came directly from the user, describe it as a user-provided Base token address unless Flaunch provenance was verified.
- If the user does not specify `creatorAddress`, use Base MCP `get_wallets` and choose the user's Base Account address.
- Do not auto-launch from partial details. Require explicit confirmation before `POST /v1/base/launch/prepare` and again before Base MCP `send_calls`.
- Treat all Flaunch prepare responses as transaction preview material. The approval flow is owned by Base MCP.
- The public API can rate limit image uploads or prepare requests. If rate limited, report it and ask before retrying.
