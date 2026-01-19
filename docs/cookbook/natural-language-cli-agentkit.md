# Build a Natural Language Onchain CLI with AgentKit

**Author:** jadonamite
**Topic:** AI Agents & Wallet Setup
**Level:** Beginner
**Prerequisites:** Node.js v18+, CDP API Key, OpenAI API Key

Command-line tools are powerful, but they usually require strict syntax. What if you could just tell your terminal, *"Send 0.005 ETH to my other wallet"* or *"Swap all my USDC for ETH"*?

In this tutorial, we will build a **Natural Language CLI** using **Coinbase AgentKit**, **LangChain**, and the **CDP MPC Wallet**. This agent will interpret your intent, manage the complex wallet interactions on Base Sepolia, and execute transactions automatically.

---

## 1. Architecture

* **User Interface:** A simple Node.js Read-Eval-Print Loop (REPL) for chat.
* **Reasoning Engine:** LangChain (ReAct Agent) + OpenAI (GPT-4o-mini).
* **Wallet Infrastructure:** Coinbase Developer Platform (CDP) MPC Wallet.
* *Why MPC?* It allows you to create a secure, programmatic wallet without handling raw private keys directly in your code.


* **Action Providers:** AgentKit tools for Swaps, Transfers, and Balance checks.

---

## 2. Prerequisites

1. **Coinbase Developer Platform (CDP) Account:**
* Navigate to [portal.cdp.coinbase.com](https://portal.cdp.coinbase.com/).
* Create an API Key with `AgentKit` permissions.
* **Crucial:** Download your `privateKey.json` or copy the `name` and `privateKey` immediately.


2. **OpenAI API Key:**
* Navigate to [platform.openai.com](https://platform.openai.com/) to get your key.



---

## 3. Implementation

### Step 1: Initialize the Project

We will use the official AgentKit boilerplate to ensure all dependencies are correct.

```bash
# Create the project
npm create onchain-agent@latest agent-cli

# Select the following options:
# ? Select your AI Framework: LangChain
# ? Select your Project Template: Empty
# ? Select your Blockchain Network: Base Sepolia
# ? Select your Wallet Provider: CDP Server Wallet

```

Navigate into the folder:

```bash
cd agent-cli

```

### Step 2: Configure Environment

Rename `.env.example` to `.env` and input your credentials.

```env
# .env

# CDP Keys (From Coinbase Developer Portal)
CDP_API_KEY_NAME=organizations/.../apiKeys/...
CDP_API_KEY_PRIVATE_KEY=-----BEGIN EC PRIVATE KEY-----...

# AI Provider
OPENAI_API_KEY=sk-...

# Network Configuration
NETWORK_ID=base-sepolia

```

### Step 3: The CLI Agent (`src/index.ts`)

We will build an interactive CLI that persists your wallet data. This ensures your agent keeps its address and balance between sessions.

Create or overwrite `src/index.ts` with the following:

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
import * as fs from "fs";
import * as readline from "readline";

dotenv.config();

// File to persist wallet data (keeps your address the same)
const WALLET_DATA_FILE = "wallet_data.txt";

async function main() {
  console.log("Initializing AgentKit CLI...");

  // 1. Setup LLM
  const llm = new ChatOpenAI({
    model: "gpt-4o-mini",
  });

  // 2. Configure CDP Wallet Provider
  // This logic checks if a wallet already exists locally. 
  // If yes, it loads it. If no, it creates a new MPC wallet.
  let walletDataStr: string | undefined = undefined;
  if (fs.existsSync(WALLET_DATA_FILE)) {
    try {
      walletDataStr = fs.readFileSync(WALLET_DATA_FILE, "utf8");
    } catch (error) {
      console.error("Error reading wallet data:", error);
    }
  }

  const walletProvider = await CdpWalletProvider.configureWithWallet({
    apiKeyName: process.env.CDP_API_KEY_NAME,
    apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    cdpWalletData: walletDataStr || undefined,
    networkId: process.env.NETWORK_ID || "base-sepolia",
  });

  // 3. Setup AgentKit with Action Providers
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

  // 4. Save Wallet Data (Persist the MPC Wallet)
  const exportedWallet = await walletProvider.exportWallet();
  fs.writeFileSync(WALLET_DATA_FILE, JSON.stringify(exportedWallet));

  const agent = createReactAgent({
    llm,
    tools,
    checkpointSaver: memory,
    messageModifier: `
      You are a helpful agent that can interact onchain using the Coinbase Developer Platform AgentKit. 
      You are empowered to interact onchain using your tools. 
      If you ever need funds, you can request them from the faucet if you are on network ID 'base-sepolia'.
      Before executing your first action, check your wallet details to see what network you're on.
      If there is a 5XX (internal) HTTP error code, ask the user to try again later.
      If someone asks you to do something you can't do with your currently available tools, you must say so.
    `,
  });

  console.log("Agent Ready!");
  console.log(`Wallet Address: ${await walletProvider.getAddress()}`);
  console.log("-------------------------------------------------");
  console.log("Enter a command (e.g., 'Swap 1 USDC for ETH') or type 'exit' to quit.");

  // 5. Interactive Chat Loop
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const chatLoop = async () => {
    rl.question("\n> ", async (input) => {
      if (input.toLowerCase() === "exit") {
        rl.close();
        return;
      }

      const stream = await agent.stream(
        { messages: [new HumanMessage(input)] },
        { configurable: { thread_id: "cli-agent-session" } }
      );

      for await (const chunk of stream) {
        if ("agent" in chunk) {
          console.log(chunk.agent.messages[0].content);
        } else if ("tools" in chunk) {
          console.log(chunk.tools.messages[0].content);
        }
      }

      chatLoop();
    });
  };

  chatLoop();
}

main();

```

### Step 4: Run the CLI

1. **Start the agent:**
```bash
npx tsx src/index.ts

```


2. **First Run (Funding):**
On the first run, your wallet will be empty. Ask the agent to fund itself.
```text
> Get my wallet details and request funds from the faucet.

```


*The agent will output its address and the transaction link for the faucet drip.*
3. **Execute a Command:**
Once funded, try a swap.
```text
> Swap 0.0001 ETH for USDC.

```


*The agent will check prices, approve the transaction, and return the Basescan link.*

---

## 4. Common Pitfalls

1. **Wallet Persistence:**
* **Gotcha:** If you delete `wallet_data.txt`, the agent will generate a brand new wallet address (with 0 funds) next time you run it. Always back up this file if you are using it for anything important.


2. **Model Selection:**
* **Gotcha:** Using smaller models (like `gpt-3.5-turbo`) may result in the agent failing to pick the correct tool parameters for complex swaps. `gpt-4o` or `gpt-4o-mini` is recommended for reliability.


3. **Permissions:**
* **Gotcha:** If you see "Unauthorized" errors, ensure your CDP API Key has the `AgentKit` permission set in the CDP Portal.



---


- [x] Tested "Swap ETH for USDC" command.

```
