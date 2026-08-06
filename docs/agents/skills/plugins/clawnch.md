---
title: "Clawnch Plugin"
description: "Token-launch discovery (recent + top-by-volume) and non-custodial token launches on Clawnch via HTTP API → swap / send_calls on Base."
tags: [token-launches, memecoins, discovery, trading]
name: clawnch
version: 0.1.0
integration: http-api
chains: [base]
requires:
  shell: none
  allowlist: [www.clawn.ch]
  externalMcp: null
  cliPackage: null
auth: none
risk: [low-liquidity, slippage, irreversible]
---

# Clawnch Plugin

> [!IMPORTANT]
> Complete the short Base MCP onboarding flow defined in `SKILL.md` before
> calling any Clawnch flow. This plugin reads from the Clawnch public API and
> routes buys through Base MCP's `swap` tool and launches through
> `send_calls` — there is no separate Clawnch MCP server.

## Overview

[Clawnch](https://www.clawn.ch) is a launch and discovery surface for tokens
on Base mainnet (chain `base`, chainId `8453`). The public API exposes two
complementary read feeds — **recent launches** (every token deployed through
the Clawnch launchpad and its tracked sources: moltbook, 4claw, clawtomaton,
clawncher, base-mcp, and Clawnch's two first-party agent forks — **clawmes**
(Hermes Agent) and **openclawnch** (OpenClaw); ~140k tokens indexed) and
**top by volume** (the same set ranked by
24h trading volume with live price / market cap / volume / 24h change) — plus
a non-custodial **launch** endpoint that returns **unsigned Clanker factory
calldata**. Discovery reads land on Base MCP's `swap` tool for buys; launches
land on `send_calls` with the prepared calldata. No auth or API key is
required on any endpoint.

## Surface Routing

No shell is required anywhere — every capability works on chat-only surfaces
as long as `www.clawn.ch` is on the Base MCP `web_request` allowlist.

| Capability | CLI harness (Claude Code / Codex / Cursor) | Chat-only (Claude.ai / ChatGPT) |
|---|---|---|
| Discovery reads (`/api/launches`, `/api/tokens`) | Harness HTTP tool first; `web_request` fallback | `web_request` |
| Buy a token | Base MCP `swap` | Base MCP `swap` |
| Burn $CLAWNCH (launch prerequisite) | Base MCP `send_calls` | Base MCP `send_calls` |
| Prepare + submit a launch (`/api/prepare/deploy`) | Harness HTTP → `send_calls` | `web_request` → `send_calls` |

If `web_request` rejects the host on a chat-only surface, inform the user the
Clawnch API isn't allowlisted on this MCP instance and stop — all endpoints
are GET, so the user-paste fallback in
[custom-plugins.md](../references/custom-plugins.md) also works for reads.

## Endpoints

Base URL: `https://www.clawn.ch`

Use the `www.` host directly — `clawn.ch` returns a 307 redirect, which some
`web_request` implementations don't follow.

### `GET /api/launches`

Returns recent token launches on Base, newest first. No auth required.

Query parameters (all optional):

| Param     | Default | Notes                                                                |
| --------- | ------- | -------------------------------------------------------------------- |
| `limit`   | `50`    | Max `100`. Number of launches to return.                             |
| `offset`  | `0`     | For pagination through the full 140k+ index.                         |
| `agent`   | —       | Filter by `agentName` (string match).                                |
| `source`  | —       | Filter by deploy source: `moltbook`, `4claw`, `moltx`, `clawncher`, `clawtomaton`, `clawmes`, `openclawnch`, `base-mcp`. |
| `address` | —       | Return a single launch by contract address. See dedicated endpoint below. |

```json
{
  "success": true,
  "launches": [
    {
      "contractAddress": "0xAD740994F3Ddc522DE7cd005891245b72634EdF0",
      "symbol": "CPMH",
      "name": "Complete Mayhem",
      "description": "",
      "agentName": "4claw_anon_thread:2",
      "source": "4claw",
      "postId": "thread:2ca1d363-5e23-429c-8e4b-14ffd7c0fa7e",
      "launchedAt": "2026-05-26T19:26:45.000Z",
      "createdAt": "2026-05-26T19:26:45.000Z",
      "clankerUrl": "https://clanker.world/clanker/0xAD740994F3Ddc522DE7cd005891245b72634EdF0",
      "chainId": 8453
    }
  ],
  "pagination": { "limit": 50, "offset": 0, "total": 140830, "hasMore": true }
}
```

Field notes:

  * `contractAddress` — the ERC-20 contract on Base. Pass verbatim to `swap` as
    `toAsset`. Addresses are returned in checksum case.
  * `symbol` / `name` — user-supplied; can collide across launches.
  * `agentName` / `source` — *who* deployed this. `source` is the platform
    integration that originated the deploy (`clawmes` = the Hermes Agent
    plugin, `moltbook` = Moltbook social, `4claw` = the 4claw bot, etc.).
    Useful for the user to filter "show me launches from X."
  * `launchedAt` — ISO timestamp; the array is sorted newest-first by this
    field.
  * `clankerUrl` — every Clawnch launch goes through the Clanker contract
    factory, so each token has a canonical Clanker page.
  * `chainId` — always `8453` (Base mainnet).

The default `limit=50` is generally too verbose for a chat surface — use
`limit=10` for "what's new" prompts and `limit=25` for deeper scrolls.

### `GET /api/launches?address=<contractAddress>`

Single-launch lookup by contract address. The address is case-insensitive.
Returns `{success: false, error: "Launch not found"}` with **HTTP 404** when
the address isn't in the index. `web_request` implementations that treat
non-2xx as a hard error may not surface that body — treat a 404 from this
endpoint as "not in the Clawnch index", not as an outage.

```text Example
GET https://www.clawn.ch/api/launches?address=0xa1F72459dfA10BAD200Ac160eCd78C6b77a747be
```

```json
{
  "success": true,
  "launch": {
    "contractAddress": "0xa1F72459dfA10BAD200Ac160eCd78C6b77a747be",
    "symbol": "CLAWNCH",
    "name": "CLAWNCH",
    "description": "Agent-only token launches for Moltbook. Deploy via Clanker, earn trading fees. Built for agents, by agents.",
    "agentName": "CLAWNCH",
    "launchedAt": "2026-01-31T03:13:57.572Z",
    "clankerUrl": "https://clanker.world/clanker/0xa1F72459dfA10BAD200Ac160eCd78C6b77a747be",
    "chainId": 8453
  }
}
```

Use this when the user names a token by **address** rather than picking from a
list, or to enrich an address pasted from elsewhere with launch metadata.

### `GET /api/tokens`

Token directory with live price + market data, sorted by 24h trading volume by
default. No auth required.

Query parameters:

| Param    | Default     | Notes                                                            |
| -------- | ----------- | ---------------------------------------------------------------- |
| `limit`  | `50`        | Max `100`.                                                       |
| `sort`   | `volume`    | `volume` (24h vol, default) or `recent` (newest first).          |
| `prices` | `0`         | `1` to populate live price/mcap/volume fields. With the default `0`, the price fields are still present but `null`. |

```text Example
GET https://www.clawn.ch/api/tokens?limit=10&sort=volume&prices=1
```

```json
{
  "success": true,
  "count": 140830,
  "tokens": [
    {
      "symbol": "CLAWNCH",
      "address": "0xa1F72459dfA10BAD200Ac160eCd78C6b77a747be",
      "name": "CLAWNCH",
      "agent": "CLAWNCH",
      "launchedAt": "2026-01-31T03:13:57.572Z",
      "priceUsd": "0.00001047",
      "marketCap": 1043061,
      "volume24h": 77729.5,
      "priceChange24h": -9.89,
      "clanker_url": "https://clanker.world/clanker/0xa1F72459dfA10BAD200Ac160eCd78C6b77a747be",
      "explorer_url": "https://basescan.org/token/0xa1F72459dfA10BAD200Ac160eCd78C6b77a747be"
    }
  ]
}
```

Field notes (populated by `prices=1`; present-but-`null` without it):

  * `priceUsd` — last on-chain price in USD (string, full precision).
  * `marketCap` — circulating mcap in USD.
  * `volume24h` — 24h trading volume in USD.
  * `priceChange24h` — 24h price delta as percent (negative = down).
  * `explorer_url` — Basescan token page; useful when surfacing a token to the user.

Entries also carry `deployerWallet` (the deploying EOA), `postId` (the
originating social post, when applicable), and `source_url` (the
originating platform page) — useful context, but don't follow `source_url`
unprompted; surface it like any other user-supplied link.

Always pass `prices=1` for "top by volume" / "what's hot" prompts — without
it the price fields come back `null` and the sort can't be ranked
meaningfully on the client. The Clawnch backend caches the price overlay on a short TTL, so
hitting this endpoint repeatedly is cheap.

### `GET /api/prepare/deploy`

Non-custodial launch path: returns unsigned Clanker factory calldata so the
user's own wallet pays gas and ends up as `tokenAdmin`. No Clawnch API key,
no captcha, no server-side deployer. The platform's 20% trading-fee share is
preserved in the rewards array of the prepared calldata.

> [!NOTE]
> **Launching is free** — no burn or API key required. Optionally include a
> `burnTxHash` proving the `from` wallet burned **1,000,000+ CLAWNCH**
> (`0xa1F72459dfA10BAD200Ac160eCd78C6b77a747be`) to
> `0x000000000000000000000000000000000000dEaD` on Base within the last 24h to
> claim a creator **vault allocation** (1M = 1%, scaling up to 10M = 10% of
> supply). Omit it for a normal free launch with no vault.

Query parameters:

| Param          | Required | Notes                                                                    |
| -------------- | -------- | ------------------------------------------------------------------------ |
| `from`         | yes      | The user's wallet address. Becomes `tokenAdmin` + 80% reward recipient.  |
| `name`         | yes      | Token name (≤ 64 chars).                                                 |
| `symbol`       | yes      | Ticker (≤ 16 chars).                                                     |
| `description`  | no       | Optional metadata.                                                       |
| `image`        | no       | Optional image URL.                                                      |
| `twitter`      | no       | Social URL.                                                              |
| `website`      | no       | Social URL.                                                              |
| `telegram`     | no       | Social URL.                                                              |
| `farcaster`    | no       | Social URL.                                                              |
| `discord`      | no       | Social URL.                                                              |
| `burnTxHash`   | no       | Optional. Tx hash of a 1M+ CLAWNCH burn from `from` to the dead address within 24h. Include it to claim a vault % (1M = 1% … 10M = 10%); omit for a free launch with no vault. |

Response (envelope shape):

```json
{
  "ok": true,
  "data": {
    "to": "0xE85A59c628F7d27878ACeB4bf3b35733630083a9",
    "data": "0xdf40224a...<encoded deployToken calldata>",
    "value": "0x0",
    "chainId": 8453
  },
  "meta": {
    "tokenName": "MyCoin",
    "symbol": "MYC",
    "platformFeeBps": 2000,
    "userFeeBps": 8000,
    "vaultPercentage": 1,
    "vaultLockupSeconds": 604800,
    "source": "base-mcp",
    "from": "0x...",
    "platformFeeRecipient": "0x..."
  }
}
```

Error shape (only when a supplied `burnTxHash` fails verification — a
burn-less call is a normal, successful free launch):

```json
{ "ok": false, "error": "burnTxHash failed verification: …", "code": "invalid_burn" }
```

Error codes and HTTP statuses:

| Code               | HTTP | Meaning                                                       |
| ------------------ | ---- | ------------------------------------------------------------- |
| `missing_required` | 400  | `from`, `name`, or `symbol` missing.                          |
| `invalid_from`     | 400  | Malformed or zero `from` address.                             |
| `invalid_name`     | 400  | Name > 64 chars.                                              |
| `invalid_symbol`   | 400  | Symbol > 16 chars.                                            |
| `invalid_burn`     | 400  | A supplied `burnTxHash` was malformed or failed verification. |
| `rate_limited`     | 429  | Per-IP or per-wallet throttle hit. Back off and retry later.  |
| `misconfigured`    | 503  | Server-side fee recipient missing. Not actionable client-side.|
| `sdk_error` / `encode_error` | 500 | Calldata build failure. Surface `error` to the user. |

Note: `web_request` implementations that treat non-2xx as a hard error may
not hand back the JSON body. A burn-less call is a normal free launch, so a
4xx here is a real error (bad params, rate limit, or a supplied `burnTxHash`
that failed) — surface `error`/`code` to the user rather than assuming a burn
is needed.

## Orchestration

Discovery + buy happy path:

```text
1. web_request GET https://www.clawn.ch/api/launches?limit=10
   (or /api/tokens?limit=10&sort=volume&prices=1 for "top by volume")
2. Surface the list to the user (symbol, name, agent/source, address)
3. Wait for the user to pick one and confirm an amount
4. get_wallets → address (only if not already cached)
5. swap (Base MCP) with fromAsset=ETH (or USDC), toAsset=<address>, amount=<human-readable>
6. Open the approvalUrl
7. get_request_status only after the user acts
```

Do not auto-buy. Always require an explicit "buy X amount of `<symbol>`"
confirmation before calling `swap` — the launches feed is unfiltered and
contains low-liquidity / meme / experimental tokens.

### Recent-launches discovery

```text
web_request:
  method: GET
  url: https://www.clawn.ch/api/launches?limit=10
```

The response is already sorted newest-first. Take `launches[]` and surface
each as one line.

### Top-by-volume discovery

```text
web_request:
  method: GET
  url: https://www.clawn.ch/api/tokens?limit=10&sort=volume&prices=1
```

This is the differentiator vs. just-launched feeds — it tells the user
"which tokens on Base are actually being traded right now." Surface
`priceUsd`, `marketCap`, `volume24h`, and `priceChange24h` alongside the
symbol.

### Source filtering

To narrow to a specific platform (e.g. "show me clawmes launches"), pass
`source=clawmes` to `/api/launches`. Valid values:

  * `clawmes` — Clawnch's Hermes Agent fork/plugin (chat surface: Telegram /
    Discord / Slack). Repo: github.com/clawnchdev/clawmes.
  * `openclawnch` — Clawnch's OpenClaw agent fork (crypto-native agent, 48
    tools, multi-channel). Site: openclawn.ch.
  * `clawncher` — direct deploys via the clawncher SDK / CLI.
  * `base-mcp` — non-custodial deploys built via `/api/prepare/deploy`
    (Base MCP / desktop AI clients).
  * `moltbook` — deploys from the Moltbook social posting flow.
  * `4claw` — deploys from the 4claw automation bot.
  * `clawtomaton` — deploys from the Clawtomaton automation surface.
  * `moltx` — deploys from the Moltx surface.

