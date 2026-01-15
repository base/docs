---
title: "Setting up a Base MCP Server for Claude"
slug: /cookbook/ai-agents/base-mcp-server
description: Configure a Model Context Protocol (MCP) server to let Claude Desktop directly query the Base blockchain for debugging and analysis.
authors: [jadonamite]
tags: [ai, mcp, claude, debugging, rpc]
---

# Setting up a Base MCP Server

The **Model Context Protocol (MCP)** is a new standard that allows AI assistants (like Claude Desktop) to connect to external data sources.

By building a Base MCP Server, you give Claude "eyes" on the blockchain. Instead of copy-pasting Etherscan links or raw JSON into the chat, you can simply ask: *"Why did transaction 0x123 fail?"* and Claude will query the chain, fetch the receipt, simulate the trace, and explain the error code.



## Phase 1: The MCP Server Implementation

We will create a lightweight TypeScript server that exposes blockchain tools to Claude.

**1. Initialize Project**
```bash
mkdir base-mcp-server
cd base-mcp-server
npm init -y
npm install @modelcontextprotocol/sdk zod ethers
npm install -D typescript @types/node tsx
npx tsc --init

```

**2. The Server Code (`index.ts`)**
This script defines two tools: `get_transaction` and `debug_receipt`. Claude will call these automatically when it needs data.

```typescript
#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { ethers } from "ethers";
import { z } from "zod";

// Configure Base RPC (Use Alchemy, Infura, or Base Public Endpoint)
const RPC_URL = "[https://mainnet.base.org](https://mainnet.base.org)";
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Initialize MCP Server
const server = new Server(
  {
    name: "base-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 1. Define Available Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_transaction",
        description: "Fetch details of a transaction hash on Base Mainnet",
        inputSchema: {
          type: "object",
          properties: {
            hash: { type: "string", description: "The 0x transaction hash" },
          },
          required: ["hash"],
        },
      },
      {
        name: "get_receipt",
        description: "Fetch the receipt (logs, status, gas used) to debug failures",
        inputSchema: {
          type: "object",
          properties: {
            hash: { type: "string", description: "The 0x transaction hash" },
          },
          required: ["hash"],
        },
      },
    ],
  };
});

// 2. Handle Tool Execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "get_transaction") {
      const hash = String(args?.hash);
      const tx = await provider.getTransaction(hash);
      return {
        content: [{ type: "text", text: JSON.stringify(tx, null, 2) }],
      };
    }

    if (name === "get_receipt") {
      const hash = String(args?.hash);
      const receipt = await provider.getTransactionReceipt(hash);
      
      // Enhance debug info: Check status
      const status = receipt?.status === 1 ? "SUCCESS" : "FAILED";
      
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify({ ...receipt, human_status: status }, null, 2) 
        }],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
});

// Start Server via Stdio (Standard Input/Output)
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Base MCP Server running on stdio...");

```

---

## Phase 2: Configuring Claude Desktop

Claude Desktop needs to know where this server lives. We edit the configuration file to "install" our new tools.

**1. Locate Config File**

* **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
* **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

**2. Add Server Configuration**
Open the file and add the `base-chain` entry. Make sure to point to the absolute path of your project.

```json
{
  "mcpServers": {
    "base-chain": {
      "command": "npx",
      "args": [
        "-y",
        "tsx",
        "/ABSOLUTE/PATH/TO/YOUR/base-mcp-server/index.ts"
      ]
    }
  }
}

```

**3. Restart Claude**
Close and reopen the Claude Desktop app. You should see a generic "hammer" icon or "Connected to 1 Server" indicator in the input bar.

---

## Phase 3: AI-Assisted Debugging Workflow

Now that Claude is connected to Base, you can perform advanced debugging without writing scripts.

**Scenario: A Failed Transaction**
You tried to swap tokens, but it failed. You have the hash: `0xabc...123`.

**The Prompt:**

> "Analyze transaction 0xabc...123 on Base. Why did it fail? Check the logs in the receipt."

**What Happens Behind the Scenes:**

1. **Thinking:** Claude recognizes the pattern `0x...` and sees it has a tool named `get_receipt`.
2. **Tool Call:** It executes `get_receipt(hash: "0xabc...123")` against your local server.
3. **Network Request:** Your local server uses `ethers.js` to hit the Base RPC.
4. **Analysis:** Claude receives the JSON receipt. It notices `status: 0` (Revert). It looks at the `logs`. It might see a `Transfer` event followed by a revert, or it might see no logs at all.
5. **Response:**
> "The transaction failed with status 0. I see it ran out of gas (Gas Used: 50,000 equals Gas Limit: 50,000). You likely didn't set a high enough gas limit for this complex swap."



---

## Troubleshooting

* **Error: "ECONNREFUSED"**: Ensure your `RPC_URL` in `index.ts` is valid. Public nodes have rate limits; for heavy debugging, use a dedicated Alchemy/Infura key.
* **Claude doesn't see tools**: Check the `claude_desktop_config.json` syntax. JSON does not support trailing commas. Ensure the path to `index.ts` is absolute (e.g., `/Users/dev/base-mcp/...`).
* **Typescript Errors**: If `npx tsx` fails, ensure you installed `tsx` globally or allow `npx` to download it.

```
