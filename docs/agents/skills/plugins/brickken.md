---
title: "Brickken Plugin"
description: "ERC-8004 identity, reputation, and agent-token operations through Brickken with Base MCP x402 approval."
tags: [ai-agents, agent-commerce, token-launches]
name: brickken
version: 0.2.0
integration: hybrid
chains: [base, base-sepolia]
requires:
  shell: optional
  allowlist: [mcp.brickken.com]
  externalMcp: null
  cliPackage: npx brickken-cli
auth: none
risk: [irreversible, pii]
---

# Brickken Plugin

> [!IMPORTANT]
> Run Base MCP onboarding first (see `SKILL.md`). Exposed Brickken MCP tools, hosted Brickken MCP HTTP API, or CLI prepare the operation; Base MCP collects the x402 approval. Brickken's relayer signs, pays native gas, and broadcasts.

## Overview

Brickken provides ERC-8004 identity, reputation, and agent-token operations on Base mainnet, with Base Sepolia available for tests. Prepare is free through exposed Brickken MCP tools, the hosted Brickken MCP HTTP API (`https://mcp.brickken.com/mcp`), or the Brickken CLI. Paid execution goes through Base MCP `initiate_x402_request` and `complete_x402_request`.

Brickken is initially the onchain operator in `brickken-relayed` mode. `agentSetWallet` changes the ERC-8004 operational wallet but does not transfer the ERC-721 identity. Transfer custody explicitly with `agentTransferOwnership` only when the user requests it.

## Detection

Use this routing order:

1. If Brickken MCP tools are already exposed (`prepare_transactions`, `get_transaction_status`), call them directly.
2. Otherwise, if the harness has an HTTP tool and `mcp.brickken.com` is reachable via allowlist, call the hosted Brickken MCP API over HTTP.
3. With shell access, Brickken CLI is an alternative for prepare/status workflows.

Do not stop on shell-less surfaces when HTTP is available: the hosted Brickken MCP API is a valid fallback.

Regardless of the prepare surface, use Base MCP for x402 approval.

## Installation

Optional Brickken MCP connector install (convenience path):

```bash
claude mcp add --transport http brickken https://mcp.brickken.com/mcp
```

Brickken CLI for shell-capable harnesses:

```bash
npx brickken-cli --help
```

Use the CLI in prepare/status mode only. Base MCP remains responsible for x402 approval and completion.

## Endpoints

Hosted Brickken MCP endpoint:

- `POST https://mcp.brickken.com/mcp`
- `Content-Type: application/json`
- `Accept: application/json, text/event-stream`

JSON-RPC shape:

```json
{
  "jsonrpc": "2.0",
  "id": "prepare-1",
  "method": "tools/call",
  "params": {
    "name": "prepare_transactions",
    "arguments": {
      "method": "agentRegister",
      "chainId": "84532",
      "executionMode": "brickken-relayed",
      "name": "My Agent",
      "description": "Example",
      "image": "https://example.com/logo.png",
      "services": [
        {
          "name": "demo",
          "description": "demo service",
          "endpoint": "https://example.com"
        }
      ]
    }
  }
}
```

Response handling:

- Some harnesses return plain JSON-RPC `result`.
- Some stream SSE chunks; parse the final JSON object.
- MCP wrappers may place payload in `result.content[0].text` as a JSON string; parse and unwrap before mapping to `txId`, `transactions`, and `x402Requirements`.

## Surface Routing

| Step | Shell-capable harness | Shell-less / chat-only |
|---|---|---|
| Prepare, free | Brickken MCP tools, hosted HTTP API, or CLI | Brickken MCP tools or hosted HTTP API |
| Approve x402 | Base MCP `initiate_x402_request` | Base MCP `initiate_x402_request` |
| Execute | Base MCP `complete_x402_request` | Base MCP `complete_x402_request` |
| Poll pending operation | Brickken MCP tools, hosted HTTP API, or CLI | Brickken MCP tools or hosted HTTP API |

## Commands

Use Brickken `prepare_transactions` through exposed MCP tools, hosted HTTP API (`tools/call`), or `brickken tx prepare --method <method> --file <json> --json` with `executionMode: "brickken-relayed"`. Use `chainId: "8453"` for Base mainnet and `chainId: "84532"` for Base Sepolia tests. Omit `signerAddress` in relayed mode. For `agentCreateToken`, omit `agentWallet`.

`agentRegister` requires `name`, `description`, `image`, and a non-empty `services` array. `image` must be a publicly reachable HTTPS URL for the agent logo; do not use a local path or omit it. Ask for the user's logo, or use an explicitly authorized test fixture.

Supported methods:

- Identity: `agentRegister`, `agentSetURI`, `agentSetMetadata`, `agentSetWallet`, `agentTransferOwnership`.
- Reputation: `agentGiveFeedback`, `agentRevokeFeedback`, `agentAppendFeedbackResponse`.
- Agent tokens: `agentCreateToken`, `agentMintToken`, `agentBurnToken`, `agentTransferToken`, `agentTransferFromToken`, `agentApproveToken`.

