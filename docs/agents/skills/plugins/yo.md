---
title: "YO Protocol Plugin"
description: "View YO vaults, check positions, deposit, and request redeem on YO's ERC-4626 yield vaults — fully on-chain reads via chain_rpc_request and unsigned calldata to send_calls on Base, Ethereum, and Arbitrum."
tags: [yield, vaults]
name: yo
version: 0.1.0
integration: semantic-base-tool
chains: [base, ethereum, arbitrum]
requires:
  shell: none
  allowlist: []
  externalMcp: null
  cliPackage: null
auth: none
risk: [slippage, irreversible]
---

# YO Protocol Plugin

> [!IMPORTANT]
> Complete the short Base MCP onboarding flow defined in `SKILL.md` before calling anything here. The user's wallet address — required for positions and writes — is fetched lazily via `get_wallets` when a flow needs it. This plugin is **100% on-chain**: it makes no HTTP calls and needs no allowlist.

## Overview

YO Protocol is an ERC-4626 yield aggregator with **ERC-7540-style async redemption**, live on Base (8453), Ethereum (1), and Arbitrum (42161). **Both deposit and withdraw go through the YO Gateway** (`0xF1EeE0957267b1A474323Ff9CfF7719E964969FA`, same address on every chain) — never direct vault calls. The Gateway handles slippage, partner attribution, and instant/async routing: a single `redeem` settles instantly when the vault has idle assets, otherwise it queues and a YO solver fulfills it on-chain within ~24h — **the user never sends a second transaction**.

