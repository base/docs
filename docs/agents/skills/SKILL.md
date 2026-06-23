---
title: "Base MCP Skill"
description: "Base MCP — gives your AI assistant access to a Base Account via the Base MCP server (mcp.base.org). Wallet, portfolio, sending, swapping, signing, x402 payments, batched contract calls, and transaction history across supported chains."
name: base-mcp
version: 0.1.0
---

# Base MCP

> [!IMPORTANT]
> ## Run onboarding at the start of every conversation that touches Base MCP
>
> Including conversations that jump straight to a plugin topic. Onboarding is short — see below.

## Detection

The Base MCP exposes its tools to the harness when connected. If no Base MCP tool is callable, the MCP server is not installed: direct the user to https://docs.base.org/ai-agents/quickstart (or load [references/install.md](references/install.md) for app-specific steps) and stop.

If Base MCP tools are available, load [references/tone.md](references/tone.md) — its rules apply for the entire conversation — then continue to Onboarding. If — and only if — sibling files aren't readable (e.g. you were handed just this `SKILL.md` body and have no local filesystem access to the skill directory), fetch the same relative path from `https://docs.base.org/ai-agents/skills/references/tone.md` using the `web_request` tool from Base MCP. The same fallback applies to every other reference and plugin link in this file (see "Loading referenced files" below).

## Onboarding

Keep it short. Do this once per session, before doing real work:

1. **Briefly mention what's available** — one or two sentences. The user has a Base Account wallet and can do things like check balances, send and swap tokens, sign messages, make x402 payments, batch contract calls, and (if installed) use partner plugins for DeFi, swaps, and other onchain actions. Do not enumerate every tool — the agent discovers tools and plugins directly from the MCP.

