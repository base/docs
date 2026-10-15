# Build an Evolving NFT: On-Chain SVG & Automation

**Author:** jadonamite
**Topic:** NFT Mechanics & Automation
**Level:** Intermediate
**Prerequisites:** Node.js v18+, Foundry, Base Sepolia ETH

Static JPEGs are boring. The future of NFTs is dynamic—assets that change, grow, and react to the world.

In this tutorial, we will build a **Self-Evolving NFT** entirely on-chain.

1. **The Asset:** A "Digital Pet" that starts as an **Egg**, hatches into a **Larva**, and grows into a **Butterfly**.
2. **The Engine:** All metadata and images are generated via **On-Chain SVG** (no IPFS required).
3. **The Automation:** We will write a "Keeper" bot (using Viem) that automatically detects when a pet is ready to evolve and triggers the transaction.

---

## 1. Architecture

* **Smart Contract:** ERC-721 token that stores a `stage` (0, 1, 2) for each Token ID.
* **Visuals:** The `tokenURI` function dynamically constructs an SVG string based on the current `stage`.
* **Automation:** A Node.js script that polls the contract. If `block.timestamp > lastEvolution + interval`, it calls `evolve()`.

---

## 2. Smart Contract Implementation

We need a contract that holds state and renders SVGs.

### Step 1: Init Foundry

```bash
forge init evolving-nft --no-commit
cd evolving-nft
npm install @openzeppelin/contracts

```

*(Note: You'll need to map OpenZeppelin in `foundry.toml` or install via forge modules. For simplicity, we assume standard remappings are set).*

### Step 2: The Contract (`src/EvolvingNFT.sol`)

This contract features three distinct visual states encoded directly in Solidity.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EvolvingNFT is ERC721, Ownable {
    uint256 public tokenCounter;
    
    // State mapping: TokenID => Stage (0=Egg, 1=Larva, 2=Butterfly)
    mapping(uint256 => uint256) public stages;
    // Time mapping: TokenID => Last Evolution Timestamp
    mapping(uint256 => uint256) public lastEvolveTimestamp;

    uint256 public constant INTERVAL = 60 seconds; // Fast evolution for demo

    constructor() ERC721("BaseMon", "BMON") Ownable(msg.sender) {}

    function mint() public {
        uint256 newTokenId = tokenCounter;
        _safeMint(msg.sender, newTokenId);
        stages[newTokenId] = 0; // Start as Egg
        lastEvolveTimestamp[newTokenId] = block.timestamp;
        tokenCounter++;
    }

    // The Automation Target
    function evolve(uint256 tokenId) public {
        require(ownerOf(tokenId) != address(0), "Token does not exist");
        require(stages[tokenId] < 2, "Already fully evolved");
        require(block.timestamp >= lastEvolveTimestamp[tokenId] + INTERVAL, "Not ready yet");

        stages[tokenId] += 1;
        lastEvolveTimestamp[tokenId] = block.timestamp;
    }

    // Dynamic Rendering
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        uint256 stage = stages[tokenId];
        string memory imageURI;
        string memory nameSuffix;

        if (stage == 0) {
            nameSuffix = " (Egg)";
            // Simple White Circle
            imageURI = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='30' fill='white' /><text x='50' y='90' font-size='10' text-anchor='middle' fill='white'>Egg</text></svg>";
        } else if (stage == 1) {
            nameSuffix = " (Larva)";
            // Green Pill shape
            imageURI = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect x='30' y='40' width='40' height='20' rx='10' fill='lightgreen' /><text x='50' y='90' font-size='10' text-anchor='middle' fill='white'>Larva</text></svg>";
        } else {
            nameSuffix = " (Butterfly)";
            // Blue Wings
            imageURI = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><path d='M30,30 Q10,10 30,50 Q10,90 30,70 L50,50 L70,70 Q90,90 70,50 Q90,10 70,30 Z' fill='cyan' /><text x='50' y='90' font-size='10' text-anchor='middle' fill='white'>Butterfly</text></svg>";
        }

        string memory json = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        '{"name": "BaseMon #', 
                        Strings.toString(tokenId), 
                        nameSuffix,
                        '", "description": "An evolving NFT on Base.", "image": "data:image/svg+xml;base64,', 
                        Base64.encode(bytes(imageURI)), 
                        '"}'
                    )
                )
            )
        );

        return string(abi.encodePacked("data:application/json;base64,", json));
    }
}