Prepare returns one `txId`, one unsigned transaction, and `x402Requirements`. If MCP or CLI wraps these fields under `prepared`, unwrap that object before submission.

For pending operations, use Brickken `get_transaction_status` through exposed MCP tools or hosted HTTP API, or:

```bash
brickken tx status --hash <operation-hash> --json
```

### Ownership transfer

Prepare `agentTransferOwnership` with `agentUuid` or `agentId` and `newOwner`. This creates an ERC-721 `safeTransferFrom` from Brickken custody to the requested wallet.

Ownership transfer is separate from `agentSetWallet`. After transfer, Brickken's relayer can no longer perform owner-only operations unless ownership is returned.

### Base Sepolia testing

- Use operation and payment network `eip155:84532` (`base-sepolia` in Base MCP).
- The Brickken x402 test USDC is Circle USDC `0x036CbD53842c5426634e7929541eC2318f3dCF7e` with 6 decimals, settled via EIP-3009 (EIP-712 name `USDC`, version `2`, authorization window 300s).
- Always fund and pay with the exact asset quoted in `x402Requirements`; do not substitute another token.
- Expected ERC-8004 test registries are identity `0x8004A818BFB912233c491871b3d84c89A494BD9e` and reputation `0x8004B663056A597Dffe9eCcC1965A193B7388713`.
- Before initiating x402, verify the payer holds the asset returned by `x402Requirements`. Testnet balances may not appear in portfolio indexing; use a Base Sepolia `balanceOf` RPC read when necessary.
- If prepare reports that the registry is not configured, stop. No valid `txId` exists and no payment should be initiated.

## Orchestration

1. Confirm the target (`base` or `base-sepolia`), the irreversible action, custody, and any public or PII fields.
2. Prepare through exposed Brickken MCP tools, hosted HTTP API, or CLI with `chainId: "8453"` for mainnet or `"84532"` for tests and `executionMode: "brickken-relayed"`.
3. Require a scalar `txId` and exactly one transaction. Preserve `to`, `data`, and `value` exactly.
4. Validate that the quote network matches the operation network and that the payer holds the exact quoted asset. On Base Sepolia require Circle USDC `0x036CbD53842c5426634e7929541eC2318f3dCF7e`. Parse the exact decimal from `extra.displayPrice` as `maxPayment`.
5. Call Base MCP `initiate_x402_request` with method `POST`, the active Brickken environment's `/send-transactions` resource, the prepared body, and `maxPayment`. Do not switch environments between prepare and send.
6. Show the approval URL. Poll Base MCP `get_request_status` only after the user acts, then call `complete_x402_request(requestId)`.
7. Report confirmed only when Brickken returns `status: "confirmed"` and a transaction hash.
8. On `status: "pending"`, use Brickken `get_transaction_status` through exposed MCP tools or hosted HTTP API, or `brickken tx status`. Do not resubmit or pay the same `txId` again. Brickken's reconciliation settles after confirmation or releases on revert/authorization expiry.
9. To transfer an identity to the Base Account, call Base MCP `get_wallets`, prepare `agentTransferOwnership` with that address as `newOwner`, and run a separate x402 approval.

## Submission

Use Base MCP `initiate_x402_request`, `get_request_status`, and `complete_x402_request`. Exposed Brickken MCP tools, hosted HTTP API, or CLI produce the prepare result; Base MCP authorizes the quoted payment and completes the paid send resource.

Request body:

```json
{
  "txId": "0x...",
  "transactions": [
    { "to": "0x...", "data": "0x...", "value": "0x0" }
  ]
}
```

Mapping:

```text
x402Requirements[].extra.displayPrice numeric amount -> initiate_x402_request.maxPayment
txId                                                   -> body.txId
transactions[0].{to,data,value}                        -> body.transactions[0]
```

The Base Account is the x402 payer, while Brickken's relayer is the onchain sender.

## Example Prompts

**"Register my agent on Base."** Prepare `agentRegister` through exposed Brickken MCP tools, hosted HTTP API, or CLI, disclose Brickken custody, complete the Base MCP x402 approval, and return `agentUuid`, `txId`, and the operation hash.

**"Set my Base wallet as the agent wallet."** Use `agentSetWallet` with the required wallet authorization signature. Explain that this changes the operational wallet only.

**"Send the agent NFT to my Base wallet."** Call Base MCP `get_wallets`, explicitly confirm loss of Brickken custody, then prepare and execute `agentTransferOwnership` with the Base Account as `newOwner`.

## Risks & Warnings

- **Custody.** Brickken initially owns the ERC-721 identity and controls agent tokens created by its relayer.
- **Ownership transfer.** `agentTransferOwnership` is irreversible and disables later Brickken owner-only relayed actions for that identity.
- **PII.** Agent profiles and feedback may publish free text or contact data to IPFS/onchain storage.
- **Payment.** Prepare is free. Send charges the exact quoted USDC amount through Base MCP x402 approval.
- **Retries.** Never replay a `txId` after an operation hash exists. Poll status instead.

## Notes

This workflow targets Base mainnet and Base Sepolia tests. A timeout leaves both operation and payment pending; Brickken's background reconciliation settles only after a successful receipt and releases the authorization on revert or expiry.
