# Master Custom Tools: Build a Token Balance Checker

**Author:** jadonamite
**Topic:** Agent Extensibility & Viem
**Level:** Intermediate
**Prerequisites:** Node.js v18+, Previous AgentKit Setup

Out of the box, AgentKit is powerful, but it doesn't know *everything*. To build a truly "degen" agent, you need to teach it new tricks.

In this tutorial, we will build a **Custom Tool** that allows your agent to check the balance of *any* specific ERC-20 token contract (like a meme coin) that might not be in the default allowlist. We will use **Viem** to read directly from the blockchain and **LangChain** to wrap that logic into a tool your agent can understand.

---

## 1. Architecture

* **The Logic:** A TypeScript function using `viem` to call `balanceOf` and `decimals` on a smart contract.
* **The Wrapper:** The `@langchain/core/tools` SDK to define inputs (Zod schema) and outputs.
* **The Integration:** Injecting this new tool into the `createReactAgent` loop.

---

## 2. Prerequisites

You can continue from the previous `agent-cli` project. If starting fresh, ensure you have:

* `npm install viem @langchain/core z.od`

---

## 3. Implementation

### Step 1: Create the Tool File (`src/tools/token_balance.ts`)

Create a new directory `src/tools` and a file `token_balance.ts`.

This code does three things:

1. Defines the input schema (what the AI needs to provide).
2. Sets up a `viem` public client to read from Base Sepolia.
3. Exports a `tool` object that the Agent can invoke.

```typescript
import { tool } from "@langchain/core/tools";
import { createPublicClient, http, parseAbi, formatUnits } from "viem";
import { baseSepolia } from "viem/chains";
import { z } from "zod";

// 1. Setup Viem Client (Read-Only)
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

// 2. Define the exact ABI we need (ERC-20 standard)
const ERC20_ABI = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
]);

// 3. Define the Input Schema
const BalanceInput = z.object({
  tokenAddress: z.string().describe("The 0x contract address of the ERC-20 token"),
  walletAddress: z.string().describe("The 0x wallet address to check the balance for"),
});

// 4. Create the Tool
export const tokenBalanceTool = tool(
  async ({ tokenAddress, walletAddress }) => {
    try {
      // Validate addresses (basic check)
      if (!tokenAddress.startsWith("0x") || !walletAddress.startsWith("0x")) {
        return "Error: Invalid address format. Addresses must start with 0x.";
      }

      const [balance, decimals, symbol] = await Promise.all([
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [walletAddress as `0x${string}`],
        }),
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "decimals",
        }),
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "symbol",
        }),
      ]);

      const formatted = formatUnits(balance, decimals);
      return `The balance of ${walletAddress} is ${formatted} ${symbol}`;
      
    } catch (error: any) {
      return `Failed to fetch balance: ${error.message}`;
    }
  },
  {
    name: "get_custom_token_balance",
    description: "Gets the balance of a specific ERC-20 token contract for a given wallet address.",
    schema: BalanceInput,
  }
);

```

### Step 2: Register the Tool (`src/index.ts`)

Now, we import this tool and add it to our agent's toolkit.

Open your `src/index.ts` (from the previous tutorial) and modify the `tools` array.

```typescript
// ... existing imports
import { tokenBalanceTool } from "./tools/token_balance"; // Import your new tool

// ... inside your main() function ...

  const agentKit = await AgentKit.from({
    walletProvider,
    actionProviders: [
      wethActionProvider(),
      walletActionProvider(),
      erc20ActionProvider(),
      cdpApiActionProvider({
        apiKeyName: process.env.CDP_API_KEY_NAME,
        apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    ],
  });

  // Combine AgentKit tools with your Custom Tool
  const agentKitTools = await getLangChainTools(agentKit);
  const tools = [...agentKitTools, tokenBalanceTool]; // <--- ADD IT HERE

  const agent = createReactAgent({
    llm,
    tools, // The agent now has access to your custom tool
    checkpointSaver: memory,
    messageModifier: `
      You are a helpful agent.
      If asked to check a token balance, use the 'get_custom_token_balance' tool.
      You can find token addresses using your search tools or ask the user for them.
    `,
  });

// ... rest of the file

```

### Step 3: Test the Tool

Run your agent:

```bash
npx tsx src/index.ts

```

**Conversation:**

> **User:** "Check the balance of the USDC contract (0x036CbD53842c5426634e7929541eC2318f3dCF7e) for my wallet address."
> **Agent:** *Thinking... Calls `get_custom_token_balance`...*
> "The balance of 0x... is 100.5 USDC"

---

## 4. Common Pitfalls

1. **Viem Type Errors:**
* **Gotcha:** Viem is strict about `0x` prefixes.
* **Fix:** Ensure you cast strings to ``0x${string}`` when passing them to `readContract`.


2. **Schema Mismatches:**
* **Gotcha:** The LLM might try to pass `token_address` (snake_case) instead of `tokenAddress` (camelCase).
* **Fix:** Zod handles validation, but using clear descriptions in `z.string().describe(...)` helps the LLM get it right.


3. **RPC Limits:**
* **Gotcha:** Making too many `readContract` calls in parallel can hit rate limits on the public RPC.
* **Fix:** Use `multicall` (Viem feature) if you plan to check 10+ tokens at once.



---

[Coinbase AgentKit: Build Your First AI Agent in 15 Minutes](https://www.google.com/search?q=https://www.youtube.com/watch%3Fv%3DkYv_6EaL4kY)

This video is relevant because it provides a visual walkthrough of setting up AgentKit and introduces the concepts of tools and actions, which reinforces the custom tool implementation discussed in the tutorial.
