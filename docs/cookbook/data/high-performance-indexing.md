
---
title: "High-Performance Indexing: The Graph vs. Goldsky"
slug: /cookbook/data/high-performance-indexing
description: A comparative guide to indexing strategies on Base. Learn when to use The Graph (Subgraphs) vs. Goldsky (Real-time Pipelines) and how to deploy a custom subgraph.
authors: [your-github-username]
tags: [data, indexing, subgraphs, goldsky, the-graph, graphql]
---

# High-Performance Indexing on Base

Building a dApp by reading data directly from the blockchain (using `useContractRead` or `eth_getLogs`) is inefficient. It leads to slow loading times, rate-limiting errors, and poor user experience.

**Indexing** solves this by listening to blockchain events, processing them, and storing them in a database (like Postgres) exposed via a GraphQL API.



## Part 1: The Graph vs. Goldsky

Two major providers dominate the indexing landscape on Base. Choosing the right one depends on your latency requirements and data complexity.

| Feature | The Graph (Hosted/Network) | Goldsky |
| :--- | :--- | :--- |
| **Architecture** | **Linear Indexing.** It processes block 1, then block 2. If you change your code, it must re-sync from the "Start Block" linearly. | **Parallel Indexing.** It can process thousands of blocks simultaneously. Re-syncing years of history takes minutes, not days. |
| **Query Language** | **GraphQL.** The industry standard. | **GraphQL & SQL.** You can write standard SQL queries against your data, which is powerful for analytics. |
| **Real-Time Latency** | **Good (~seconds).** Sufficient for most UIs. | **Excellent (Sub-second).** Best for high-frequency trading or real-time gaming feeds. |
| **Cost** | Decentralized Network pays Indexers via GRT. Hosted Service is fading. | SaaS model (Subscription/Usage). |

**Recommendation:**
* Start with **The Graph** for standard DeFi/NFT applications. It is the ecosystem standard with the widest tooling support.
* Move to **Goldsky** if you hit performance bottlenecks or need to join on-chain data with off-chain data using SQL.

---

## Part 2: Building a Custom Subgraph

We will build a subgraph to index **Transfer** events from an ERC-20 token on Base.

### 1. Initialization
Install the Graph CLI globally.
```bash
npm install -g @graphprotocol/graph-cli

```

Initialize the project. You will need the address of the smart contract you want to index.

```bash
graph init \
  --product subgraph-studio \
  --from-contract 0xYourTokenAddress \
  --network base \
  --abi ./abis/Token.json \
  my-base-subgraph

```

### 2. The Manifest (`subgraph.yaml`)

This file tells the indexer *what* to listen to. Ensure the `network` is set to `base`.

```yaml
specVersion: 0.0.5
schema:
  file: ./schema.graphql
dataSources:
  - kind: ethereum
    name: MyToken
    network: base # <--- CRITICAL
    source:
      address: "0xYourTokenAddress"
      abi: Token
      startBlock: 12345678 # Always set this to the deployment block to save sync time
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      entities:
        - Transfer
      abis:
        - name: Token
          file: ./abis/Token.json
      eventHandlers:
        - event: Transfer(indexed address,indexed address,uint256)
          handler: handleTransfer
      file: ./src/mapping.ts

```

### 3. The Schema (`schema.graphql`)

Define the shape of your data. We want to track users and their balances.

```graphql
type Account @entity {
  id: ID! # The Wallet Address
  balance: BigInt!
  transfersIn: [Transfer!]! @derivedFrom(field: "to")
  transfersOut: [Transfer!]! @derivedFrom(field: "from")
}

type Transfer @entity {
  id: ID! # Transaction Hash + Log Index
  from: Account!
  to: Account!
  amount: BigInt!
  timestamp: BigInt!
}

```

### 4. The Mapping (`src/mapping.ts`)

Write the logic (AssemblyScript) to transform the raw event into your schema entities.

```typescript
import { Transfer as TransferEvent } from "../generated/MyToken/Token"
import { Account, Transfer } from "../generated/schema"
import { BigInt } from "@graphprotocol/graph-ts"

export function handleTransfer(event: TransferEvent): void {
  // 1. Create or Load the 'From' Account
  let fromAccount = Account.load(event.params.from.toHex())
  if (!fromAccount) {
    fromAccount = new Account(event.params.from.toHex())
    fromAccount.balance = BigInt.fromI32(0)
  }

  // 2. Create or Load the 'To' Account
  let toAccount = Account.load(event.params.to.toHex())
  if (!toAccount) {
    toAccount = new Account(event.params.to.toHex())
    toAccount.balance = BigInt.fromI32(0)
  }

  // 3. Update Balances
  fromAccount.balance = fromAccount.balance.minus(event.params.value)
  toAccount.balance = toAccount.balance.plus(event.params.value)

  fromAccount.save()
  toAccount.save()

  // 4. Record the Transfer
  let transfer = new Transfer(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  transfer.from = fromAccount.id
  transfer.to = toAccount.id
  transfer.amount = event.params.value
  transfer.timestamp = event.block.timestamp
  transfer.save()
}

```

### 5. Deployment

Authenticate with the Subgraph Studio (get your deploy key from the dashboard) and deploy.

```bash
graph auth --studio <YOUR_DEPLOY_KEY>
graph codegen && graph build
graph deploy --studio my-base-subgraph

```

---

## Part 3: Querying the Data

Once deployed, use the GraphQL Playground to query your data immediately.

```graphql
{
  accounts(first: 5, orderBy: balance, orderDirection: desc) {
    id
    balance
    transfersIn {
      amount
      from {
        id
      }
    }
  }
}

```
This returns the top 5 holders and their recent transfers instantly, a task that would require thousands of RPC calls to reconstruct manually.

```