### Presenting launches to the user

Surface enough context that the user can judge whether to buy — at minimum:
symbol, name, source/agent, age, and contract address. Don't echo the full
description or all 50 entries; that's noise.

Example summary line per launch (recent feed):

```text
CPMH — Complete Mayhem · via 4claw · launched 3m ago
  0xAD740994F3Ddc522DE7cd005891245b72634EdF0
```

Example summary line per token (volume feed):

```text
CLAWNCH — $0.0000105 · mc $1.0M · vol24h $77.7k · 24h -9.9%
  0xa1F72459dfA10BAD200Ac160eCd78C6b77a747be
```

### Launch orchestration

```text
1. get_wallets → from
2. Confirm token params with the user (name, symbol, optional metadata)
3. (Optional) Vault step: only if the user wants a creator vault allocation,
   they burn 1,000,000–10,000,000 CLAWNCH from `from` to
   0x000000000000000000000000000000000000dEaD on Base (ERC-20 transfer; can
   be sent via send_calls). Capture the tx hash. Skip for a free launch.
4. web_request GET https://www.clawn.ch/api/prepare/deploy?from=<addr>&name=<...>&symbol=<...>[&burnTxHash=<0xburn...>]
5. Parse the envelope — bail on `ok: false`, surface `error` and `code`
   (a 400 `invalid_burn` means a supplied burn hash failed verification)
6. send_calls (Base MCP) with chain="base", calls=[{ to: data.to, value: data.value, data: data.data }]
7. Open the approvalUrl
8. Poll get_request_status until confirmed
9. Surface tx hash + the new token's eventual Basescan URL
```

