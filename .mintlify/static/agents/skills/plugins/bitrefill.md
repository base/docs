---
title: "Bitrefill Plugin"
description: "Shop 1,500+ brands in 180+ countries — Amazon, Steam, Netflix, mobile top-ups, and travel eSIMs — paid with USDC on Base. Your agent searches, checks out, and delivers gift-card codes and eSIM details in chat. No Bitrefill account required."
tags: [agent-commerce, gift-cards, esim, mobile-topup, payments]
name: bitrefill
version: 0.4.0
integration: hybrid
chains: [base]
requires:
  shell: optional
  allowlist: [api.bitrefill.com]
  externalMcp:
    name: bitrefill
    transport: http
    url: https://api.bitrefill.com/mcp
  cliPackage: "@bitrefill/cli@latest"
auth: siwe-jwt
risk: [pii, irreversible]
---

# Bitrefill Plugin

> [!IMPORTANT]
> Complete Base MCP onboarding first (`SKILL.md`). **Path 1** (connect→JWT) is the default for agent-commerce. Fall back to **Path 2** (pay-per-call x402) for multi-wallet or stateless agents. Use **Path 3** (CLI) or **Path 4** (Bitrefill MCP) only when the user has an existing Bitrefill account. Keep `buy-products` **out** of Bitrefill MCP `autoApprove`.

## Overview

**Turn USDC on Base into everyday spending — inside the conversation.**

