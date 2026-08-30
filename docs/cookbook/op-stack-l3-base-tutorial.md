# Deploy a Local OP Stack L3 (Settling to Base)

**Author:** jadonamite
**Topic:** Infrastructure & L3
**Level:** Expert
**Prerequisites:** Docker, Go 1.21+, 2-3 ETH on Base Sepolia

You've built dApps on Base. Now, let's build *Base on Base*.

In this tutorial, we will deploy a **local OP Stack L3 chain** that uses **Base Sepolia** as its settlement layer (instead of Ethereum Sepolia). This creates a "Layer 3" scaling solution where your chain posts data and proofs to Base, inheriting its security and low costs.

We will use the **Optimism Monorepo** and **Docker** to spin up the sequencer, batcher, and proposer locally.

---

## 1. Architecture

* **L1 (Settlement):** Base Sepolia (Chain ID: 84532).
* **L2 (Your Chain):** Local OP Stack Chain (Chain ID: 42069).
* **Data Availability:** Base Sepolia Calldata (or Blobs).
* **Infrastructure:**
* **op-node:** The consensus client (derives chain from Base Sepolia).
* **op-geth:** The execution client (runs the EVM).
* **op-batcher:** Posts transaction data to Base Sepolia.
* **op-proposer:** Posts state roots to Base Sepolia.



---

## 2. Prerequisites

1. **Base Sepolia RPC:** You need a reliable RPC (Alchemy/Infura) for Base Sepolia.
2. **Base Sepolia ETH:** At least 2 ETH for the deployer account (Batcher/Proposer need gas).
3. **Docker & Docker Compose:** Installed and running.
4. **Hardware:** 16GB+ RAM recommended.

---

## 3. Implementation

### Step 1: Clone the Optimism Monorepo

We use the official stack.

```bash
git clone https://github.com/ethereum-optimism/optimism.git
cd optimism
git checkout v1.9.1 # Use a stable release tag
npm install
make op-node op-batcher op-proposer

```

### Step 2: Generate Configuration (The "Genesis")

We need to tell the OP Stack that "L1" is actually "Base Sepolia".

1. **Navigate to the tutorial directory:**
```bash
cd packages/contracts-bedrock

```


2. **Create a `deploy-config/my-l3.json`:**
This file defines your chain.
```json
{
  "l1ChainId": 84532, 
  "l2ChainId": 42069,
  "l2BlockTime": 2,
  "l2GenesisBlockGasLimit": "0x1c9c380",
  "p2pSequencerAddress": "0x...YOUR_SEQUENCER_ADDRESS...",
  "batchInboxAddress": "0x...YOUR_BATCH_INBOX_ADDRESS...",
  "batchSenderAddress": "0x...YOUR_BATCHER_ADDRESS...",
  "l2OutputOracleProposer": "0x...YOUR_PROPOSER_ADDRESS...",
  "l1RpcEndpoint": "https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY",
  "l2GenesisEthPairs": [],
  "gasPriceOracleOverhead": 2100,
  "gasPriceOracleScalar": 1000000,
  "governanceTokenSymbol": "OP",
  "governanceTokenName": "Optimism",
  "governanceTokenOwner": "0x...YOUR_ADMIN_ADDRESS...",
  "eip1559Elasticity": 6,
  "eip1559Denominator": 50
}

```


*Note: Fill in the 0x addresses with wallets you control (and have funded on Base Sepolia).*
3. **Deploy the L1 Contracts (to Base Sepolia):**
We use `forge` to deploy the bridge and rollup contracts onto Base Sepolia.
```bash
# Set your Private Key (must have Base Sepolia ETH)
export PRIVATE_KEY=0x...
export ETH_RPC_URL=https://base-sepolia.g.alchemy.com/v2/YOUR_KEY

# Deploy
forge script scripts/Deploy.s.sol:Deploy \
  --rpc-url $ETH_RPC_URL \
  --broadcast \
  --private-key $PRIVATE_KEY \
  --sig "runWithStateDiff()" 

```