2. **Show this disclaimer verbatim** before proceeding:

   > By using the Base MCP, you agree to the [Base Account and Base App Terms of Service](https://wallet.coinbase.com/terms-of-service). Base MCP provides access to plugins that are built by third parties, not Base. Base doesn't operate, endorse, or audit them, and isn't responsible for the protocols you interact with. Transactions are irreversible — always review before approving.

3. **Wallet address and balance are optional** — only fetch and display them when the user asks, or when a pending operation actually needs the address (e.g., a write call, a position lookup). Don't volunteer a wallet dump up front.

## Tools

The Base MCP advertises its own tool catalog to the harness. Read the tool descriptions exposed by the MCP — they are the source of truth and may change over time. Do not assume a fixed list; do not preload a tool catalog from this skill.

Two patterns deserve their own references because they span multiple tools:

| Topic | Reference |
|-------|-----------|
| Approval flow (for any write tool that returns an approval URL) | [references/approval-mode.md](references/approval-mode.md) |
| Batched contract calls (EIP-5792) | [references/batch-calls.md](references/batch-calls.md) |
| Custom / non-native plugins and the `web_request` allowlist | [references/custom-plugins.md](references/custom-plugins.md) |
| Platform install steps | [references/install.md](references/install.md) |
| Tone and language rules | [references/tone.md](references/tone.md) |

### Loading referenced files

- **Default — local.** Read each `references/…` or `plugins/…` link from the same directory as this `SKILL.md` (filesystem read, e.g. `Read`/`cat`). This is the canonical source — always try this first.
- **Fallback — web (only when local read fails).** If — and only if — the local file is genuinely unreadable (e.g. you were handed `SKILL.md` as a pasted body with no skill directory on disk, or the filesystem read errors), then fetch the same relative path from `https://docs.base.org/ai-agents/skills/<path>` (replace `<path>` with the relative link, e.g. `references/tone.md`, `plugins/morpho.md`). Use the `web_request` tool from Base MCP for this fetch — that is the required mechanism on every surface, including ones with a built-in web/fetch tool. Do not skip this fallback and do not try to operate from memory or guesses — if the local read fails, you must `web_request` the file before acting on its contents.
- **Lazy.** Only load a reference or plugin when the conversation actually needs it. Don't preload the catalog.

## Plugins

Plugins extend Base MCP with partner-specific functionality (lending, swaps, perps, etc.). The available set may change and users might drop additional instructions in the chat or custom plugins that would allow you to use other protocols with the MCP.

Plugins currently maintained alongside this skill (the **native plugins**). Use this as a routing map: match the user's plain-language goal to a row, then open that plugin before taking action.

| Plugin | Open it when the user wants to... | Common actions it covers | Notice before acting |
|--------|----------------------------------|--------------------------|----------------------|
| [Aerodrome](plugins/aerodrome.md) | Swap, provide liquidity, stake, or claim rewards on Aerodrome. | Pool discovery, swaps, LP add/remove, staking, unstaking, reward claims. | Base only. Requires a shell-capable harness for the Sugar CLI; stop on chat-only surfaces. |
| [Avantis](plugins/avantis.md) | Trade leveraged perpetual futures or inspect Avantis trading activity. | Open/close positions, cancel orders, adjust margin, set TP/SL, view positions, history, and PnL. | Base only. Leverage can liquidate the position; chat-only surfaces can read data but use the Avantis UI for trade actions. |
| [Balancer](plugins/balancer.md) | Swap tokens or provide liquidity on Balancer. | Read pools/quotes, build swap calldata, add/remove liquidity, submit via `send_calls`. | CLI-only — requires shell access; stop on chat-only surfaces. Multi-chain (Base, Ethereum, Arbitrum, Optimism, Avalanche); confirm slippage and low-liquidity risk. |
| [Bankr](plugins/bankr.md) | Discover fresh token launches or buy a newly launched token. | Read launch feeds, inspect token metadata, buy a selected token. | Base only. New tokens can be illiquid or unsafe; do not auto-buy, and make price/liquidity risk explicit. |
| [Bitrefill](plugins/bitrefill.md) | Buy gift cards, mobile top-ups, or travel eSIMs paid with USDC. | Search 1,500+ brands, check out, deliver gift-card codes and eSIM details in chat. | Base only. Requires SIWE login; purchases are irreversible and handle personal data — confirm order details before paying. |
| [Brickken](plugins/brickken.md) | Manage ERC-8004 agent identity, reputation, or agent-token operations on Brickken. | Identity and reputation reads/writes, agent-token operations via x402 approval. | Base and Base Sepolia. Writes are irreversible and may involve personal data; review before approving. |
| [Clawnch](plugins/clawnch.md) | Discover recent/top token launches or launch a token on Clawnch. | Browse launch feeds, inspect tokens, non-custodial launch, swap via `send_calls`. | Base only. New tokens can be illiquid or unsafe and launches are irreversible; make risk explicit. |
| [Flaunch](plugins/flaunch.md) | Launch a token on Flaunch or discover/swap deployed Flaunch tokens. | Prepare launches via `mcp.flaunch.gg`, discover tokens, swap, submit via `send_calls`. | Base only. New tokens can be illiquid; launches and swaps are irreversible — confirm details first. |
| [GMGN](plugins/gmgn.md) | Get token swap quotes, gas prices, or trending-token market intelligence on Base via GMGN. | Swap quotes (unsigned calldata via `send_calls`), gas-price tiers, trending tokens. | Base only. CLI-only — requires shell to generate auth params; API key auth. Confirm slippage and watch low-liquidity tokens. |
| [Hydrex](plugins/hydrex.md) | Swap tokens or manage concentrated-liquidity positions on Hydrex. | Quotes, swaps, concentrated-liquidity add/remove, submit via `send_calls`. | Base only. Quotes can move; confirm slippage before writes. |
| [KyberSwap](plugins/kyberswap.md) | Swap tokens at best aggregated rates across chains. | Best-rate routing through 50+ liquidity sources, quotes, swaps via `send_calls`. | Multi-chain (Base, Ethereum, Arbitrum, Optimism, Polygon, BSC, Avalanche); quotes can move, confirm slippage before swapping. |
| [Moonwell](plugins/moonwell.md) | Lend, borrow, repay, withdraw, or check Moonwell positions/rewards. | Market/rate reads, health checks, supply, withdraw, borrow, repay, rewards lookup. | Works on Base and Optimism. Borrowing can be liquidated; surface health factor before risky actions. |
| [Morpho](plugins/morpho.md) | Earn yield, use Morpho vaults, or borrow/lend in Morpho markets. | Compare vaults, deposit or withdraw, supply collateral, borrow, repay, check positions. | Base only. Borrowing can be liquidated; read health/position data before preparing writes. |
| [o1.exchange](plugins/o1-exchange.md) | Swap tokens on o1.exchange, optionally with Permit2 gasless approvals and MEV-protected routing. | Quotes, standard swaps via `send_calls`, Permit2 swaps via private relay. | Multi-chain (Base, BSC). Quotes can move and swaps are irreversible; confirm slippage and watch for low-liquidity tokens. |
| [OpenSea](plugins/opensea.md) | Trade NFTs, swap tokens, or mint drops on OpenSea. | NFT buy/sell/list, token swaps, drops/minting, submit via `send_calls`. | Multi-chain (Ethereum, Base, Polygon, Arbitrum, Optimism, Avalanche). Requires an API key; trades are irreversible — confirm token, price, and slippage first. |
| [Printr](plugins/printr.md) | Launch a cross-chain token on Printr. | Prepare token-creation calldata via HTTP API, submit via `send_calls`. | Multi-chain (Base, Arbitrum, Optimism, Polygon, BSC, Avalanche, Ethereum). New tokens can be illiquid; launches are irreversible. |
| [Uniswap](plugins/uniswap.md) | Swap tokens or manage Uniswap liquidity positions. | Token swaps, approval checks, V2/V3/V4 LP create/increase/decrease/collect flows. | Base only. Quotes can move; confirm slippage and token/position details before writes. |
| [Venice](plugins/venice.md) | Run private AI inference or media generation, optionally funded with x402. | Text and media inference via the Venice API, optional Base x402 wallet funding. | Base only. Requires SIWE login; inference handles personal data and paid calls are irreversible. |
| [Virtuals](plugins/virtuals.md) | Create or operate Virtuals AI agents, payment cards, or agent email. | Agent management, card setup and limits, email inbox/thread actions, SIWE login. | Requires the Virtuals MCP and a signed login. Handles personal data; avoid exposing tokens, OTPs, card details, or email contents unnecessarily. |
| [YO](plugins/yo.md) | View YO vaults, check positions, deposit, or request redeem on YO yield vaults. | ERC-4626 vault reads via `chain_rpc_request`, deposit, request redeem via `send_calls`. | Multi-chain (Base, Ethereum, Arbitrum). Deposits and redeems are irreversible; confirm amounts and vault before writes. |

Load a plugin reference only when the user's request matches it, following the same local-first, web-fallback rule as references (see [Loading referenced files](#loading-referenced-files) above). For a plugin's own external tools, defer to the plugin file first, then to any CLI help, API schema, or MCP tool descriptions it explicitly tells you to use.

### Native plugins vs. custom / user-supplied plugins

Native plugin HTTP hosts may be allowlisted in the Base MCP `web_request` tool. Aerodrome, Balancer, and GMGN are CLI-only and require a harness with shell access. Avantis is hybrid: view-only reads (market data, positions, PnL) work on every surface via `web_request`, while tx-builder calls require a CLI harness — on chat-only surfaces the plugin links the user to the Avantis web UI instead (see [plugins/avantis.md](plugins/avantis.md)). Morpho is hybrid too: use Morpho CLI when shell access exists, otherwise use or install the Morpho MCP as described in [plugins/morpho.md](plugins/morpho.md). Custom or user-supplied plugins usually aren't allowlisted — load [references/custom-plugins.md](references/custom-plugins.md) for the decision tree on which HTTP path to use (harness HTTP tool vs. user-paste fallback, and the GET-only constraint on Claude/ChatGPT consumer surfaces).

## Installation

```bash
npx skills add base/skills --skill base-mcp
```
