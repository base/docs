# Build an Onchain Game: The Infinite Emoji Grid (MUD Framework)

**Author:** @jadonamite
**Topic:** Autonomous Worlds & Onchain Games
**Level:** Advanced
**Prerequisites:** Node.js v18+, Foundry, MUD CLI

Most blockchain apps are just thin wrappers around a single smart contract. **MUD** (by Lattice) changes that. It is an "Operating System for Crypto" that uses an Entity-Component-System (ECS) architecture to build complex, scalable onchain worlds.

In this tutorial, we will build **"The Infinite Grid"** on Base Sepolia.

* **The Game:** Players spawn as an emoji avatar on an infinite 2D map.
* **The Action:** Players can move (Up, Down, Left, Right).
* **The Tech:** MUD v2 (Store & World), Foundry, and React.

---

## 1. Architecture

MUD apps are built differently than standard dApps.

1. **Store (The Database):** Instead of custom structs/mappings, you define **Tables** in a config file. MUD auto-generates the Solidity libraries to read/write this data.
2. **World (The Logic):** A single entry-point contract that routes actions to **Systems** (stateless logic contracts).
3. **Client (The Indexer):** The frontend doesn't just "read" the chain; it **replicates** the chain state locally in real-time.

---

## 2. Prerequisites

Install Foundry and the MUD CLI.

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install MUD dependencies usually happens inside the project, 
# but ensure you have pnpm installed.
npm install -g pnpm

```

---

## 3. Project Setup

We will use the official MUD starter kit.

```bash
# Create the project
pnpm create mud@latest infinite-grid

# Select:
# ? Pick a template: Vanilla (or React)
# ? Pick a language: TypeScript

```

This creates a monorepo:

* `packages/contracts`: Your Solidity logic.
* `packages/client`: Your frontend.

Navigate to the contracts folder:

```bash
cd infinite-grid/packages/contracts

```

---

## 4. The Database: `mud.config.ts`

In MUD, you don't write `struct Player { ... }` in Solidity. You define tables in TypeScript.

Open `mud.config.ts` and define our game state:

```typescript
import { defineWorld } from "@latticexyz/world";

export default defineWorld({
  namespace: "app",
  tables: {
    // Component: Where is the entity?
    Position: {
      schema: {
        x: "int32",
        y: "int32",
      },
      key: ["owner"], // Keyed by the player's address
    },
    // Component: What does the entity look like?
    Avatar: {
      schema: {
        emoji: "string", 
      },
      key: ["owner"],
    },
  },
});

```

Now, generate the Solidity libraries:

```bash
pnpm mud tablegen

```

*This creates `Position.sol` and `Avatar.sol` in your codegen folder.*

---

## 5. The Logic: `MoveSystem.sol`

We need a System to handle player movement. Create `src/systems/MoveSystem.sol`.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import { Position, Avatar } from "../codegen/index.sol";

contract MoveSystem is System {
    
    // Spawn the player at (0,0) with a random emoji if they don't exist
    function spawn(string memory emoji) public {
        address player = _msgSender();
        
        // MUD auto-generated 'get' functions
        // Check if player already has an avatar
        string memory currentAvatar = Avatar.getEmoji(player);
        
        require(bytes(currentAvatar).length == 0, "Already spawned");

        // Initialize state
        Position.set(player, 0, 0);
        Avatar.set(player, emoji);
    }

    // Move the player
    function move(int32 x, int32 y) public {
        address player = _msgSender();
        
        // 1. Get current position
        (int32 currentX, int32 currentY) = Position.get(player);

        // 2. Validate move (Max 1 step distance)
        int32 deltaX = x > currentX ? x - currentX : currentX - x;
        int32 deltaY = y > currentY ? y - currentY : currentY - y;
        
        require(deltaX + deltaY == 1, "Can only move 1 space");

        // 3. Update Position Table
        Position.set(player, x, y);
    }
}

```

---

## 6. Deployment to Base Sepolia

MUD makes deployment seamless, but you need to configure your environment.

**1. Set Environment Variables:**
In `packages/contracts/.env`:

```env
PRIVATE_KEY=0x...
RPC_URL=https://sepolia.base.org

```

**2. Deploy:**
Run the deployer from the project root.

```bash
# Inside packages/contracts
pnpm mud deploy --rpc $RPC_URL

```

MUD will:

1. Deploy the `World` contract.
2. Register your Tables (`Position`, `Avatar`).
3. Deploy your `MoveSystem`.
4. Register the system functions in the World.

*Save the `World Address` output.*

---

## 7. The Client (Brief)

MUD clients are "nodeless" in spirit—they sync the whole state.

In `packages/client/src/App.tsx`, you can now query the store:

```typescript
import { useComponentValue } from "@latticexyz/react";
import { useMUD } from "./MUDContext";

export const GameBoard = () => {
  const { components, systemCalls, network } = useMUD();
  
  // Auto-updates when the chain updates!
  const position = useComponentValue(components.Position, network.playerEntity);

  return (
    <div>
      <h1>My Pos: {position?.x}, {position?.y}</h1>
      <button onClick={() => systemCalls.move(position.x + 1, position.y)}>
        Move Right
      </button>
    </div>
  );
};

```

---

## 8. Common Pitfalls

1. **Gas Limits:**
* **Issue:** MUD deployment involves many transactions. Base Sepolia has a block gas limit.
* **Fix:** If deployment fails, retry. MUD is idempotent; it resumes where it left off.


2. **Namespace Conflicts:**
* **Issue:** If you change your `mud.config.ts` structure significantly, the onchain store might conflict with the local cache.
* **Fix:** During dev, often easier to `mud deploy` to a fresh World address or use `anvil` for rapid iteration before hitting Base Sepolia.


3. **BigInt Serialization:**
* **Issue:** JavaScript `JSON.stringify` fails with BigInt (used often in MUD keys).
* **Fix:** Use `superjson` or MUD's built-in utils for logging state.