*Save the `deployment-artifact.json` generated. You need the addresses of `L1StandardBridge`, `OptimismPortal`, etc.*
4. **Generate Genesis File:**
```bash
go run cmd/main.go genesis l2 \
  --deploy-config deploy-config/my-l3.json \
  --l1-deployments deployments/artifact.json \
  --outfile genesis.json

```



### Step 3: Run the Node (Docker Compose)

Create a `docker-compose.yml` in the root:

```yaml
version: '3.4'
services:
  # 1. Execution Client (Geth)
  l2:
    image: us-docker.pkg.dev/oplabs-tools-artifacts/images/op-geth:latest
    ports:
      - "8545:8545"
      - "8546:8546"
    volumes:
      - ./genesis.json:/genesis.json
      - ./jwt.txt:/jwt.txt
    entrypoint: 
      - /bin/sh
      - -c
      - "geth init --datadir=/db /genesis.json && geth --datadir=/db --http --http.addr=0.0.0.0 --authrpc.addr=0.0.0.0 --authrpc.vhosts=* --authrpc.jwtsecret=/jwt.txt"

  # 2. Consensus Client (Node)
  node:
    image: us-docker.pkg.dev/oplabs-tools-artifacts/images/op-node:latest
    ports:
      - "5050:5050"
    command: >
      op-node
      --l1=https://base-sepolia.g.alchemy.com/v2/YOUR_KEY
      --l2=http://l2:8551
      --l2.jwt-secret=/jwt.txt
      --sequencer.enabled
      --sequencer.l1-confs=3
      --verifier.l1-confs=3
      --p2p.sequencer.key=YOUR_SEQUENCER_PRIVATE_KEY
      --rollup.config=./rollup.json

  # 3. Batcher (Data Availability)
  batcher:
    image: us-docker.pkg.dev/oplabs-tools-artifacts/images/op-batcher:latest
    command: >
      op-batcher
      --l2-eth-rpc=http://l2:8545
      --rollup-rpc=http://node:8547
      --poll-interval=1s
      --sub-safety-margin=6
      --num-confirmations=1
      --safe-abort-nonce-too-low-count=3
      --resubmission-timeout=30s
      --rpc.addr=0.0.0.0
      --rpc.port=8548
      --l1-eth-rpc=https://base-sepolia.g.alchemy.com/v2/YOUR_KEY
      --private-key=YOUR_BATCHER_PRIVATE_KEY

  # 4. Proposer (State Roots)
  proposer:
    image: us-docker.pkg.dev/oplabs-tools-artifacts/images/op-proposer:latest
    command: >
      op-proposer
      --poll-interval=12s
      --rpc.port=8560
      --rollup-rpc=http://node:8547
      --l2oo-address=ADDRESS_OF_L2_OUTPUT_ORACLE_ON_BASE
      --private-key=YOUR_PROPOSER_PRIVATE_KEY
      --l1-eth-rpc=https://base-sepolia.g.alchemy.com/v2/YOUR_KEY

```

### Step 4: Start Your L3

1. **Generate JWT:** `openssl rand -hex 32 > jwt.txt`
2. **Start:**
```bash
docker-compose up -d

```


3. **Logs:** `docker-compose logs -f node`
*Look for "Derivation loop" or "Accepted block".*

---

## 4. Common Pitfalls

1. **Chain ID Mismatch:**
* **Gotcha:** If your `genesis.json` chain ID doesn't match the `op-geth` chain ID flag, the node will panic.
* **Fix:** Ensure `l2ChainId` in `deploy-config` matches your setup.


2. **Insufficient Gas on Base Sepolia:**
* **Gotcha:** The Batcher posts transactions constantly. If it runs out of ETH on Base Sepolia, your L3 stops producing "safe" blocks.
* **Fix:** Keep the Batcher wallet funded.


3. **L1 Reorgs:**
* **Gotcha:** Base Sepolia is a testnet and can reorg.
* **Fix:** Set `--sequencer.l1-confs=5` or higher to wait for stability.