[Bitrefill](https://www.bitrefill.com) is the world's largest crypto-native storefront for digital goods: gift cards (Amazon, Apple, Steam, Uber, and 1,500+ more), mobile refills in 180+ countries, and data eSIMs for travel. Pay with USDC on Base from your Base Account; codes and install links land in chat — often in seconds, sometimes within a few minutes (see **Business domain**).

**Why agents love it:** one session can go from *"I need a $25 Amazon US card"* to a delivered PIN — search, pick a denomination, confirm, pay, poll, redeem — without leaving the thread. No Bitrefill signup on the default path: sign in once with your wallet, browse fee-free, pay only at checkout.

**Already on Bitrefill?** Link an existing account via CLI or the Bitrefill MCP and shop your usual catalog the same way.

Path selection, API routes, and Base MCP wiring: **Detection** · **Submission**

## Detection

**Path 1 — Connect → JWT (default):** one wallet sign-in → session token (~2 h); browse/create/status without micro-fees; pay at checkout only.

**Path 2 — Pay-per-call x402:** no session; HTTP 402 + micro-fee on each gated call.

**Path 3 — CLI:** existing Bitrefill account via `@bitrefill/cli` (shell).

**Path 4 — Bitrefill MCP:** existing account via `https://api.bitrefill.com/mcp` (OAuth, shell-less).

After Base MCP is available (`SKILL.md`), pick a path:

**Agent-commerce (USDC on Base, no Bitrefill account):**

1. Base MCP `sign` + `web_request` + x402 payment tools available, agent can persist a JWT → **Path 1**.
2. Otherwise, or multi-wallet / no session persistence → **Path 2**.
3. Cannot run SIWX helpers (no shell/Node for checksum + message build) → **Path 2** only; tell the user connect is unavailable.

**Existing Bitrefill account:**

4. Shell + `npx @bitrefill/cli@latest --help` → **Path 3**.
5. Bitrefill MCP tools exposed (`search-products`, `buy-products`, …) → **Path 4**.
6. Neither → install per **Path 4 setup** below; **stop** if both fail.

Never scrape `https://www.bitrefill.com` (403 from datacenters). Paths 1–2: Base MCP `web_request` to allowlisted `api.bitrefill.com` (`custom-plugins.md`). Paths 3–4: Bitrefill CLI or Bitrefill MCP.

## Path 4 setup (Bitrefill MCP)

`https://api.bitrefill.com/mcp` — OAuth at connector setup.

- **Cursor:** `.cursor/mcp.json` or `~/.cursor/mcp.json`:

  ```json
  {
    "mcpServers": {
      "bitrefill": {
        "url": "https://api.bitrefill.com/mcp",
        "autoApprove": [
          "search-products", "get-product-details",
          "list-invoices", "get-invoice-by-id",
          "submit-prepayment-step", "update-order"
        ]
      }
    }
  }
  ```

  `buy-products` **out** of `autoApprove`.
- **Claude Code:** `claude mcp add bitrefill --url https://api.bitrefill.com/mcp`
- Reconnect/restart after install. MCP tools (verified): `search-products`, `get-product-details`, `buy-products`, `submit-prepayment-step`, `list-invoices`, `get-invoice-by-id`, `update-order`.

## Auth and SIWX

Path 1 connect uses **SIWX → JWT**. Path 2 needs no auth. Post-purchase **redemption codes** on `invoice/status` require SIWX from the **paying wallet** (Path 1 JWT covers browse/status polling; if codes are missing, run **SIWX for codes** below). Path 3/4 use CLI/MCP OAuth.

### EIP-55 checksum (required)

The address in the signed message and SIWX payload must be **EIP-55 checksummed** (mixed case). Lowercase addresses from `get_wallets` cause the API to reject the signature and return another `402`. Always run `toChecksumAddress` before building the message.

Base Account signatures are ERC-1271/6492 wrapped (~224 bytes). Pass the **full** signature unchanged; header `type` stays `"eip191"`. Wallet reads and write approvals follow `approval-mode.md`.

### SIWX timing

Challenge nonce expires in **5 minutes** and is **single-use**. Fetch challenge → build message → `sign` → send header within that window. If connect returns `402` again, fetch a fresh challenge and repeat — do not reuse a stale nonce or signature.

### Connect → JWT (Path 1)

1. `web_request` `POST https://api.bitrefill.com/x402/connect` with body `{}` and header `Content-Type: application/json` → **402** whose JSON body includes `extensions["sign-in-with-x"].info` (domain, uri, version, nonce, issuedAt, expirationTime, statement, resources) and `supportedChains`.
2. `get_wallets` → wallet address.
3. Pick Base: `{ chainId: "eip155:8453", type: "eip191" }` from `supportedChains`.
4. Build EIP-4361 message with **SIWX helpers** below (`toChecksumAddress` → `buildSiweMessage`). The `uri` in the challenge for connect is `https://api.bitrefill.com/x402/connect`.
5. `sign` with `type: "personal_sign"`, `data: { message: <exact string> }` → follow `approval-mode.md` → `signature`.
6. Build **decomposed** payload (not `{ message, signature }`), base64-encode → `sign-in-with-x` request header (see payload shape below).
7. `web_request` `POST https://api.bitrefill.com/x402/connect` with body `{}`, `Content-Type: application/json`, and header `sign-in-with-x: <base64>` → **200** with `{ token, token_header: "X-Access-Token", expires_in }` (default ~7200 s).
8. Store `token` in memory only. Attach `X-Access-Token: <token>` (raw JWT, **no** `Bearer`) on every subsequent gated `web_request`. Re-connect when expired.

### SIWX for codes (after `invoice/pay`)

When `invoice/status` returns delivery complete but no `redemption_info`, or Path 2 without JWT:

1. `web_request` `GET https://api.bitrefill.com/x402/invoice/status?invoice_id=<uuid>` → **402** with SIWX challenge (save the full JSON body).
2. Build message from challenge `info` — **`uri` must match the challenged route** (includes `?invoice_id=`).
3. `sign` → follow `approval-mode.md` within 5 minutes.
4. `web_request` same URL with `sign-in-with-x` header → **200** with `redemption_info.orders[].redemption_info` (`code`, `pin`, `extra_fields`).
5. **403** → signing wallet is not the invoice payer. Sign with the wallet that paid.

`my/orders` and `my/esims` use the same SIWX flow (Path 1 JWT also works on these routes).

### Decomposed SIWX payload

Base64 of this JSON (send as `sign-in-with-x` header):

```json
{
  "domain": "api.bitrefill.com",
  "address": "0x<EIP-55 checksummed>",
  "statement": "<info.statement>",
  "uri": "<info.uri — must match the route being authenticated>",
  "version": "1",
  "chainId": "eip155:8453",
  "type": "eip191",
  "nonce": "<info.nonce>",
  "issuedAt": "<info.issuedAt>",
  "expirationTime": "<info.expirationTime>",
  "resources": ["<info.resources[]>"],
  "signature": "0x<full signature from get_request_status>"
}
```

Chain ID is numeric (`8453`) inside the signed message but CAIP-2 (`eip155:8453`) in the payload.

### SIWX message shape

```
<domain> wants you to sign in with your Ethereum account:
<checksummed_address>

<statement>

URI: <uri>
Version: 1
Chain ID: 8453
Nonce: <nonce>
Issued At: <issuedAt>
Expiration Time: <expirationTime>
Resources:
- <resource_url>
```

### SIWX helpers (no external libraries)

Verified against `siwe@2.3.2` and `@x402/extensions@2.3.0`. Run in Node 18+ or any JS shell.

**JavaScript:**

```javascript
const RC = [
  0x0000000000000001n,0x0000000000008082n,0x800000000000808an,0x8000000080008000n,
  0x000000000000808bn,0x0000000080000001n,0x8000000080008081n,0x8000000000008009n,
  0x000000000000008an,0x0000000000000088n,0x0000000080008009n,0x000000008000000an,
  0x000000008000808bn,0x800000000000008bn,0x8000000000008089n,0x8000000000008003n,
  0x8000000000008002n,0x8000000000000080n,0x000000000000800an,0x800000008000000an,
  0x8000000080008081n,0x8000000000008080n,0x0000000080000001n,0x8000000080008008n];
const ROT = [0,1,62,28,27,36,44,6,55,20,3,10,43,25,39,41,45,15,21,8,18,2,61,56,14];
const MASK = (1n<<64n)-1n;
const rotl = (x,n)=> n===0n ? x : ((x<<n)|(x>>(64n-n)))&MASK;
function keccakF(s){
  for(let round=0;round<24;round++){
    const C=new Array(5);
    for(let x=0;x<5;x++) C[x]=s[x]^s[x+5]^s[x+10]^s[x+15]^s[x+20];
    const D=new Array(5);
    for(let x=0;x<5;x++) D[x]=C[(x+4)%5]^rotl(C[(x+1)%5],1n);
    for(let x=0;x<5;x++) for(let y=0;y<5;y++) s[x+5*y]^=D[x];
    const B=new Array(25);
    for(let x=0;x<5;x++) for(let y=0;y<5;y++) B[y+5*((2*x+3*y)%5)]=rotl(s[x+5*y],BigInt(ROT[x+5*y]));
    for(let x=0;x<5;x++) for(let y=0;y<5;y++) s[x+5*y]=B[x+5*y]^(((~B[((x+1)%5)+5*y])&B[((x+2)%5)+5*y])&MASK);
    s[0]^=RC[round];
  }
}
function keccak256(bytes){
  const rate=136; const s=new Array(25).fill(0n);
  const padded=new Uint8Array(Math.ceil((bytes.length+1)/rate)*rate);
  padded.set(bytes); padded[bytes.length]^=0x01; padded[padded.length-1]^=0x80;
  for(let off=0;off<padded.length;off+=rate){
    for(let i=0;i<rate/8;i++){
      let lane=0n;
      for(let j=7;j>=0;j--) lane=(lane<<8n)|BigInt(padded[off+i*8+j]);
      s[i]^=lane;
    }
    keccakF(s);
  }
  const out=new Uint8Array(32);
  for(let i=0;i<4;i++){ let lane=s[i]; for(let j=0;j<8;j++){ out[i*8+j]=Number(lane&0xffn); lane>>=8n; } }
  return Buffer.from(out).toString('hex');
}
function toChecksumAddress(addr){
  const a=String(addr).toLowerCase().replace(/^0x/,'');
  const hash=keccak256(Buffer.from(a,'ascii'));
  let out='0x';
  for(let i=0;i<a.length;i++) out += parseInt(hash[i],16)>=8 ? a[i].toUpperCase() : a[i];
  return out;
}
function buildSiweMessage(info, address, chainIdCaip2){
  const chainNum = parseInt(/^eip155:(\d+)$/.exec(chainIdCaip2)[1], 10);
  let prefix = `${info.domain} wants you to sign in with your Ethereum account:\n${address}`;
  if (info.statement) prefix += '\n\n' + info.statement;
  const suffix = [
    `URI: ${info.uri}`, `Version: ${info.version}`, `Chain ID: ${chainNum}`,
    `Nonce: ${info.nonce}`, `Issued At: ${info.issuedAt}`,
  ];
  if (info.expirationTime) suffix.push(`Expiration Time: ${info.expirationTime}`);
  if (info.notBefore) suffix.push(`Not Before: ${info.notBefore}`);
  if (info.requestId) suffix.push(`Request ID: ${info.requestId}`);
  if (info.resources?.length) suffix.push(['Resources:', ...info.resources.map(r=>`- ${r}`)].join('\n'));
  return prefix + '\n\n' + suffix.join('\n');
}
function buildSiwxPayload(info, address, signature, chainIdCaip2){
  const payload = {
    domain: info.domain, address, statement: info.statement, uri: info.uri,
    version: info.version, chainId: chainIdCaip2, type: 'eip191',
    nonce: info.nonce, issuedAt: info.issuedAt, expirationTime: info.expirationTime,
    resources: info.resources, signature,
  };
  if (info.notBefore) payload.notBefore = info.notBefore;
  if (info.requestId) payload.requestId = info.requestId;
  return payload;
}
function encodeSiwxHeader(payload){
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}
```

Run the JavaScript block in Node (`node -e '…'`) or any harness with `BigInt`. Do not hand-type checksummed addresses. If no JavaScript runtime is available, use **Path 2** (no connect SIWX) or obtain checksum/message from a one-line Node invocation before calling `sign`.

## Business domain

Bitrefill API names do not match everyday ecommerce wording — map them when talking to users:

| API term | Means | User-facing |
| --- | --- | --- |
| **invoice** | Price-locked checkout (cart + total), not a billing document | "your order" / "checkout" |
| **order** | One cart line item (one product/denomination) | "item" |

Flow: `invoice/create` → `invoice/pay` → backend **async fulfillment** of each order. Gift-card codes are often near-instant; some products take minutes. **Poll** `invoice/status` until `delivery_status` is `all_delivered` — do not treat payment confirmation as delivery.

If an item is still not fulfilled after **3 hours**, or the user hits any service issue, point them to [help.bitrefill.com](https://help.bitrefill.com).

## Endpoints

Base URL: `https://api.bitrefill.com` (no `/api` prefix on x402 routes). Every gated response embeds `next_step: { url, body }` chaining search → detail → create → pay → status.

**402 envelope:** `payment-required` header is base64 JSON, mirrored into the JSON body.

| Method | Path | Cost | Auth (no JWT) |
| --- | --- | --- | --- |
| `GET` | `/x402/gift-cards/search?q=&country=` | $0.002 | x402 |
| `GET` | `/x402/esims/search?q=` | $0.002 | x402 |
| `GET` | `/x402/topups/search?q=` | $0.002 | x402 |
| `GET` | `/x402/checkout/info` | $0.001 | x402 |
| `GET` | `/x402/products/detail?slug=` | $0.001 | x402 |
| `POST` | `/x402/invoice/create` | $0.002 | x402 |
| `POST` | `/x402/invoice/pay` | invoice amount | x402 (never JWT-waived) |
| `GET` | `/x402/invoice/status?invoice_id=` | $0.001 or SIWX | x402 or SIWX |
| `POST` | `/x402/connect` | free | SIWX → JWT |
| `GET` | `/x402/my/orders` | free | SIWX or JWT |
| `GET` | `/x402/my/esims` | free | SIWX or JWT |

With valid **`X-Access-Token`**, the gate bypasses micro-fees and SIWX on all gated routes except `/x402/connect` (cannot mint with a token) and `invoice/pay` (invoice amount never waived).

**Repeat reads:** paying a route once grants that wallet fee-free access to the same path for 30 days. SIWX routes still need a signature per request when not using JWT.

### Payment (Base USDC)

| Field | Value |
| --- | --- |
| Network (CAIP-2) | `eip155:8453` |
| USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| payTo | `0x480CD46E6faDe651a0437DeaddA53D5c8e7D846A` |

All checkout and x402 pay flows use **USDC on Base only**.

### `package_value` (critical)

Use the **exact** string from `products/detail` `packages[].package_value` — do not transform.

| Type | Format | Example |
| --- | --- | --- |
| Gift cards | Bare integer string | `"10"`, `"50"` |
| Top-ups | Bare integer string | `"5"`, `"20"` |
| eSIMs | Descriptive label | `"1GB, 7 Days"`, `"Unlimited, 15 Days"` |

Wrong `package_value` → HTTP **500** on `invoice/create` (no charge). Confirm no charge before retry (see **Notes**).

### Request shapes

**invoice/create** — gift card:

```json
{ "items": [{ "product_id": "amazon_it-italy", "package_value": "10" }] }
```

Top-up with phone (`recipient_required: true` on detail):

```json
{ "items": [{ "product_id": "iliad-italy", "package_value": "10", "refill_input": "+39XXXXXXXXXX" }] }
```

Response: `{ "invoice_id", "price_usdc", "price_usd", "expires_in_minutes", "next_step" }`.

**invoice/pay** — `{ "invoice_id": "<uuid>" }`. Success: `{ "success": true, "status": "payment_confirmed", "transaction", "next_step" }`.

**invoice/status** — without SIWX/JWT: status fields only. With SIWX from payer or Path 1 JWT: adds `redemption_info.orders[].redemption_info` (`code`, `pin`, `extra_fields`).

## Surface routing

| Capability | Path 1 | Path 2 | Path 3 | Path 4 |
| --- | --- | --- | --- | --- |
| Connect / JWT | `sign` + `web_request` `/connect` | — | — | — |
| Search / browse | `web_request` + `X-Access-Token` | x402 pay per route | CLI | `search-products` |
| Product detail | `web_request` + token | x402 | CLI | `get-product-details` |
| Invoice create | `web_request` + token | x402 | CLI / MCP | `buy-products` |
| Pay invoice | Base MCP x402 tools | Same | x402 or `send` | Same |
| Poll status | `web_request` + token | x402 or token-less poll + SIWX for codes | CLI | `get-invoice-by-id` |
| Redemption codes | JWT or SIWX on `invoice/status` | SIWX from payer | CLI | `get-invoice-by-id` → `orders[].redemption_info` |
| Order history | `web_request` `/my/orders` + token | SIWX per request | CLI | `list-invoices` |

## Claude `show_widget`

On **claude.ai**, render search/detail/invoice/status via the built-in **`show_widget`** tool — inline in chat, not Artifacts, not HTML in prose. Narrative stays in the message; only the visual goes in `widget_code` (`title`: snake_case).

Fragment order: `<style>` → HTML → `<script>`. No `html`/`head`/`body`. Host CSS vars only (`var(--color-*)`); no `font-family`; no shadows/gradients/blur/`transition: all`. Body ≥16px; interactive `min-height: 44px`.

One primary + one secondary CTA. Primary follows `next_step` ("See details for …" → "Buy … on …" → "Confirm and pay … USDC" → "Check delivery status"); wire it with `sendPrompt(...)`. Secondary is lateral escape only. Selection: transparent 2px border + outline at rest; selected `var(--color-border-info)` + `var(--color-background-info)`. Pre-select defaults so primary is actionable on first paint.

## Orchestration

### Path 1: Connect → browse → buy (default)

1. **Connect** — SIWX flow above → store JWT and `expires_in`. Do this **once** per session.
2. **Confirm funds** — when needed, check USDC on Base before pay.
3. **Search** — `web_request` `GET /x402/gift-cards/search?q=<term>&country=<ISO>` with `X-Access-Token`. Take `slug` from `products[]`. (Or `esims/search`, `topups/search`.)
4. **Detail** — `web_request` `GET /x402/products/detail?slug=<slug>` + token. Confirm `in_stock`, `currency`, `packages[]`, `recipient_required`.
5. **Create** — `web_request` `POST /x402/invoice/create` + token with `{ "items": [{ "product_id": "<slug>", "package_value": "<exact>" }] }` (+ `refill_input` if top-up). Read `invoice_id`, `price_usd`.
6. **Confirm with user** — show exact USDC total, product, denomination. Get explicit approval to pay.
7. **Pay** — x402 on `POST https://api.bitrefill.com/x402/invoice/pay` with `{ invoice_id }`, `maxPayment` just above `price_usd` → `approval-mode.md` → complete x402 request.
8. **Poll** — `web_request` `GET /x402/invoice/status?invoice_id=<id>` + token until `delivery_status` is `all_delivered`.
9. **Codes** — if `redemption_info` missing, run **SIWX for codes** with the paying wallet. Deliver `code` / `pin` securely (**Risks & Warnings**).

### Path 2: Pay-per-call x402

1. Confirm USDC on Base when needed.
2. For each gated step: `web_request` → 402 → x402 pay that URL/method/body, `maxPayment: "0.01"` → `approval-mode.md`.
3. Follow `next_step` through detail → create → pay.
4. Invoice pay: `maxPayment` just above `price_usd`.
5. Poll status; **SIWX for codes** from paying wallet.

### Path 3: CLI

```bash
npx @bitrefill/cli@latest --help
npx @bitrefill/cli@latest --json whoami
npx @bitrefill/cli@latest search-products --query "Steam" --country US
npx @bitrefill/cli@latest buy-products \
  --cart_items '[{"product_id":"steam-usa","package_id":5}]' \
  --payment_method usdc_base --return_payment_link true
```

T3 (`login`/`verify`) for `list-orders`. Create with `--payment_method usdc_base`.

**Pay the Base invoice** — once `buy-products` returns `invoice_id`, agent picks one (follow `agent_instructions`):

1. **x402** — pay `x402_payment_url` via Base MCP x402 tools → `approval-mode.md`.
2. **Direct send** — `send` to `payment_info` address/amount on `base` → `approval-mode.md` → poll CLI/`get-invoice-by-id` until paid.

Confirm amount and destination with the user. Poll until fulfilled (see **Business domain**).

### Path 4: MCP

Install + OAuth → `search-products` → `get-product-details` → user approves → `buy-products` with `payment_method: "usdc_base"` → pay → poll → redeem.

**Pay the Base invoice** — same as Path 3: x402 on `x402_payment_url` or `send` to `payment_info`. Poll `get-invoice-by-id` until `invoice_status` is `payment_confirmed`, then until `invoice_status: complete` / `orders_delivery_status: all_delivered`. Redemption: `orders[].redemption_info`.

## Submission

Bitrefill uses Base MCP for reads, SIWX, x402, and direct USDC — not `send_calls`. Read tool names and schemas from the MCP catalog (`SKILL.md`).

| Bitrefill step | Base MCP | Bitrefill-specific |
| --- | --- | --- |
| Paths 1–2 API calls | `web_request` | Host `api.bitrefill.com` (allowlisted). Headers: `X-Access-Token` (raw JWT, not `Authorization`), `sign-in-with-x`, `Content-Type`. HTTP routing: `custom-plugins.md` |
| SIWX connect / codes | `get_wallets`, `sign` | Decomposed SIWX payload in `sign-in-with-x` header — see **Auth**. EIP-55 checksum required |
| x402 micro-fees, `invoice/pay`, Path 3/4 `x402_payment_url` | x402 tools from MCP catalog | `maxPayment`: `"0.01"` for micro-fees; slightly above invoice `price_usd` for pay |
| Path 3/4 direct USDC | `send` | `{ chain: "base", asset: "USDC", recipient, amount }` from `payment_info` |

All write paths: `approval-mode.md`. On 402 responses, pay the **Base USDC** (`eip155:8453`) entry from `accepts[]`.

## Example prompts

**$25 Amazon US — Path 1:** Connect → JWT → search + token → detail → create → confirm → x402 pay → poll → deliver code.

**Browse, no session — Path 2:** x402 micro-fee on each search/detail/create; SIWX for codes after pay.

**Existing account — Path 3/4:** CLI or MCP catalog → Base USDC invoice → x402 or `send` → poll → redeem.

## Risks & Warnings

- **`pii`** — Redemption codes, eSIM QR URLs, PINs are bearer credentials. Never log, commit, or paste in public channels. Return codes only when the user explicitly asks.
- **`irreversible`** — Digital goods are non-refundable once fulfilled. Confirm product, denomination, price, and payment before pay.
- **Invoice expiry** — ~15 min price lock. Stale pay URL → create a new invoice.
- **Connect token** — `X-Access-Token` is a bearer secret (~2 h). Never echo in chat. Re-connect when expired.
- **EIP-55 checksum** — mandatory for every SIWX flow; use helpers above.
- **CLI session** — `~/.config/bitrefill-cli/<host>.v1.json` is sensitive.

## Notes

- Country codes: Alpha-2 uppercase (`US`, `IT`).
- `X-Access-Token` header only — Base MCP strips `Authorization`.
- Fee schedule: search $0.002 · detail/checkout $0.001 · create $0.002 · status $0.001.
- Connect JWT TTL: default 120 minutes.
- **HTTP 500 on invoice/create** — wrong `package_value`; retry without paying until onchain history confirms no charge.
- **402 after SIWX send** — stale nonce, wrong checksum, or malformed payload; re-fetch challenge and re-sign within 5 minutes.
- **403 on SIWX route** — wrong wallet; sign with the invoice payer.
- **`INVOICE_NOT_PAYABLE` on pay** — already settled; poll status instead.
- Docs: [github.com/bitrefill/agents](https://github.com/bitrefill/agents), [docs.bitrefill.com](https://docs.bitrefill.com)