```

### Step 3: Deploy

Use your deployment script from previous tutorials or `forge create`.
*(Assumption: You have deployed this and have the `CONTRACT_ADDRESS`)*.

---

## 3. Automation Script (The "Keeper")

Now we write the Node.js bot that checks the blockchain and acts.

**Setup:**
`npm install viem dotenv`

Create `keeper.ts`:

```typescript
import { createPublicClient, createWalletClient, http, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import * as dotenv from "dotenv";

dotenv.config();

const CONTRACT_ADDRESS = "0x...YOUR_CONTRACT_ADDRESS...";
const ABI = [
  { inputs: [], name: "tokenCounter", outputs: [{ type: "uint256" }], type: "function" },
  { inputs: [{ type: "uint256" }], name: "stages", outputs: [{ type: "uint256" }], type: "function" },
  { inputs: [{ type: "uint256" }], name: "lastEvolveTimestamp", outputs: [{ type: "uint256" }], type: "function" },
  { inputs: [{ type: "uint256" }], name: "evolve", outputs: [], type: "function" }
] as const;

// Setup Clients
const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });
const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http() });

const INTERVAL = 60n; // Matches contract interval

async function checkAndEvolve() {
  console.log("🔍 Checking for evolutions...");

  // 1. Get Total Supply
  const totalSupply = await publicClient.readContract({
    address: CONTRACT_ADDRESS, abi: ABI, functionName: "tokenCounter"
  });

  const now = BigInt(Math.floor(Date.now() / 1000));

  // 2. Loop through all tokens (Inefficient for large sets, fine for demo)
  for (let i = 0n; i < totalSupply; i++) {
    const stage = await publicClient.readContract({
      address: CONTRACT_ADDRESS, abi: ABI, functionName: "stages", args: [i]
    });

    if (stage >= 2n) continue; // Already max level

    const lastEvolve = await publicClient.readContract({
      address: CONTRACT_ADDRESS, abi: ABI, functionName: "lastEvolveTimestamp", args: [i]
    });

    // 3. Check Condition
    if (now >= lastEvolve + INTERVAL) {
      console.log(`⚡ Token #${i} is ready to evolve! Triggering transaction...`);
      try {
        const hash = await walletClient.writeContract({
          address: CONTRACT_ADDRESS,
          abi: ABI,
          functionName: "evolve",
          args: [i]
        });
        console.log(`✅ Evolved Token #${i}: ${hash}`);
      } catch (err) {
        console.error(`❌ Failed to evolve #${i}`, err);
      }
    }
  }
}

// Poll every 30 seconds
setInterval(checkAndEvolve, 30000);
console.log("🤖 Keeper Bot Started");

```

---

## 4. Running the Demo

1. **Deploy Contract:** Run `forge create ...`
2. **Mint a Pet:** call `mint()` via Basescan or Cast.
3. **Start Keeper:** `npx tsx keeper.ts`
4. **Wait 60s:**
* **Minute 0:** You have an Egg.
* **Minute 1:** Keeper detects condition -> Sends Tx -> You have a Larva.
* **Minute 2:** Keeper detects condition -> Sends Tx -> You have a Butterfly.



---

## 5. Common Pitfalls

1. **Gas Costs:**
* **Issue:** Running a bot that evolves *everyone's* NFT costs *you* gas.
* **Fix:** In production, use **Chainlink Automation** (which manages gas/balance) or require the *user* to click "Evolve" (lazy update).


2. **SVG Encoding:**
* **Issue:** Browser shows broken image.
* **Fix:** Ensure your Base64 encoding in Solidity matches the standard. The string must start exactly with `data:image/svg+xml;base64,`.


3. **Arrays in Loops:**
* **Issue:** Looping `0` to `tokenCounter` crashes if you have 10,000 tokens.
* **Fix:** Use an Enumerable extension or an off-chain indexer (The Graph) to find only the tokens that need updates.





## Verification
- [x] Verified Contract compiles and Base64 encodes correctly.
- [x] Verified SVG renders in browser.
- [x] Verified Keeper script successfully triggers state changes on Base Sepolia.

```
