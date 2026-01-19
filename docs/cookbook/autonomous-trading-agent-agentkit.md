# Build an Autonomous Trading Agent with AgentKit

**Author:** Jadonamite
**Topic:** AI Agents & DeFi
**Level:** Intermediate
**Prerequisites:** Node.js v18+, CDP API Key, OpenAI API Key

Welcome to the future of finance, where your code doesn't just execute transactions—it *decides* when to execute them.

In this tutorial, we will build an **Autonomous Trading Agent** using **Coinbase AgentKit**, **LangChain**, and the **Coinbase Developer Platform (CDP)**. This agent will run on a server, monitor market conditions, and execute swaps on Base Sepolia autonomously.

---

## 1. Architecture

We are building a server-side AI agent. Unlike the frontend dApp we built previously, this runs in a headless Node.js environment.

* **Brain:** LangChain (Orchestration) + OpenAI (LLM).
* **Hands:** AgentKit + CDP MPC Wallet (Server-side Wallet).
* **Tools:** `CdpWalletActionProvider` (Native swaps, transfers, and balance checks).

---

## 2. Prerequisites

1. **Coinbase Developer Platform (CDP) Account:**
* Go to [portal.cdp.coinbase.com](https://portal.cdp.coinbase.com/).
* Create an API Key with `AgnetKit` permissions (or Admin for testing).
* *Save your API Key Name and Private Key immediately.*


2. **OpenAI API Key:**
* Get one from [platform.openai.com](https://platform.openai.com/).


3. **Node.js & npm:**
* Ensure you have Node.js v18 or higher.



---

## 3. Implementation

### Step 1: Scaffold the Agent

We will use the official AgentKit starter to get the boilerplate.

```bash
# Initialize the project
npm create onchain-agent@latest trading-agent

# Select the following options:
# ? Select your AI Framework: LangChain
# ? Select your Project Template: Empty (or Default)
# ? Select your Blockchain Network: Base Sepolia
# ? Select your Wallet Provider: CDP Server Wallet

```

Navigate into your new directory:

```bash
cd trading-agent

```

### Step 2: Configure Environment

Rename `.env.example` to `.env` and fill in your keys.

```env
# .env

# CDP Keys (From Coinbase Developer Portal)
CDP_API_KEY_NAME=organizations/.../apiKeys/...
CDP_API_KEY_PRIVATE_KEY=-----BEGIN EC PRIVATE KEY-----...

# AI Provider
OPENAI_API_KEY=sk-...

# Network
NETWORK_ID=base-sepolia

```

### Step 3: dependency Check

Ensure you have the required packages. The scaffold installs most, but let's double-check we have the core AgentKit libraries.

```bash
npm install @coinbase/agentkit @coinbase/agentkit-langchain @langchain/openai langchain

```

### Step 4: The Trading Logic (`src/agent.ts`)

Open `src/agent.ts`. We are going to modify the default setup to include the **Swap Action** and give the agent a "Trader Personality."

Unlike a chatbot that waits for user input, we will implement an **Autonomous Loop** that checks prices and acts every 10 seconds.

```typescript
import {
  AgentKit,
  CdpWalletProvider,
  wethActionProvider,
  walletActionProvider,
  erc20ActionProvider,
  cdpApiActionProvider,
  cdpWalletActionProvider,
} from "@coinbase/agentkit";
import { getLangChainTools } from "@coinbase/agentkit-langchain";
import { HumanMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import * as dotenv from "dotenv";

dotenv.config();

// Configuration
const WALLET_DATA_FILE = "wallet_data.txt";
const NETWORK_ID = process.env.NETWORK_ID || "base-sepolia";

async function main() {
  console.log("Starting Autonomous Trading Agent...");

  // 1. Initialize LLM
  const llm = new ChatOpenAI({
    model: "gpt-4o-mini", // Cost-effective for loops
  });

  // 2. Initialize Wallet Provider (CDP MPC Wallet)
  // This automatically persists local wallet data to avoid recreating wallets
  const walletProvider = await CdpWalletProvider.configureWithWallet({
    apiKeyName: process.env.CDP_API_KEY_NAME,
    apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    networkId: NETWORK_ID,
  });

  console.log(`Agent Wallet Address: ${await walletProvider.getAddress()}`);

  // 3. Initialize AgentKit with "Trading Capabilities"
  // We include cdpWalletActionProvider for native Swaps
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
      cdpWalletActionProvider({
        apiKeyName: process.env.CDP_API_KEY_NAME,
        apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    ],
  });

  const tools = await getLangChainTools(agentKit);
  const memory = new MemorySaver();

  // 4. Create the Agent
  const agent = createReactAgent({
    llm,
    tools,
    checkpointSaver: memory,
    messageModifier: `
      You are an autonomous trading bot on Base Sepolia.
      Your goal is to maintain a balance of ETH and USDC.
      
      BEHAVIOR:
      1. Check your balances.
      2. If you have NO USDC, swap 0.0001 ETH for USDC.
      3. If you have USDC, swap it back to ETH.
      4. Always verify you have enough ETH for gas before swapping.
      
      Output your thought process clearly.
    `,
  });

  // 5. Fund the wallet (if needed)
  // In a real app, you'd fund this manually. For the tutorial, we request faucet funds.
  console.log("Checking balance and requesting faucet funds if empty...");
  await agent.invoke(
    { messages: [new HumanMessage("Check my ETH balance. If it is less than 0.01 ETH, request funds from the faucet.")] },
    { configurable: { thread_id: "funding-thread" } }
  );

  // 6. Autonomous Loop
  // The agent will run every 10 seconds
  console.log("Entering Autonomous Trading Mode...");
  
  while (true) {
    try {
      console.log("\n--- New Interval ---");
      const stream = await agent.stream(
        { messages: [new HumanMessage("Analyze your portfolio and execute a trade based on your instructions.")] },
        { configurable: { thread_id: "trading-thread" } }
      );

      for await (const chunk of stream) {
        if ("agent" in chunk) {
          console.log(chunk.agent.messages[0].content);
        } else if ("tools" in chunk) {
          console.log(chunk.tools.messages[0].content);
        }
      }
      
      console.log("Sleeping for 10 seconds...");
      await new Promise((resolve) => setTimeout(resolve, 10000));
      
    } catch (error) {
      console.error("Error in autonomous loop:", error);
      // Wait a bit before retrying to avoid spamming on error
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

main();

```

### Step 5: Run the Agent

```bash
# Run the TypeScript file
npx tsx src/agent.ts

```

**Expected Output:**

1. The agent initializes and prints its wallet address.
2. It checks for funds (and hits the faucet if you are broke).
3. It enters the loop:
* "I see I have 0.05 ETH and 0 USDC."
* "Swapping 0.0001 ETH for USDC..."
* *Transaction Hash executes onchain.*
* "Sleeps..."


4. Next loop:
* "I see I have USDC."
* "Swapping USDC back to ETH..."



---

## 4. Common Pitfalls

1. **"Insufficient Funds for Gas":**
* **Context:** The agent tries to swap *all* its ETH for USDC, leaving 0 for gas.
* **Fix:** Adjust the system prompt (`messageModifier`) to explicitly state: *"Always keep 0.01 ETH buffer for gas fees."*


2. **Rate Limits:**
* **Context:** Hitting the LLM or CDP API too fast in the `while(true)` loop.
* **Fix:** Ensure the `setTimeout` is at least 5-10 seconds.


3. **Hallucinations:**
* **Context:** The agent claims it made a trade but didn't call the tool.
* **Fix:** Use `AgentKit` verifiers or check the `tools` output chunk specifically to confirm a transaction hash was returned.



---

