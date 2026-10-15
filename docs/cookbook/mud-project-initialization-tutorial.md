# Build an Onchain World: Initialize MUD on Base

**Author:** jadonamite
**Topic:** Autonomous Worlds & Onchain Games
**Level:** Advanced
**Prerequisites:** Node.js v18+, pnpm, Foundry

**MUD** is not just a game engine; it's an operating system for Ethereum. It replaces the traditional "Smart Contract" pattern with a database-like architecture (Store) and a logic layer (Systems). This allows you to build massive, composable applications—like autonomous worlds or onchain RTS games—that were previously impossible.

In this tutorial, we will initialize a **MUD v2** project and deploy a "Hello World" (Counter) to **Base Sepolia**.

---

## 1. Architecture

* **Store:** An onchain database engine. Instead of `mapping(address => uint)`, you define **Tables** in a config file.
* **World:** The single entry point contract. It routes transactions to the correct System.
* **Client:** A React app that syncs the *entire* chain state into a local SQL-like browser database (RECS) for instant responsiveness.

---

## 2. Prerequisites

MUD relies heavily on **pnpm** and **Foundry**.

1. **Install Foundry:** `curl -L https://foundry.paradigm.xyz | bash`
2. **Install pnpm:** `npm install -g pnpm`
3. **Base Sepolia ETH:** Fund a deployer wallet.

---

## 3. Implementation

### Step 1: Scaffold the Project

We use the official MUD template.

```bash
# Create the project
pnpm create mud@latest base-mud-world

# Select "Vanilla" or "React" (We choose React for a full stack)
# ? Pick a template › React

```

Navigate into the folder:

```bash
cd base-mud-world
pnpm install

```

### Step 2: Define Data Tables (`packages/contracts/mud.config.ts`)

MUD generates Solidity code from this config. Let's define a `Counter` table that stores a single `uint32`.

Open `packages/contracts/mud.config.ts`:

```typescript
import { defineWorld } from "@latticexyz/world";

export default defineWorld({
  namespace: "app",
  tables: {
    Counter: {
      schema: {
        value: "uint32",
      },
      key: [], // Singleton table (no key)
    },
  },
});

```

### Step 3: Write Logic (`packages/contracts/src/systems/IncrementSystem.sol`)

Systems are stateless logic containers. They read from Tables and write to Tables.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import { Counter } from "../codegen/index.sol"; // Auto-generated from config

contract IncrementSystem is System {
  function increment() public {
    // 1. Get current value
    uint32 counter = Counter.get();
    
    // 2. Update value
    Counter.set(counter + 1);
  }
}

```

*Note: Run `pnpm build` in the root to auto-generate the `Counter` library so your editor stops complaining.*

### Step 4: Configure Network (`packages/contracts/foundry.toml`)

MUD uses Foundry for deployment. We need to add Base Sepolia profile.

```toml
[profile.default]
src = "src"
test = "test"
script = "script"
libs = ["node_modules"]

[rpc_endpoints]
base_sepolia = "https://sepolia.base.org"

```

### Step 5: Deploy to Base Sepolia

MUD has a specialized deployer that handles the complexity of registering tables and systems.

1. **Set Environment:**
```bash
export PRIVATE_KEY=0x...YOUR_DEPLOYER_KEY...
export RPC_URL=https://sepolia.base.org

```


2. **Deploy:**
Run this command from the project **root**:
```bash
pnpm run deploy:testnet

```


*Wait for the script to finish. It will output the `World Address`.*

### Step 6: Connect the Client

Now that the world is live, let's point the frontend to it.

1. Open `packages/client/src/index.tsx` (or `App.tsx`).
2. MUD v2 usually auto-detects the chain ID if you configure it in `packages/client/src/mud/supportedChains.ts`.

Ensure `baseSepolia` is imported from `viem/chains` and added to the array:

```typescript
import { baseSepolia } from "viem/chains";
import { mudFoundry } from "@latticexyz/common/chains";

export const supportedChains = [
  mudFoundry,
  baseSepolia, // Add this
];

```

3. **Run Client:**
```bash
pnpm run dev

```


*The client will start, sync with your Base Sepolia World, and allow you to click "Increment".*

---

## 4. Common Pitfalls

1. **"StoreConfig Error":**
* **Context:** Changing `mud.config.ts` without re-running the build.
* **Fix:** Always run `pnpm build` in `packages/contracts` after changing the table config.


2. **Gas Estimation Failures:**
* **Context:** MUD deployments are large batches. Base Sepolia might reject if the batch is too big.
* **Fix:** If deployment fails, try deploying systems one by one or ensure your RPC supports high gas limits.


3. **Indexer Sync:**
* **Context:** The client doesn't update.
* **Fix:** MUD defaults to a local indexer. For testnet, ensure your client is using the official MUD Indexer or directly querying the RPC (RPC mode).