A vault burn (if the user opts into one) is a real, irreversible spend of
CLAWNCH. State it explicitly and get a separate confirmation for the burn
before sending it — never bundle the burn confirmation into the deploy
confirmation.

### Burn-and-vault mechanics (optional)

Burning CLAWNCH is optional — it's only used to claim a creator vault (locked
supply released after a 7-day Clanker lockup). Skip it for a free launch:

```text
1. User burns CLAWNCH to 0x000000000000000000000000000000000000dEaD
   on Base. 1,000,000 CLAWNCH = 1% vault; cap 10,000,000 = 10% vault.
2. User waits for the burn tx to confirm.
3. Call /api/prepare/deploy with ?burnTxHash=<burn-tx-hash> (plus the
   usual from/name/symbol params).
4. Server verifies the burn (sender = `from`, recipient = burn address,
   amount ≥ 1M, within 24h pre-launch window) and applies the vault
   percentage to the prepared calldata.
5. Continue with the standard send_calls flow.
```

Verification rejections surface as `{ ok: false, code: "invalid_burn" }`
(HTTP 400) with a specific message ("amount below minimum", "transaction
too old", "sender mismatch", etc.).

## Submission

Three submission shapes, all on `chain: "base"` (the chain string, not the
numeric chainId). Every write returns an `approvalUrl` + `requestId`; surface
the URL neutrally and poll `get_request_status` only after the user acts —
see [approval-mode.md](../references/approval-mode.md).

**Buys → `swap`.** Read the `swap` tool's own parameter descriptions from the
MCP — they are the source of truth. Typical shape:

```json
{
  "chain": "base",
  "fromAsset": "ETH",
  "toAsset": "<token.address>",
  "amount": "0.001"
}
```

  * `fromAsset`: use a supported symbol like `ETH` or `USDC`, or a contract
    address when needed.
  * `toAsset`: use the Clawnch token's `contractAddress` (or `address` from
    the tokens endpoint), verbatim.
  * `amount`: human-readable decimal amount of `fromAsset`. For 0.001 ETH
    pass `"0.001"`; for 5 USDC pass `"5"`.

