This tutorial covers building a **fully on-chain Dynamic NFT**. Unlike static JPEGs on IPFS, this NFT’s appearance and metadata are generated entirely in Solidity.

We will build **"The Base Bloom"**: A flower that grows from a **Seed** → **Sprout** → **Flower** based on on-chain time.

---

# Tutorial: Building a Dynamic On-Chain NFT

### **Objective**

Create an ERC-721 token that updates its own metadata and SVG image based on `block.timestamp`.

### **Architecture**

* **Storage:** The contract stores the "birth time" of each token.
* **Logic:** The `tokenURI` function calculates the current "Stage" (0, 1, or 2) by comparing `block.timestamp` to the birth time.
* **Rendering:** The contract dynamically constructs a Base64-encoded SVG string representing the current stage. No IPFS or API is required.

---

## **Prerequisites**

* Foundry
* Base Sepolia ETH

---

## **Part 1: The Smart Contract**

We need `OpenZeppelin` for the ERC721 standard and Base64 encoding.

**Setup:**

```bash
forge init dynamic-nft
cd dynamic-nft
forge install OpenZeppelin/openzeppelin-contracts --no-commit

```

**`foundry.toml` Remappings:**

```toml
remappings = [
    "@openzeppelin/=lib/openzeppelin-contracts/"
]

```

**Contract: `src/BaseBloom.sol**`

This contract uses a "Stage" logic.

