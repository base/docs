# Build an Onchain Physics Engine: ECS Movement with MUD

**Author:** @jadonamite
**Topic:** Autonomous Worlds & ECS Architecture
**Level:** Advanced
**Prerequisites:** MUD Project Initialized (see previous tutorial), Foundry

In traditional game development, the **Entity-Component-System (ECS)** pattern is king. It decouples data from logic, allowing you to simulate thousands of objects efficiently.

On the blockchain, ECS is even more powerful. It allows your smart contracts to be **composable**. You can deploy a "Movement System" today, and someone else can deploy a "Gravity System" tomorrow that affects *your* entities without changing your code.

In this tutorial, we will implement a grid-based movement system on Base Sepolia using **MUD v2**.

---

## 1. Architecture

We are building a **2D Grid World**.

* **Entity:** A unique ID (bytes32) representing the Player.
* **Component (Table):** `Position` (stores `x` and `y` coordinates).
* **System:** `MoveSystem` (calculates the new coordinate and updates the Table).

---

## 2. Prerequisites

You must have an initialized MUD project (from the previous guide).

* `pnpm install`
* `foundryup`

---

## 3. Implementation

### Step 1: Define the Component (`mud.config.ts`)

First, we define the data structure. In ECS, data lives in **Tables**.

Open `packages/contracts/mud.config.ts` and add a `Position` table.

```typescript
import { defineWorld } from "@latticexyz/world";

export default defineWorld({
  namespace: "app",
  tables: {
    // Component: Position
    // Maps an Entity (key) to X,Y coordinates
    Position: {
      schema: {
        x: "int32",
        y: "int32",
      },
      key: ["owner"], // The entity ID (usually the player's address)
    },
    // Component: Movable
    // A tag to mark entities that are allowed to move
    Movable: {
      schema: {
        value: "bool",
      },
      key: ["owner"],
    },
  },
});

```

*Run `pnpm build` in `packages/contracts` to generate the Solidity libraries.*

### Step 2: Implement the Logic (`MoveSystem.sol`)

Now we write the System. This contract will read the `Position` table, calculate the new coordinates, and write back to it.

Create `packages/contracts/src/systems/MoveSystem.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import { Position, Movable } from "../codegen/index.sol"; // Auto-generated

contract MoveSystem is System {
    
    // Define Directions
    enum Direction {
        North,
        East,
        South,
        West
    }

    function spawn(int32 x, int32 y) public {
        address player = _msgSender();
        
        // 1. Initialize Components
        Position.set(player, x, y);
        Movable.set(player, true);
    }

    function move(Direction direction) public {
        address player = _msgSender();

        // 1. Check if entity is Movable
        require(Movable.get(player), "Entity is not movable");

        // 2. Get current position
        (int32 x, int32 y) = Position.get(player);

        // 3. Calculate new position
        if (direction == Direction.North) {
            y += 1;
        } else if (direction == Direction.East) {
            x += 1;
        } else if (direction == Direction.South) {
            y -= 1;
        } else if (direction == Direction.West) {
            x -= 1;
        }

        // 4. Boundary Check (Optional: constrain to 10x10 grid)
        // require(x >= 0 && x <= 10 && y >= 0 && y <= 10, "Out of bounds");

        // 5. Update Component
        Position.set(player, x, y);
    }
}

```

### Step 3: Deployment

Use the standard MUD deployment flow.

```bash
# In packages/contracts
pnpm run deploy:testnet

```

*MUD automatically registers the `Position` table and the `MoveSystem` with the World.*

### Step 4: Client Integration (Optimistic Updates)

One of MUD's superpowers is **Optimistic Rendering**. Because the logic is deterministic (ECS), the client can predict the result of `move()` before the transaction confirms on Base.

In your React client (`packages/client/src/App.tsx`), you can now hook into the data:

```typescript
import { useComponentValue } from "@latticexyz/react";
import { useMUD } from "./MUDContext";

export const GameBoard = () => {
  const {
    components: { Position },
    network: { playerEntity },
    systemCalls: { move },
  } = useMUD();

  // 1. Reactive Position
  // This updates instantly when the local cache changes
  const position = useComponentValue(Position, playerEntity);

  return (
    <div>
      <h1>Player Position: {position?.x}, {position?.y}</h1>
      
      <div className="controls">
        <button onClick={() => move("North")}>⬆️ North</button>
        <button onClick={() => move("West")}>⬅️ West</button>
        <button onClick={() => move("East")}>➡️ East</button>
        <button onClick={() => move("South")}>⬇️ South</button>
      </div>
    </div>
  );
};

```

---

## 4. Common Pitfalls

1. **Gas Costs (The Loop Problem):**
* **Context:** Moving every frame (60fps) on-chain is expensive, even on Base.
* **Fix:** MUD is designed for "strategic" movement (turn-based or tick-based). For real-time physics, use Client-Side Prediction with server reconciliation, or only commit the *final* position on-chain after a session.


2. **Over-fetching:**
* **Context:** Loading the entire map history.
* **Fix:** Use the MUD Indexer to query only the current state of the `Position` table, rather than replaying all events.


3. **Concurrency:**
* **Context:** Two players moving into the same square at the same time.
* **Fix:** ECS handles this via transaction ordering. If you need collision logic (`require(Position.get(targetX, targetY) == empty)`), the second transaction will revert.



