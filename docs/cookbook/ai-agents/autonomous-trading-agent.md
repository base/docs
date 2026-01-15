

---
title: "Building Autonomous Trading Agents with AgentKit"
slug: /cookbook/ai-agents/trading-agent
description: Build a production-ready AI agent using CDP AgentKit and LangChain. Features wallet persistence, custom tool creation, and natural language DeFi execution.
authors: [your-github-username]
tags: [ai, agentkit, langchain, cdp, automation, python]
---

# Building Autonomous Trading Agents

The era of rigid, hard-coded trading bots is ending. **Autonomous Agents** can reason, plan, and execute strategies based on natural language instructions (e.g., "Monitor ETH price and swap 50 USDC if it drops below $2000").

This guide uses **CDP AgentKit**—Coinbase's bridge between LLMs and on-chain actions—integrated with **LangChain**.

We will solve the three biggest challenges in Agent development:
1.  **Wallet Persistence:** Preventing the agent from generating a new wallet (and losing funds) every time it restarts.
2.  **Tool Extension:** Teaching the agent new capabilities beyond the default kit.
3.  **Reliable Execution:** structuring the LLM loop for financial operations.



---

## Phase 1: Environment & Persistence

The most common failure mode for new developers is the **"Ephemeral Wallet" trap**. By default, AgentKit generates a new MPC wallet on every run. If you send funds to your agent, restart the server, and the wallet is gone, your funds are lost.

We must implement a **Wallet Persistence Layer** that saves the wallet's cryptographic seed data to a file (or database) and reloads it on boot.

**Prerequisites:**
```bash
pip install langchain langchain-openai cdp-langchain cdp-agentkit-core

```

**Environment Variables (`.env`):**

```ini
CDP_API_KEY_NAME="your-key-name"
CDP_API_KEY_PRIVATE_KEY="your-private-key"
OPENAI_API_KEY="sk-..."
NETWORK_ID="base-sepolia" # or "base-mainnet"

```

---

## Phase 2: The Agent Implementation

We will wrap the Agent logic in a robust Python script. This script handles the lifecycle: Load Wallet -> Initialize Agent -> Register Tools -> Execute.

**File:** `agent_bot.py`

```python
import os
import json
from langchain_openai import ChatOpenAI
from cdp_langchain.agent_toolkits import CdpToolkit
from cdp_langchain.utils import CdpAgentkitWrapper
from cdp_agentkit_core.actions import CdpAction
from langchain.agents import create_react_agent, AgentExecutor
from langchain_core.tools import tool

# 1. Wallet Persistence Logic
# We check for a local file 'wallet_data.txt'. If it exists, we load it.
# If not, we create a new wallet and save the data immediately.
wallet_data_file = "wallet_data.txt"
wallet_data = None

if os.path.exists(wallet_data_file):
    print("📂 Loading existing wallet data...")
    with open(wallet_data_file, "r") as f:
        wallet_data = f.read()
else:
    print("🆕 Creating new wallet...")

# 2. Initialize CDP Wrapper
# This is the "body" of the agent that interacts with the blockchain.
values = {"cdp_wallet_data": wallet_data} if wallet_data else {}
agentkit = CdpAgentkitWrapper(**values)

# Save the new wallet data immediately to prevent fund loss
if not wallet_data:
    exported_data = agentkit.export_wallet()
    with open(wallet_data_file, "w") as f:
        f.write(exported_data)
    print(f"✅ Wallet saved to {wallet_data_file}")

# 3. Create Custom Tools
# While AgentKit has built-in transfer/swap tools, we often need custom logic.
# Here is a tool to check specific token balances.

@tool
def check_token_balance(token_symbol: str):
    """
    Checks the balance of a specific token (ETH, USDC) for the agent's wallet.
    Input: token_symbol (e.g., 'ETH', 'USDC')
    """
    # The agentkit wrapper provides direct access to the address
    address = agentkit.wallet.default_address.address_id
    
    # In a real app, you would fetch the contract address map here
    # For this demo, we use the internal balance fetcher
    balance_map = agentkit.wallet.list_balances()
    
    # Simple parsing logic
    amount = balance_map.get(token_symbol.lower(), 0)
    return f"The agent ({address}) currently holds {amount} {token_symbol}."

# 4. Initialize LangChain Agent
# We combine the standard CDP tools (Swap, Transfer) with our custom tool.
cdp_toolkit = CdpToolkit.from_cdp_agentkit_wrapper(agentkit)
tools = cdp_toolkit.get_tools() + [check_token_balance]

llm = ChatOpenAI(model="gpt-4-turbo-preview")

# The ReAct pattern allows the agent to "Reason" then "Act"
agent_executor = create_react_agent(llm, tools)
executor = AgentExecutor(agent=agent_executor, tools=tools, verbose=True)

# 5. The Execution Loop
def run_chat_mode():
    print("\n🤖 Agent Online. Waiting for commands...")
    print(f"   Wallet Address: {agentkit.wallet.default_address.address_id}")
    
    while True:
        try:
            user_input = input("\nUser: ")
            if user_input.lower() in ["exit", "quit"]:
                break
            
            # Streaming the thought process
            for chunk in executor.stream({"input": user_input}):
                if "actions" in chunk:
                    for action in chunk["actions"]:
                        print(f"⚙️  Executing: {action.tool}")
                elif "steps" in chunk:
                    print("✅ Step Completed.")
                elif "output" in chunk:
                    print(f"🤖 Agent: {chunk['output']}")
                    
        except Exception as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    run_chat_mode()

```

---

## Phase 3: Testing the Agent

Once running, you interact with the agent using natural language. The ReAct loop interprets your intent and maps it to the underlying CDP tools.

**Scenario 1: The Initial Check**

> **User:** "What is my wallet address and do I have any ETH?"
> **Agent:** Calls `check_token_balance('ETH')` and returns the data.

**Scenario 2: The Execution**

> **User:** "Swap 0.01 ETH for USDC."
> **Agent Logic:**
> 1. **Thought:** "The user wants to swap. I should use the `cdp_swap_asset` tool."
> 2. **Action:** Calls `cdp_swap_asset(amount=0.01, from='eth', to='usdc')`.
> 3. **Observation:** Receives transaction hash from Base.
> 4. **Final Answer:** "Swap complete. Transaction Hash: 0x123..."
> 
> 

---

## Best Practices for Production

1. **Secret Management:**
Never commit `wallet_data.txt` to Git. Add it to your `.gitignore`. In production (AWS/GCP), store this JSON blob in **AWS Secrets Manager** or **HashiCorp Vault**, not on the local filesystem.
2. **Rate Limiting:**
LLMs can hallucinate rapid-fire loops. Implement a "Human in the Loop" check for high-value transactions (e.g., require user confirmation if value > $50).
3. **Gas Management:**
The agent needs ETH to pay for gas. If the agent runs out of ETH, it will freeze. Build a "Low Balance Alert" tool that notifies you via Telegram/Discord when the agent's ETH drops below 0.005.

```
