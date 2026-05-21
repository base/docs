---
title: "Base MCP Skill"
description: "Base MCP — gives your AI assistant access to a Base account via the Base MCP server (mcp.base.org). Wallet, portfolio, sending, swapping, signing, batched contract calls, and transaction history on Base."
name: base-mcp
version: 0.2.0
---

# Base MCP

> [!IMPORTANT]
> ## Run onboarding at the start of every conversation that touches Base MCP
>
> Including conversations that jump straight to a plugin topic. Onboarding is short — see below.

## How this skill loads references and plugins

This skill is intentionally lightweight. The detailed reference and plugin files are **not bundled** — fetch them on demand from the Base docs site using `web_request` (or the harness's HTTP tool, if available). Always fetch the URLs exactly as written below — they end in `.md` so you get clean markdown instead of rendered HTML.

Only fetch a reference or plugin file the first time you need it in a session; once loaded, its contents are in your context.

## Detection

The Base MCP exposes its tools to the harness when connected. If no Base MCP tool is callable, the MCP server is not installed: direct the user to `https://docs.base.org/ai-agents/quickstart` (or fetch `https://base-a060aa97-youssef-update-agents.mintlify.app/ai-agents/skills/references/install.md` for app-specific steps) and stop.

If Base MCP tools are available, fetch `https://base-a060aa97-youssef-update-agents.mintlify.app/ai-agents/skills/references/tone.md` — its rules apply for the entire conversation — then continue to Onboarding.

## Onboarding

Keep it short. Do this once per session, before doing real work:

1. **Briefly mention what's available** — one or two sentences. The user has a Base account wallet and can do things like check balances, send and swap tokens, sign messages, batch contract calls, and (if installed) use partner plugins for DeFi, swaps, and other onchain actions. Do not enumerate every tool — the agent discovers tools and plugins directly from the MCP.

2. **Show this disclaimer verbatim** before proceeding:

   > By using the Base MCP, you agree to the Base Account and Base App Terms of Service. Plugins available in the Base repo are authored by Base, not by the third-party protocols they reference.

3. **Wallet address and balance are optional** — only fetch and display them when the user asks, or when a pending operation actually needs the address (e.g., a write call, a position lookup). Don't volunteer a wallet dump up front.

## Tools

The Base MCP advertises its own tool catalog to the harness. Read the tool descriptions exposed by the MCP — they are the source of truth and may change over time. Do not assume a fixed list; do not preload a tool catalog from this skill.

Two patterns deserve their own references because they span multiple tools. Fetch each one only when you need it:

| Topic | Fetch from |
|-------|-----------|
| Approval flow (for any write tool that returns an approval URL) | `https://base-a060aa97-youssef-update-agents.mintlify.app/ai-agents/skills/references/approval-mode.md` |
| Batched contract calls (EIP-5792) | `https://base-a060aa97-youssef-update-agents.mintlify.app/ai-agents/skills/references/batch-calls.md` |
| Custom / non-native plugins and the `web_request` allowlist | `https://base-a060aa97-youssef-update-agents.mintlify.app/ai-agents/skills/references/custom-plugins.md` |
| Platform install steps | `https://base-a060aa97-youssef-update-agents.mintlify.app/ai-agents/skills/references/install.md` |
| Tone and language rules | `https://base-a060aa97-youssef-update-agents.mintlify.app/ai-agents/skills/references/tone.md` |

## Plugins

Plugins extend Base MCP with partner-specific functionality (lending, swaps, perps, etc.). The available set may change and users might drop additional instructions in the chat or custom plugins that would allow you to use other protocols with the MCP.

Plugins currently maintained alongside this skill (the **native plugins**):

| Plugin | Fetch from |
|--------|-----------|
| Morpho | `https://base-a060aa97-youssef-update-agents.mintlify.app/ai-agents/skills/plugins/morpho.md` |
| Moonwell | `https://base-a060aa97-youssef-update-agents.mintlify.app/ai-agents/skills/plugins/moonwell.md` |
| Uniswap | `https://base-a060aa97-youssef-update-agents.mintlify.app/ai-agents/skills/plugins/uniswap.md` |
| Avantis | `https://base-a060aa97-youssef-update-agents.mintlify.app/ai-agents/skills/plugins/avantis.md` |

Fetch a plugin reference only when the user's request matches it. For a plugin's own tools, defer to the descriptions the plugin's MCP exposes — this skill does not duplicate them.

### Native plugins vs. custom / user-supplied plugins

Native plugins are allowlisted in the Base MCP `web_request` tool and work everywhere. Custom or user-supplied plugins usually aren't allowlisted — fetch `https://base-a060aa97-youssef-update-agents.mintlify.app/ai-agents/skills/references/custom-plugins.md` for the decision tree on which HTTP path to use (harness HTTP tool vs. user-paste fallback, and the GET-only constraint on Claude/ChatGPT consumer surfaces).
