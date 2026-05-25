---
title: "Morpho Plugin"
description: "Skill plugin reference for lending on Morpho through Base MCP."
---

# Morpho Plugin

> [!IMPORTANT]
> Complete the short Base MCP onboarding flow defined in `SKILL.md` before calling any Morpho tool — the user's wallet address (required by Morpho write/position calls) is fetched lazily, and the disclaimer must be shown once per session.

Morpho is a lending protocol on Base. The Morpho MCP server prepares lending operations (deposit, borrow, withdraw, repay, supply collateral) and returns unsigned calldata that is then executed via Base MCP's batched-calls tool.

The exact list of Morpho tools, their parameters, and supported chains are exposed by the Morpho MCP itself — read its tool descriptions rather than relying on a fixed catalog in this file. Tools may be added, renamed, or removed over time.

## MCP Server

URL: `https://mcp.morpho.org/`

## Detection

If no `morpho` tools are exposed to the harness, the Morpho MCP isn't installed — don't try to reach the Morpho API directly (the prepare/simulate flows require the MCP). Instead, help the user install it for their current surface. Detect the harness from environment signals (available CLIs like `claude` / `codex` / `cursor`, working directory, tool names) and walk through the matching step:

- **Claude Code:** `claude mcp add morpho --transport http https://mcp.morpho.org/`
- **Codex:** `codex mcp add morpho --url https://mcp.morpho.org/` (or add `[mcp_servers.morpho] url = "https://mcp.morpho.org/"` to `codex.toml`)
- **Cursor / JSON-config harnesses:** add the snippet from [Installation](#installation-alongside-base-mcp) to the harness's MCP config (e.g. `~/.cursor/mcp.json` or the project's `.cursor/mcp.json`) and restart it.
- **Claude.ai web / Claude Desktop / iOS / Android:** Customize → Connectors → Add custom connector, name `morpho`, URL `https://mcp.morpho.org/`.
- **ChatGPT:** Settings → Connectors → Create, name `morpho`, MCP Server URL `https://mcp.morpho.org/`, Authentication `OAuth` (enable Developer Mode if prompted).
- **Other / unknown harness:** show the JSON snippet from [Installation](#installation-alongside-base-mcp) and ask the user where their MCP config lives.

After install, ask the user to reconnect or restart the session so the new tools register, then retry the original request.

## Orchestration Pattern

Morpho's prepare-style tools (deposit, withdraw, supply, borrow, repay, supply/withdraw collateral) return an unsigned `calls` array plus a `chainId`. Pass them straight to Base MCP's batched-calls tool.

```
morpho prepare tool → { calls: [...], chainId }
   ↓
batched-calls tool (chainId, calls) → approval URL + request ID
   ↓ user approves
status-poll tool (request ID) → confirmed
```

See [../references/batch-calls.md](../references/batch-calls.md) and [../references/approval-mode.md](../references/approval-mode.md).

## Example Prompts

```
Find the best USDC vault on Base by APY and deposit 100 USDC
```
1. Query Morpho vaults filtered by USDC, sorted by APY.
2. Call the Morpho prepare-deposit tool for the chosen vault and amount.
3. Pass the returned `calls` + `chainId` to Base MCP's batched-calls tool.
4. Hand the user the approval link; once they confirm, poll the request status.

```
Show all my Morpho positions on Base
```
1. Fetch the user's address (if not already known).
2. Call the Morpho positions tool with that address.

```
Check if my Morpho borrow position is healthy
```
1. Fetch the user's address.
2. Call the Morpho positions tool and report the health factor from the response.

## Important Notes

- Morpho's prepare tools typically simulate before returning — review simulation output before submitting the batch.
- Use the Morpho simulation tool for novel or large operations.
- Always check the supported-chains tool for the current list rather than assuming a fixed set.