This plugin builds **unsigned calldata** from a baked-in vault registry and submits it via Base MCP `send_calls`; all reads go through `chain_rpc_request` (`eth_call`). Everything is derived on-chain — no external service, no CLI, no allowlist. Live APY/yield is not on-chain data, so [getVaults](#getvaults) reports on-chain TVL and share price but **not APY**. Deposits are same-chain only — cross-chain/zap routing is out of scope; use the YO dapp for that.

## Surface Routing

Everything routes through Base MCP's own onchain tools, so the plugin behaves identically on every surface (Claude Code, Cursor, Codex, Claude.ai, ChatGPT). No shell, no allowlist.

| Capability | Path | Surface notes |
| ---------- | ---- | ------------- |
| `getVaults` (list, TVL, share price) | static registry + `chain_rpc_request` (`eth_call` → `totalAssets`/`totalSupply`) | Works everywhere. APY/yield unavailable (off-chain only). |
| `yoPositions` (balances, pending redeems) | `chain_rpc_request` (`eth_call`) | Works everywhere; block-fresh. |
| `deposit` | `chain_rpc_request` (read) → `send_calls` (write) | Works everywhere. Same-chain only. |
| `withdraw` / redeem | `chain_rpc_request` (read) → `send_calls` (write) | Works everywhere. |

No shell-less or chat-only fallback is needed because `chain_rpc_request` and `send_calls` are Base MCP server tools available on all surfaces. Operate only on `base`, `ethereum`, `arbitrum` (the chains Base MCP supports where YO is deployed). YO also has deployments on chains Base MCP can't reach (e.g. X Layer, Katana) — those are omitted; direct the user to the YO dapp for them.

## Orchestration

All reads are `chain_rpc_request{ chain, method:"eth_call", params:[{ to, data }, "latest"] }`. Encode calldata by left-padding each argument to a 32-byte word and concatenating after the 4-byte selector (see [Calldata reference](#calldata-reference)). Always pass the chain **name** (`base`/`ethereum`/`arbitrum`), never the numeric ID.

### getVaults

The vault set is the baked-in [Vault registry](#vault-registry) (verified on-chain). For live numbers, read each vault on its chain:

```
For each registry deployment {chain, share token, underlying decimals}:
  totalAssets()  → eth_call to=<share token> data="0x01e1d114"  → TVL in underlying units
  totalSupply()  → eth_call to=<share token> data="0x18160ddd"  → total shares
  sharePrice = totalAssets / totalSupply        (both raw; scale by underlying decimals to display)
Report: vault, chain(s), underlying, formatUnits(totalAssets, decimals) as TVL, sharePrice.
```

**APY/yield is not derivable on-chain**, so don't report it. If the user asks "vaults by APY," say APY isn't available from on-chain data and offer TVL/share-price instead, or point them at the YO dapp.

### yoPositions

A user's holdings, read on-chain — block-fresh. This mirrors the dapp (`usePositionValues` → `useChainSharesBalances` + `useChainConvertToAssetsBatch`): a logical position aggregates **every deployment that shares a vault `id`** across chains.

```
1. get_wallets → user
2. Build the deployment set from the registry: each row's { chain, share token, underlying symbol, underlying decimals }.
3. For each deployment, on its own chain:
   balanceOf(user)        eth_call to=<share token> data="0x70a08231"+pad32(user)   → shares   (skip if 0)
   convertToAssets(shares) eth_call to=<share token> data="0x07a2d13a"+pad32(shares) → assets (gross, no fee)
4. Aggregate by (vault id + underlying symbol) — Σ assets across deployments with the SAME underlying.
   • yoUSD on base + ethereum + arbitrum are all USDC → they SUM into one yoUSD position.
   • yoUSDT (USDT) is a yoUSD secondary but a DIFFERENT underlying → report it as its own line, do NOT add to USDC.
     (The dapp only merges them because it first converts each to USD; with no price feed, keep distinct tokens apart.)
5. Report each (vault, underlying) total as formatUnits(assets, underlying decimals) labelled in the underlying symbol
   (e.g. "yoUSD: 7.188787 USDC", "yoUSD via yoUSDT: 0.651 USDT", "yoETH: 0.001822 WETH").
6. Pending redeems — for each deployment:
   pendingRedeemRequest(user) eth_call to=<share token> data="0x53dc1dd3"+pad32(user) → (pendingAssets, pendingShares)
   Flag non-zero pendingShares as "redeem in progress (~24h, no action needed)".
```

Use **`convertToAssets`, not `previewRedeem`**, for displayed value — `previewRedeem` deducts the withdrawal fee and understates the holding. Report in underlying-asset units; do **not** attempt a USD conversion, and **never** use `get_portfolio` for YO vault tokens (its pricer mis-handles ERC-4626 shares — see [Notes](#notes)).

### deposit

Same-chain deposit only. Approve the underlying to the Gateway, then call `Gateway.deposit`.

```
1. get_wallets → user
2. Resolve vault + underlying (address, decimals) from the registry for the requested chain.
   amountIn = raw integer in the underlying's smallest unit (1 USDC = 1000000). Never scientific notation.
3. convertToShares(amountIn) eth_call to=<share token> data="0xc6e6f592"+pad32(amountIn) → expectedShares
   minSharesOut = expectedShares * (10000 - slippageBps) / 10000      (default slippageBps = 50)
4. send_calls(chain, calls=[
     { to:<underlying>, value:"0x0", data:"0x095ea7b3"+pad32(Gateway)+pad32(amountIn) },           // approve
     { to:"0xF1EeE0957267b1A474323Ff9CfF7719E964969FA", value:"0x0",
       data:"0x82b78ba7"+pad32(vault)+pad32(amountIn)+pad32(minSharesOut)+pad32(user)+pad32(partnerId) }  // deposit
   ])
5. User approves → get_request_status(requestId) → confirmed.
```

`partnerId` is `uint32` — pass `0`. For **native ETH** into yoETH there is no ERC-20 to approve: the underlying is WETH, so the user must hold WETH first (wrap, then the two-call batch above). This plugin is **same-chain only** — cross-chain/zap deposits are out of scope; use the YO dapp.

### withdraw

Approve the vault share token to the Gateway (first time only), then call `Gateway.redeem`.

```
1. get_wallets → user
2. balanceOf(user) on the share token → shares (for "withdraw all", redeem the full balance)
3. previewRedeem(shares) eth_call to=<share token> data="0x4cdad506"+pad32(shares) → expectedAssets (fee-adjusted)
   minAssetsOut = expectedAssets * (10000 - slippageBps) / 10000      (default slippageBps = 50)
4. allowance(user, Gateway) on the share token → if < shares, prepend an approve in step 5
5. send_calls(chain, calls=[
     // only if allowance < shares:
     { to:<vault>, value:"0x0", data:"0x095ea7b3"+pad32(Gateway)+pad32(maxUint256) },               // approve
     { to:"0xF1EeE0957267b1A474323Ff9CfF7719E964969FA", value:"0x0",
       data:"0x99519ab8"+pad32(vault)+pad32(shares)+pad32(minAssetsOut)+pad32(user)+pad32(partnerId) }  // redeem
   ])
6. User approves → get_request_status(requestId) → confirmed.
```

After submission the redeem either settled instantly or queued. To check progress, poll `pendingRedeemRequest(user)` on the vault — when `pendingShares == 0` and the user's underlying balance has grown, it settled. **No user-side claim transaction is needed for async redeems** — a YO solver fulfills them on-chain.

## Submission

Target tool: **`send_calls`** (EIP-5792 batch of unsigned `{ to, value, data }` calls). The plugin produces raw calldata locally — there is no semantic `swap`/`send` step and no external service in the path; reads use `chain_rpc_request` and never touch `send_calls`.

Mapping into `send_calls`:

- **`chain`** — the deployment's chain name: `base`, `ethereum`, or `arbitrum` (never the numeric ID).
- **`calls[]`** — ordered, **approval before action**:
  - deposit → `[ approve(underlying → Gateway, amountIn), Gateway.deposit(...) ]`
  - withdraw → `[ approve(vault share → Gateway, maxUint256)?, Gateway.redeem(...) ]` (approve omitted when `allowance ≥ shares`)
- Each call: `to` = target contract, `value` = `"0x0"` (no native value — yoETH uses WETH), `data` = selector + 32-byte-padded args.
- After submission, poll `get_request_status(requestId)` for confirmation. See `../references/approval-mode.md` for the approval URL flow and `../references/batch-calls.md` for batching.

## Example Prompts

**"Show me the YO vaults."**
1. List the [Vault registry](#vault-registry).
2. For each deployment on its chain: `chain_rpc_request` `totalAssets()` + `totalSupply()` → TVL and share price.
3. Present vault, chain(s), underlying, TVL, share price. Note APY isn't available on-chain.

**"What's my position in yoUSD?"**
1. `get_wallets` → user.
2. For yoUSD on `base`, `ethereum`, `arbitrum` (all USDC): `balanceOf(user)` (skip 0) → `convertToAssets(shares)`; sum the three (same underlying).
3. `pendingRedeemRequest(user)` on each → flag any in-flight redeem.
4. Report the summed total as USDC. If the user also holds yoUSDT, report it as a separate USDT line.

**"Deposit 1 USDC into yoUSD on Base."**
1. `get_wallets` → user; `amountIn = 1000000`.
2. `convertToShares(1000000)` on yoUSD/base → `expectedShares`; `minSharesOut = expectedShares*9950/10000`.
3. `send_calls(chain="base", calls=[ approve(USDC → Gateway, 1000000), Gateway.deposit(yoUSD, 1000000, minSharesOut, user, 0) ])`.
4. User approves → `get_request_status`.

**"Withdraw all my yoUSD on Base."**
1. `get_wallets` → user.
2. `balanceOf(user)` on yoUSD/base → `shares`; `previewRedeem(shares)` → `expectedAssets`; `minAssetsOut = expectedAssets*9950/10000`.
3. `allowance(user, Gateway)` → approve needed?
4. `send_calls(chain="base", calls=[ approve(yoUSD → Gateway, max)?, Gateway.redeem(yoUSD, shares, minAssetsOut, user, 0) ])`.
5. User approves → `get_request_status`.

## Risks & Warnings

- **slippage** — deposits set `minSharesOut` and withdraws set `minAssetsOut` from a fresh on-chain quote with a default 50 bps tolerance; the call reverts rather than filling materially worse. Show the user the expected shares/assets before they approve. Never silently widen slippage — if a quote looks off, stop and surface it.
- **irreversible** — `send_calls` broadcasts on-chain writes that cannot be undone. Verify vault address, amount, recipient (`user`), and chain before presenting the approval. A queued async redeem settles on its own (~24h) — don't resubmit it as a second transaction.
- Never ask for or use a private key. Never use a local signer, `cast send`, or browser-wallet helper. Do not sign or broadcast outside Base MCP.
- Approvals go to the **Gateway**, not the vault: underlying-token approve for deposits, vault-share approve for withdraws.
- `amountIn` / `shares` are raw base-unit integer strings — never scientific notation.

## Notes

### Chains

| Chain    | ID    | Base MCP `chain` |
| -------- | ----- | ---------------- |
| Base     | 8453  | `base`           |
| Ethereum | 1     | `ethereum`       |
| Arbitrum | 42161 | `arbitrum`       |

The same vault `id` is deployed at the **same share-token address on every chain** (e.g. yoUSD is `0x0000000f…` on Base, Ethereum, and Arbitrum) — the differentiator is the chain you call it on.

### Vault registry

Baked-in and **verified on-chain** (symbol, decimals, and `asset()` read live on each chain). One row per deployment; the `share token` is the ERC-4626 vault you read/redeem, the `underlying` is what you approve for deposits.

| Vault     | Chain    | Share token (vault)                          | Sh. dec | Underlying | Underlying address                           |
| --------- | -------- | -------------------------------------------- | ------- | ---------- | -------------------------------------------- |
| `yoETH`   | base     | `0x3A43AEC53490CB9Fa922847385D82fe25d0E9De7` | 18      | WETH       | `0x4200000000000000000000000000000000000006` |
| `yoETH`   | ethereum | `0x3A43AEC53490CB9Fa922847385D82fe25d0E9De7` | 18      | WETH       | `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2` |
| `yoBTC`   | base     | `0xbCbc8cb4D1e8ED048a6276a5E94A3e952660BcbC` | 8       | cbBTC      | `0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf` |
| `yoBTC`   | ethereum | `0xbCbc8cb4D1e8ED048a6276a5E94A3e952660BcbC` | 8       | cbBTC      | `0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf` |
| `yoUSD`   | base     | `0x0000000f2eB9f69274678c76222B35eEc7588a65` | 6       | USDC       | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| `yoUSD`   | ethereum | `0x0000000f2eB9f69274678c76222B35eEc7588a65` | 6       | USDC       | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` |
| `yoUSD`   | arbitrum | `0x0000000f2eB9f69274678c76222B35eEc7588a65` | 6       | USDC       | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` |
| `yoEUR`   | base     | `0x50c749aE210D3977ADC824AE11F3c7fd10c871e9` | 6       | EURC       | `0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42` |
| `yoEUR`   | ethereum | `0x50c749aE210D3977ADC824AE11F3c7fd10c871e9` | 6       | EURC       | `0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c` |
| `yoloUSD` | base     | `0x5DD8BFa6C5C68D05d25EF6143E05C11E26c4cDB7` | 6       | USDC       | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| `yoloUSD` | ethereum | `0x5DD8BFa6C5C68D05d25EF6143E05C11E26c4cDB7` | 6       | USDC       | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` |
| `yoloUSD` | arbitrum | `0x5DD8BFa6C5C68D05d25EF6143E05C11E26c4cDB7` | 6       | USDC       | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` |
| `yoGOLD`  | ethereum | `0x586675A3a46B008d8408933cf42d8ff6c9CC61a1` | 6       | XAUt       | `0x68749665FF8D2d112Fa859AA293F07A622782F38` |
| `yoUSDT`  | ethereum | `0xb9a7da9e90D3B428083BAe04b860faA6325b721e` | 6       | USDT       | `0xdAC17F958D2ee523a2206206994597C13D831ec7` |

The share-token address is identical across a vault's chains; only the **underlying address** differs per chain (e.g. WETH is `0x4200…0006` on Base but `0xC02a…56Cc2` on Ethereum). Deployments that share a vault `id` **and** the same underlying symbol sum into one position — `yoUSD` (USDC on base/eth/arb), `yoETH` (WETH on base/eth), `yoBTC` (cbBTC on base/eth), `yoEUR` (EURC on base/eth), `yoloUSD` (USDC on base/eth/arb). `yoUSDT` is a yoUSD secondary with a **different** underlying (USDT) — report it as its own USDT line, never added to the USDC total. `yoUSD` is also deployed on X Layer (196, USDTO) and Katana (747474, vbUSDC); Base MCP can't reach those, so they're omitted from on-chain totals — note that to the user and point them at the YO dapp.

**Gateway:** `0xF1EeE0957267b1A474323Ff9CfF7719E964969FA` — verified deployed on Base, Ethereum, and Arbitrum (identical bytecode). It is the spender for **all** approvals: approve the **underlying** for deposits, the **vault share token** for withdraws.

> [!CAUTION]
> **Never report YO positions from `get_portfolio`.** Its pricer does not understand ERC-4626 vault shares and mis-prices them by 10–10,000×. Report positions in underlying-asset units from `convertToAssets(shares)` instead. `get_portfolio` is fine for plain ERC-20 holdings — just not YO vault tokens.

### Calldata reference

Encode args by left-padding each value to a 32-byte word and concatenating after the 4-byte selector.

**Read selectors** (`eth_call` against the share token):

| Function                        | Selector     | Args             | Returns                      |
| ------------------------------- | ------------ | ---------------- | ---------------------------- |
| `balanceOf(address)`            | `0x70a08231` | `user`           | shares                       |
| `convertToAssets(uint256)`      | `0x07a2d13a` | `shares`         | assets (gross, **no fee**)   |
| `convertToShares(uint256)`      | `0xc6e6f592` | `assets`         | shares                       |
| `previewRedeem(uint256)`        | `0x4cdad506` | `shares`         | assets (fee-adjusted)        |
| `pendingRedeemRequest(address)` | `0x53dc1dd3` | `user`           | `(assets, pendingShares)`    |
| `allowance(address,address)`    | `0xdd62ed3e` | `owner, spender` | current allowance            |
| `totalAssets()`                 | `0x01e1d114` | —                | vault TVL (underlying units) |
| `totalSupply()`                 | `0x18160ddd` | —                | total shares                 |

**Write selectors** (`send_calls` calldata):

| Function                                                  | Selector     | Target              |
| --------------------------------------------------------- | ------------ | ------------------- |
| ERC-20 `approve(address,uint256)`                         | `0x095ea7b3` | underlying or vault |
| Gateway `deposit(address,uint256,uint256,address,uint32)` | `0x82b78ba7` | Gateway             |
| Gateway `redeem(address,uint256,uint256,address,uint32)`  | `0x99519ab8` | Gateway             |

> [!WARNING]
> `partnerId` is **`uint32`**. Encoding it as `uint256` changes the selector to a function that does not exist on the Gateway and the call reverts. The signature must be exactly `(address,uint256,uint256,address,uint32)`. Pass `partnerId = 0` when no partner ID is assigned. `maxUint256` = `0xff…ff` (64 f's).
