---
title: "Custom Plugins and the web_request Allowlist"
description: "Skill reference for how Base MCP routes plugin HTTP calls and which surfaces are allowlisted."
---

# Custom / Non-Native Plugins and the `web_request` Allowlist

The native plugins shipped with this skill (Morpho, Moonwell, Uniswap, Avantis) have their HTTP APIs **allowlisted in the Base MCP `web_request` tool**. This matters because Claude and ChatGPT restrict which APIs an agent can call directly from their surface — `web_request` is what makes those calls possible.

Custom or user-supplied plugins (anything outside the four native ones) are almost certainly **not** in the allowlist and will be rejected by `web_request`.

## Priority order for HTTP calls

Use this order **for every plugin call — native or not**:

### 1. Harness HTTP tool (preferred whenever available)

If the current environment lets you call HTTP APIs directly — e.g. Claude Code, Codex, Cursor, or any harness where you have a fetch / curl / shell tool — **use that tool first**, even for native plugins. It supports any HTTP method (GET, POST, etc.), avoids the allowlist entirely, and gives you the full response without round-tripping through the MCP.

Only fall back to `web_request` if you don't have a usable HTTP tool in the current harness.

### 2. `web_request` (when no harness HTTP tool exists)

If the harness has no direct HTTP capability, route the call through Base MCP's `web_request`:

- **Native plugin host** — works out of the box (the host is allowlisted).
- **Non-native plugin host** — will be rejected. Do not silently retry. Move to path 3.

### 3. User-paste fallback (Claude / ChatGPT consumer surfaces, non-native hosts)

Claude and ChatGPT *can* fetch GET URLs themselves, but for security reasons they will only fetch URLs that the **user has pasted into the chat**. The agent cannot freely construct and fetch arbitrary URLs on its own.

That makes the fallback effectively **GET-only**: there's no equivalent escape hatch for POST/PUT/DELETE with custom headers and a body, because the user can't realistically inject those into the chat in a fetchable form.

So for non-native plugins on Claude / ChatGPT consumer surfaces:

- **Only GET-style APIs are viable.** If the protocol's API requires POST or other write methods to retrieve calldata, surface this limitation to the user — explain that their environment can't perform the fetch and that they would need a harness with HTTP tools (e.g. Claude Code) to proceed.
- For GET endpoints:
  1. Construct the full URL with every query parameter encoded inline (address, amount, slippage, chain, etc.).
  2. Show the URL to the user and ask them to paste it back into the chat. Once pasted, you can fetch it yourself — that's the security model these surfaces enforce.
  3. Parse the response and continue the flow (e.g. map returned calldata into the batched-calls tool, then walk through the approval flow — see [approval-mode.md](approval-mode.md) and [batch-calls.md](batch-calls.md)).

## Decision summary

| Situation | What to do |
|-----------|------------|
| Any plugin, harness has an HTTP tool (Claude Code, Codex, Cursor, …) | **Use the harness's HTTP tool first.** Any method is fine. Don't route through `web_request` when a direct call is available. |
| Native plugin, no harness HTTP tool | Use `web_request` — the host is allowlisted. |
| Non-native plugin, no harness HTTP tool (Claude / ChatGPT consumer apps) | GET only. Construct the URL, ask the user to paste it into the chat so you're allowed to fetch it, then parse the response. If the API needs POST, tell the user this surface can't support it. |