**Launches → `send_calls`.** Map the `/api/prepare/deploy` envelope's `data`
object straight through — no re-encoding needed (`value` is already hex):

```json
{
  "chain": "base",
  "calls": [{ "to": "<data.to>", "value": "<data.value>", "data": "<data.data>" }]
}
```

**Burns → `send_calls`.** A standard ERC-20 `transfer(address,uint256)` on
the CLAWNCH contract (`0xa1F72459dfA10BAD200Ac160eCd78C6b77a747be`) to the
dead address, `value: "0x0"`, amount in wei (whole tokens × 10^18).

## Example Prompts

**Show me the latest token launches on Clawnch**

1. `web_request` GET `https://www.clawn.ch/api/launches?limit=10`.
2. Surface the 10 launches with symbol, name, source/agent handle, age, address.
3. Do **not** auto-buy. Ask the user which one (and how much) they want.

**What's the top token on Base by volume right now?**

1. `web_request` GET `https://www.clawn.ch/api/tokens?limit=5&sort=volume&prices=1`.
2. Surface the top 5 with symbol, price, market cap, 24h volume, 24h change.
3. Ask the user which one to look at / buy.

**Buy 0.001 ETH worth of the top volume token on Clawnch**

1. `web_request` GET `https://www.clawn.ch/api/tokens?limit=1&sort=volume&prices=1`.
2. Take `tokens[0]`. Show: symbol, name, address, current price, 24h volume.
3. Ask the user to confirm — "Buy 0.001 ETH of `<SYMBOL>` (`<address>`) at `~$<price>`?".
4. On confirmation: `swap` with `fromAsset=ETH`, `toAsset=<token.address>`, `amount="0.001"`, `chain="base"`.
5. Open the approval URL; poll `get_request_status` once the user has approved.

