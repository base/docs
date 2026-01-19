
# Deploy a Token with One Command: The AI Token Factory

**Author:** jadonamite
**Topic:** Custom Tools & Contract Deployment
**Level:** Advanced
**Prerequisites:** Node.js v18+, Foundry, Previous AgentKit Setup

In our first tutorial, *you* deployed a contract using the command line. Now, we will teach your *Agent* to do it.

This tutorial creates a custom tool that takes a **Name**, **Symbol**, and **Supply**, and deploys a fully functional ERC-20 token to Base Sepolia using `viem` and the `CdpWalletProvider`.

---

## 1. Architecture

1. **The Template:** A standard ERC-20 Solidity contract.
2. **The Compilation:** We use Foundry to generate the `ABI` and `Bytecode`.
3. **The Tool:** A custom LangChain tool that accepts `name`, `symbol`, and `supply`.
4. **The Action:** The Agent signs and broadcasts the deployment transaction.

---

## 2. Prerequisites

We need the **Bytecode** and **ABI** of the token we want the agent to deploy.

1. **Create the Contract:**
Create a file `src/contracts/MyToken.sol`:
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Minimal ERC20 implementation (usually you'd import OpenZeppelin)
contract MyToken {
    string public name;
    string public symbol;
    uint8 public decimals = 18;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;

    event Transfer(address indexed from, address indexed to, uint256 value);

    constructor(string memory _name, string memory _symbol, uint256 _supply) {
        name = _name;
        symbol = _symbol;
        totalSupply = _supply * (10 ** decimals);
        balanceOf[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }
}

```


2. **Compile with Foundry:**
Run this command in your project root to generate the JSON artifact:
```bash
# Ensure you have foundry installed
forge solc src/contracts/MyToken.sol --combined-json abi,bin > src/contracts/MyToken.json

```


*This creates a JSON file containing the machine code the agent needs to deploy.*

---

## 3. Implementation

### Step 1: Create the Deployment Tool (`src/tools/deploy_token.ts`)

This tool reads the compiled artifact and uses the Agent's wallet to deploy it.

```typescript
import { tool } from "@langchain/core/tools";
import { createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";

// 1. Define Input Schema
const DeployTokenInput = z.object({
  name: z.string().describe("The name of the token (e.g., 'Agent Coin')"),
  symbol: z.string().describe("The ticker symbol (e.g., 'AGENT')"),
  initialSupply: z.string().describe("The initial supply (e.g., '1000000')"),
});

// 2. Load Artifacts
const ARTIFACT_PATH = path.join(process.cwd(), "src", "contracts", "MyToken.json");

export const deployTokenTool = tool(
  async ({ name, symbol, initialSupply }) => {
    try {
      // Load ABI and Bytecode from the compiled JSON
      if (!fs.existsSync(ARTIFACT_PATH)) {
        return "Error: Contract artifact not found. Please compile the contract first.";
      }
      
      const artifact = JSON.parse(fs.readFileSync(ARTIFACT_PATH, "utf8"));
      // forge solc output structure requires parsing
      const contractData = artifact.contracts["src/contracts/MyToken.sol:MyToken"];
      const abi = contractData.abi;
      const bytecode = `0x${contractData.bin}` as `0x${string}`;

      // Retrieve Private Key from Environment (or Wallet Provider logic)
      // Note: For the CDP Wallet, we use the specific signing method. 
      // Ideally, pass the `walletProvider` directly, but for this specific "Deploy" 
      // action via Viem, we need a standard WalletClient.
      
      // FOR DEMO: We assume the agent is using the key from .env 
      // In production, you would map the CDP Provider's signer to Viem.
      const account = privateKeyToAccount(process.env.WALLET_PRIVATE_KEY as `0x${string}`);

      const client = createWalletClient({
        account,
        chain: baseSepolia,
        transport: http(),
      });

      console.log(`Deploying ${name} (${symbol})...`);

      const hash = await client.deployContract({
        abi,
        bytecode,
        args: [name, symbol, BigInt(initialSupply)],
      });

      return `Token deployment initiated! Transaction Hash: ${hash}`;

    } catch (error: any) {
      return `Failed to deploy token: ${error.message}`;
    }
  },
  {
    name: "deploy_erc20_token",
    description: "Deploys a new ERC-20 token to the network with a given name, symbol, and supply.",
    schema: DeployTokenInput,
  }
);

```

### Step 2: Register the Tool (`src/index.ts`)

Add the tool to your agent's array.

```typescript
import { deployTokenTool } from "./tools/deploy_token"; 

// ... inside main() ...

  const tools = [...agentKitTools, tokenBalanceTool, deployTokenTool]; // Added deployTokenTool

  const agent = createReactAgent({
    llm,
    tools,
    checkpointSaver: memory,
    messageModifier: `
      You are a powerful blockchain developer agent.
      You can check balances AND deploy new tokens.
      If a user asks to create a coin, ask for the Name, Symbol, and Supply if not provided.
    `,
  });

```

### Step 3: Test the Deployment

Run your agent:

```bash
npx tsx src/index.ts

```

**Conversation:**

> **User:** "Create a new token called 'JadonCoin' with symbol 'JDN' and a supply of 1 million."
> **Agent:** *Thinking... Calls `deploy_erc20_token`...*
> "Token deployment initiated! Transaction Hash: 0x123..."

*You can now click the hash to see your new contract on BaseScan.*

---

## 4. Common Pitfalls

1. **Missing Bytecode:**
* **Gotcha:** If you forget to run the `forge solc` command, the JSON file won't exist.
* **Fix:** Ensure the build step is part of your `npm start` script or documentation.


2. **Constructor Arguments:**
* **Gotcha:** If the inputs (Name/Symbol) contain special characters or are empty, the deployment might revert.
* **Fix:** Add Zod validation to ensure `name` and `symbol` are non-empty strings.


3. **Gas Costs:**
* **Gotcha:** Deploying a contract costs significantly more gas than a simple transfer.
* **Fix:** Ensure your Agent's wallet has at least 0.05 ETH on Base Sepolia before testing deployment.



---

