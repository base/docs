# Deploy Your Own L3 (Base Appchain)

**Author:** jadonamite
**Topic:** Scaling & Infrastructure
**Level:** Advanced
**Prerequisites:** Conduit Account, Base Sepolia ETH, Foundry

You've built dApps on Base. Now it's time to build **Base itself**—or at least, your own version of it.

A Layer 3 (L3) is an application-specific rollup that settles on Base (L2). It gives you:

* **Dedicated Throughput:** No fighting for blockspace during meme-coin season.
* **Hyper-low Fees:** Often <$0.001 per transaction.
* **Customization:** Use your own token for gas, change block times, or enforce KYC gates (if you must).

In this guide, we will deploy a live OP Stack L3 testnet that settles on **Base Sepolia** using **Conduit** (a leading Rollup-as-a-Service provider).

---

## 1. Architecture

We are building a chain that nests inside the Base ecosystem.

* **Execution:** OP Stack (Standard Bedrock).
* **Settlement:** Base Sepolia (L2).
* **Data Availability (DA):** Conduit DA or Celestia (for cost savings).
* **Bridge:** OP Standard Bridge (Native ETH transfer).

[ Transaction ] -> [ Your L3 Sequencer ] -> [ Batcher ] -> [ Base Sepolia L2 ] -> [ Ethereum Sepolia L1 ]

---

## 2. Prerequisites

1. **Conduit Account:** Sign up at [app.conduit.xyz](https://app.conduit.xyz).
2. **Base Sepolia ETH:** You will need minimal ETH on the settlement layer to bridge to your chain later.
3. **Foundry:** To deploy contracts to your new chain.

---

## 3. Implementation: The Deployment

While you *can* run `op-node` and `op-batcher` manually on AWS, it requires deep DevOps knowledge and 24/7 monitoring. For this guide, we use RaaS to get a production-grade testnet in 15 minutes.

### Step 1: Create a New Project

1. Log in to the Conduit Dashboard.
2. Click **"Deploy New Chain"**.
3. Select **"OP Stack"** (Optimism) as the framework. Base Appchains are built on the OP Stack, ensuring 100% EVM compatibility.

### Step 2: Configure Settlement

This is the critical "L3" step.

* **Settlement Layer:** Select **Base Sepolia**.
* *Why?* By settling on Base, you inherit Base's security and can tap into its user base via simpler bridging.


* **Data Availability:** Select **Conduit DA** (easiest) or **Celestia** (modular).
* *Note:* For an L3, posting data to Base L2 can be expensive. Using an external DA layer keeps your L3 costs microscopic.



### Step 3: Chain Parameters

Customize your chain's DNA.

* **Network Name:** `My Degen L3` (or similar).
* **Chain ID:** Generate a random ID (e.g., `912345`).
* **Gas Token:** Leave as **ETH** for now.
* *Pro Tip:* You can change this to `DEGEN` or `USDC` later in production configurations to let users pay gas in your native token.



### Step 4: Deploy

Click **"Deploy"**.

* *What's happening?* Conduit is spinning up a Sequencer, a Proposer, and a Batcher. It is deploying the `L2OutputOracle` and `OptimismPortal` contracts onto **Base Sepolia**.

*Wait approx. 15-20 minutes for the infrastructure to provision.*

---

## 4. Bridging & Connection

Once live, you will see your **RPC URL** and **Bridge URL**.

### Step 1: Add to Wallet

Add your new network to your wallet (or `foundry.toml`):

```toml
[rpc_endpoints]
my_l3 = "https://rpc-my-degen-l3.conduit.xyz"

[etherscan]
my_l3 = { key = "empty", url = "https://explorer-my-degen-l3.conduit.xyz/api" }

```

### Step 2: Bridge Funds

Your L3 starts with 0 ETH. You must bridge from **Base Sepolia** to your **L3**.

1. Go to the **Bridge URL** provided by Conduit.
2. Connect your wallet (Network: **Base Sepolia**).
3. Deposit `0.01 ETH`.
4. Wait ~2 minutes. Switch your wallet to **My Degen L3**.
5. *Profit.* You now have native gas on your own blockchain.

---

## 5. Deploying Contracts to Your L3

Now, let's deploy the `Counter.sol` we built in the first guide, but this time to your *own* chain.

**Update `.env`:**

```env
L3_RPC_URL=https://rpc-my-degen-l3.conduit.xyz
PRIVATE_KEY=0x...

```

**Deploy:**

```bash
forge create src/Counter.sol:Counter \
  --rpc-url $L3_RPC_URL \
  --private-key $PRIVATE_KEY \
  --legacy \
  --broadcast

```

*Note: We use `--legacy` because some new L3s might not support EIP-1559 fully out of the gate, though OP Stack usually does.*

---

## 6. Common Pitfalls

1. **"Wrong Network" on Bridge:**
* **Context:** Bridging *from* L3 *to* Base.
* **Fix:** L3 withdrawals usually take a challenge period (7 days) on Mainnet, but are faster on testnets. Ensure you are on the correct source network before clicking "Bridge".


2. **Verification Failures:**
* **Context:** `forge verify-contract` fails.
* **Fix:** Your custom L3 doesn't exist on Etherscan. You must use the Blockscout explorer API provided by Conduit (see the `foundry.toml` config above) and the `--verifier blockscout` flag.


3. **Sequencer Lag:**
* **Context:** Transactions getting stuck.
* **Fix:** You are the only user, but if you spam it, the single sequencer might choke. Restarting the node (via dashboard) usually fixes devnet hang-ups.