**Buy 5 USDC of CLAWNCH**

1. `web_request` GET `https://www.clawn.ch/api/tokens?limit=10&sort=volume&prices=1`.
2. Find the entry with `symbol="CLAWNCH"`; the canonical address is `0xa1F72459dfA10BAD200Ac160eCd78C6b77a747be`.
3. Ask the user to confirm — "Buy 5 USDC of CLAWNCH (`0xa1F7…747be`)?".
4. `swap` with `fromAsset=USDC`, `toAsset="0xa1F72459dfA10BAD200Ac160eCd78C6b77a747be"`, `amount="5"`, `chain="base"`.
5. Open the approval URL; poll.

**Show me clawmes launches in the last hour**

1. `web_request` GET `https://www.clawn.ch/api/launches?source=clawmes&limit=25`.
2. Client-side filter `launchedAt` within the last hour.
3. List matches with symbol, name, address, age. If none, say so.

**What is this token? 0x32F66Ec2Ffb26d262058965cf294F951e47F8ba3**

1. `web_request` GET `https://www.clawn.ch/api/launches?address=0x32F66Ec2Ffb26d262058965cf294F951e47F8ba3`.
2. If `success=true`: summarize `name`, `symbol`, `agentName`, `source`, launch age, and `clankerUrl`.
3. If the request returns 404 / `success=false` (or the `web_request` tool errors on the 404 status): tell the user the address isn't in Clawnch's launches index; offer to swap anyway via the regular `swap` flow with extra confirmation.

**Launch a token called "Cool Project" with symbol $COOL**

1. `get_wallets` → `from`.
2. Confirm with the user: name, symbol, any optional metadata.
3. Launching is free — no burn required. (Optional: they may burn 1M+ CLAWNCH to claim a creator vault %; only relevant if they ask for one.)
4. `web_request` GET `https://www.clawn.ch/api/prepare/deploy?from=<addr>&name=Cool%20Project&symbol=COOL`.
5. Bail if `ok: false`; surface `error` and `code`.
6. Show the user: "Deploy `Cool Project` (`COOL`) on Base via Clanker? 80% fee share to you, 20% to Clawnch (standard launchpad fee). Approve?"
7. On confirmation: `send_calls` with the returned `data`. Open `approvalUrl`. Poll `get_request_status`.