* **Stage 0 (Seed):** Age < 1 hour.
* **Stage 1 (Sprout):** 1 hour < Age < 24 hours.
* **Stage 2 (Bloom):** Age > 24 hours.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract BaseBloom is ERC721 {
    using Strings for uint256;

    uint256 private _nextTokenId;

    // Mapping from Token ID to Mint Timestamp
    mapping(uint256 => uint256) public birthTime;

    constructor() ERC721("BaseBloom", "BLOOM") {}

    function mint() public {
        uint256 tokenId = _nextTokenId++;
        _mint(msg.sender, tokenId);
        birthTime[tokenId] = block.timestamp;
    }

    /**
     * @notice Determines the growth stage based on time elapsed.
     * 0 = Seed, 1 = Sprout, 2 = Bloom
     */
    function getStage(uint256 tokenId) public view returns (uint256) {
        // Validation check
        _requireOwned(tokenId); 

        uint256 age = block.timestamp - birthTime[tokenId];

        // For demo purposes: stages happen fast (60 seconds and 120 seconds)
        // In prod: use larger values (e.g., 1 days, 7 days)
        if (age < 60) {
            return 0; // Seed
        } else if (age < 120) {
            return 1; // Sprout
        } else {
            return 2; // Bloom
        }
    }

    /**
     * @notice Generates the SVG image code for the current stage.
     */
    function generateSVG(uint256 tokenId) internal view returns (string memory) {
        uint256 stage = getStage(tokenId);
        string memory color;
        string memory element;

        if (stage == 0) {
            color = "#8B4513"; // Brown Soil
            element = '<circle cx="50" cy="80" r="5" fill="#DEB887" />'; // A small seed
        } else if (stage == 1) {
            color = "#228B22"; // Green Sprout
            element = '<rect x="48" y="60" width="4" height="20" fill="#32CD32" /><circle cx="50" cy="55" r="5" fill="#32CD32" />';
        } else {
            color = "#FFD700"; // Golden Bloom
            element = '<rect x="48" y="50" width="4" height="30" fill="#32CD32" /><circle cx="50" cy="45" r="15" fill="#FF4500" /><circle cx="50" cy="45" r="5" fill="#FFFF00" />';
        }

        return string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMinYMin meet" viewBox="0 0 100 100">',
            '<rect width="100%" height="100%" fill="', color, '" />',
            element,
            '<text x="50" y="90" font-family="sans-serif" font-size="5" text-anchor="middle" fill="white">Base Bloom #', tokenId.toString(), '</text>',
            '</svg>'
        ));
    }

    /**
     * @notice Returns the full Data URI (Base64 encoded JSON + SVG).
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        string memory svg = Base64.encode(bytes(generateSVG(tokenId)));
        string memory stageName = getStage(tokenId) == 0 ? "Seed" : (getStage(tokenId) == 1 ? "Sprout" : "Bloom");

        string memory json = Base64.encode(bytes(string(abi.encodePacked(
            '{"name": "Base Bloom #', tokenId.toString(), '",',
            '"description": "A dynamic flower that grows on Base.",',
            '"attributes": [{"trait_type": "Stage", "value": "', stageName, '"}],',
            '"image": "data:image/svg+xml;base64,', svg, '"}'
        ))));

        return string(abi.encodePacked("data:application/json;base64,", json));
    }
}

```

---

## **Part 2: Deployment**

**`script/DeployBloom.s.sol`**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/BaseBloom.sol";

contract DeployBloom is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        BaseBloom bloom = new BaseBloom();
        console.log("BaseBloom deployed at:", address(bloom));

        vm.stopBroadcast();
    }
}

```

**Deploy:**

```bash
forge script script/DeployBloom.s.sol --rpc-url $BASE_SEPOLIA_RPC --broadcast --verify --etherscan-api-key $BASESCAN_API_KEY

```

---

## **Part 3: Frontend Integration (The Viewer)**

Since the metadata is on-chain, fetching it is slightly different. The `tokenURI` returns a raw base64 string, not an HTTP URL.

**Component: `components/BloomViewer.tsx**`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';

const CONTRACT_ADDRESS = "0xYourDeployedAddress";

const ABI = [{
  "inputs": [{"name": "tokenId", "type": "uint256"}],
  "name": "tokenURI",
  "outputs": [{"name": "", "type": "string"}],
  "stateMutability": "view",
  "type": "function"
}] as const;

export default function BloomViewer({ tokenId }: { tokenId: bigint }) {
  const [image, setImage] = useState<string>("");
  const [name, setName] = useState<string>("");

  // Read the Token URI
  const { data: tokenUriData, refetch } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'tokenURI',
    args: [tokenId],
  });

  useEffect(() => {
    if (tokenUriData) {
      // 1. Data comes in as "data:application/json;base64,ey..."
      // 2. We need to split logic to handle the prefix
      const base64String = tokenUriData.split(',')[1];
      
      try {
        // 3. Decode the JSON
        const jsonString = atob(base64String);
        const metadata = JSON.parse(jsonString);

        // 4. Set Image and Name
        setName(metadata.name);
        setImage(metadata.image); // This is already a data:image/svg+xml string
      } catch (e) {
        console.error("Error parsing metadata", e);
      }
    }
  }, [tokenUriData]);

  return (
    <div className="card w-96 bg-base-100 shadow-xl border border-gray-700">
      <figure className="px-10 pt-10">
        {image ? (
          <img src={image} alt="Base Bloom" className="rounded-xl border border-gray-600" />
        ) : (
          <div className="skeleton w-32 h-32"></div>
        )}
      </figure>
      <div className="card-body items-center text-center">
        <h2 className="card-title text-white">{name || `Loading #${tokenId}...`}</h2>
        <p className="text-gray-400">This NFT updates automatically over time.</p>
        <div className="card-actions">
          <button className="btn btn-primary btn-sm" onClick={() => refetch()}>
            Refresh Stage
          </button>
        </div>
      </div>
    </div>
  );
}

```

---

## **Common Pitfalls**

1. **Gas Cost:** Storing huge strings in Solidity is expensive. Keep your SVG generation logic minimal. Use simple shapes (`<rect>`, `<circle>`).
2. **Base64 Padding:** Solidity's `Base64` libraries are strict. Ensure you use the OpenZeppelin one, as it handles padding correctly.
3. **Marketplace Caching:** Opensea and other marketplaces cache metadata heavily. They often won't show the "Bloom" stage immediately even if the contract says so. You often have to click "Refresh Metadata" on the marketplace manually.
* *Dev Tip:* For purely dynamic visuals in a DApp, always read directly from the contract (as shown in the frontend code), rather than relying on a secondary indexer API.