**Deploy with a 5% vault claim using my prior CLAWNCH burn**

1. Confirm the burn tx exists + is the user's, and is < 24h old. (User pastes a tx hash.)
2. `web_request` GET `https://www.clawn.ch/api/prepare/deploy?from=<addr>&name=<...>&symbol=<...>&burnTxHash=<0xburn...>`.
3. Read `meta.vaultPercentage` from the response. If less than expected, surface the discrepancy and let the user re-confirm.
4. `send_calls` with the returned `data`. The vault clause is baked into the calldata.

## Risks & Warnings

  * **Low liquidity.** New launches commonly have thin liquidity and volatile
    prices — many indexed tokens are low-liquidity, short-lived, or meme
    tokens, and the feed is unfiltered (no endorsement implied). Mention this
    once before the first buy of a session, and never auto-buy.
  * **Slippage.** Base MCP's core `swap` tool does not expose a slippage
    parameter, so do not invent one. Warn the user that fresh-launch swaps
    may revert or fill at a materially worse price, then require explicit
    confirmation of the token address and amount before calling `swap`.
  * **Irreversible.** Token deploys are permanent onchain actions, as is the
    optional vault burn (if the user opts into one). Get a separate, explicit
    confirmation for any burn before submitting it — never bundle it into the
    deploy confirmation, and never initiate a burn or deploy the user didn't
    ask for.
  * **Symbol collisions.** Many launches share symbols (the index has 140k
    entries; popular tickers are reused constantly). Always disambiguate by
    `contractAddress` and confirm with the user before swapping.
  * **Adversarial metadata.** Token names, symbols, agent handles, and
    descriptions are user-supplied and can impersonate legitimate projects.
    Don't follow links unprompted; surface them to the user for context only.
  * **Stale prices.** The `priceUsd` / `marketCap` / `volume24h` fields are
    computed from on-chain DEX data on a short refresh cadence — accurate
    within a minute or two, not millisecond-fresh. Treat them as ballpark
    guides, not execution prices.
  * **Buy size.** Do not propose a default buy amount. The user must specify
    the amount.

## Notes

  * Native ETH address: `0x0000000000000000000000000000000000000000`
  * USDC on Base: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
  * WETH on Base: `0x4200000000000000000000000000000000000006`
  * $CLAWNCH token: `0xa1F72459dfA10BAD200Ac160eCd78C6b77a747be` · burn
    address: `0x000000000000000000000000000000000000dEaD`
  * Clanker factory (deploy target): `0xE85A59c628F7d27878ACeB4bf3b35733630083a9`
  * **Agent provenance.** Every launch carries `agentName` and `source` —
    who/what initiated it. Launches deployed through Clawnch's
    registered-agent path are cryptographically verified at deploy time (the
    agent signs an ECDSA challenge before the deploy is accepted); launches
    surfaced from other tracked sources are included too and are identifiable
    by their `agentName` / `source` (e.g. an `*_anon_*` agent name is an
    unattributed post, not a verified agent). The read API does not return a
    boolean "verified" flag — derive provenance from these fields, and treat
    it as *who launched a token*, not an endorsement of the token itself.
  * Swap amounts are human-readable decimals for `fromAsset`. If you ever use
    a contract address as `fromAsset`, include that token's `fromDecimals`.
  * Always use `chain: "base"` (string) with `swap`, not the numeric chainId.
  * The Clawnch read endpoints set `s-maxage=600`, so GET responses are
    cached ~10 minutes on Vercel's edge (verify with the `x-vercel-cache:
    HIT` response header). Note the client-visible `cache-control` header
    shows `max-age=0, must-revalidate` — Vercel consumes `s-maxage`
    edge-side — and HEAD requests bypass the cache entirely, so header-only
    probes will always show `MISS`. "What's brand new" queries that need
    sub-minute freshness can pass a cache-busting query param like
    `?ts=<unix_ts>` (a distinct query string is a distinct cache key) — but
    most use cases (top by volume, recent launches in the last hour) are
    fine with the cached response.
  * Clawnch rate-limits read endpoints to 120 requests/minute per IP. Base
    MCP's egress should be well under that for normal use.
