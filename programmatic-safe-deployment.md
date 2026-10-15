# Programmatic Safe Deployment on Base

This tutorial demonstrates how to deploy a Safe (Gnosis Safe) smart account programmatically using the official Safe Proxy Factory. This allows you to spin up secure multisig wallets via code rather than the web UI.

## Objectives
- Understand the Safe Singleton/Proxy architecture.
- Use the `SafeProxyFactory` to deploy a new Safe.
- Configure the Safe with an initial owner (1-of-1 setup) during deployment.

## Prerequisites
- Foundry
- Base Sepolia ETH

## Architecture
Safe uses a **Singleton** pattern.
1.  **Singleton (Master Copy):** The logic contract (already deployed by Safe team).
2.  **Proxy Factory:** A contract that clones the Singleton.
3.  **Proxy:** Your specific Safe instance, which holds funds and has owners.

## Quick Start

### 1. Setup
```bash
cd foundry
forge install safe-global/safe-smart-account --no-commit
forge test

```

### 2. Deploy

```bash
source .env
forge script script/DeploySafe.s.sol --rpc-url $BASE_SEPOLIA_RPC --broadcast

```

```

**File Path:** `tutorials/programmatic-safe-deployment/foundry/foundry.toml`

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]

remappings = [
    "@safe-global/safe-contracts/=lib/safe-smart-account/contracts/",
    "forge-std/=lib/forge-std/src/"
]

```

**File Path:** `tutorials/programmatic-safe-deployment/foundry/src/SafeDeployer.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@safe-global/safe-contracts/proxies/SafeProxyFactory.sol";
import "@safe-global/safe-contracts/Safe.sol";

/**
 * @title SafeDeployer
 * @notice A helper contract to deploy Safes with specific configurations.
 */
contract SafeDeployer {
    SafeProxyFactory public immutable proxyFactory;
    address public immutable safeSingleton;

    // Base Sepolia Addresses (Official Safe Deployments)
    // Factory: 0xC22834581EbC8527d974F8a1c97E1bEA4EF910BC
    // Singleton (v1.4.1): 0x29fcB43b46531BcA003ddC8FCB67FFE91900C762
    constructor(address _factory, address _singleton) {
        proxyFactory = SafeProxyFactory(_factory);
        safeSingleton = _singleton;
    }

    /**
     * @notice Deploys a new 1-of-1 Safe for the caller.
     * @return safeAddress The address of the newly deployed Safe Proxy.
     */
    function deploySafe() external returns (address safeAddress) {
        // 1. Prepare the initializer data (setup() function call)
        address[] memory owners = new address[](1);
        owners[0] = msg.sender;

        // setup(owners, threshold, to, data, fallbackHandler, paymentToken, payment, paymentReceiver)
        bytes memory initializer = abi.encodeWithSelector(
            Safe.setup.selector,
            owners,
            1,              // Threshold (1 signature required)
            address(0),     // "to" address for optional delegate call
            "",             // "data" for optional delegate call
            address(0),     // fallback handler
            address(0),     // payment token
            0,              // payment
            address(0)      // payment receiver
        );

        // 2. Deploy the proxy
        SafeProxy proxy = proxyFactory.createProxyWithNonce(
            safeSingleton,
            initializer,
            uint256(block.timestamp) // Nonce (using timestamp for uniqueness in this demo)
        );

        return address(proxy);
    }
}

```

**File Path:** `tutorials/programmatic-safe-deployment/foundry/script/DeploySafe.s.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/SafeDeployer.sol";
import "@safe-global/safe-contracts/Safe.sol";

contract DeploySafe is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Base Sepolia Addresses
        address factory = 0xC22834581EbC8527d974F8a1c97E1bEA4EF910BC;
        address singleton = 0x29fcB43b46531BcA003ddC8FCB67FFE91900C762;

        // 1. Deploy our Helper
        SafeDeployer deployer = new SafeDeployer(factory, singleton);
        console.log("SafeDeployer deployed at:", address(deployer));

        // 2. Use Helper to Deploy a Safe
        address mySafe = deployer.deploySafe();
        console.log("New Safe Proxy deployed at:", mySafe);

        // 3. Verification (Check Owner)
        address[] memory owners = Safe(payable(mySafe)).getOwners();
        console.log("Safe Owner:", owners[0]);

        vm.stopBroadcast();
    }
}

```

**File Path:** `tutorials/programmatic-safe-deployment/foundry/test/SafeDeployer.t.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/SafeDeployer.sol";

// Mock the Factory for unit testing to avoid forking mainnet
// In a real integration test, you would fork Base Sepolia.
contract SafeDeployerTest is Test {
    SafeDeployer public deployer;
    
    // We will use a Fork Test here because deploying the actual Safe Singleton is complex
    // Run this test with: forge test --fork-url $BASE_SEPOLIA_RPC
    function setUp() public {
        // Base Sepolia Addresses
        address factory = 0xC22834581EbC8527d974F8a1c97E1bEA4EF910BC;
        address singleton = 0x29fcB43b46531BcA003ddC8FCB67FFE91900C762;
        
        deployer = new SafeDeployer(factory, singleton);
    }

    function test_DeploySafe() public {
        // Only run if we are on a fork (checking if code exists at factory address)
        if (address(deployer.proxyFactory()).code.length == 0) return;

        address safeAddr = deployer.deploySafe();
        
        // Assertions
        assertTrue(safeAddr != address(0));
        
        Safe safe = Safe(payable(safeAddr));
        address[] memory owners = safe.getOwners();
        
        assertEq(owners.length, 1);
        assertEq(owners[0], address(this)); // Test contract is the owner
        assertEq(safe.getThreshold(), 1);
    }
}

```
### **2. Common Pitfalls (For README)**

1. **Correct Singleton Version:** Safe has many versions (1.3.0, 1.4.1). Ensure your Interface/Solidity version matches the deployed Singleton address you are calling, or the `setup` function signature might mismatch.
2. **Proxy Initialization:** `createProxy` deploys the contract but does **not** call `setup`. `createProxyWithNonce` (or passing the initializer data) is required to initialize owners in the same transaction. If you don't initialize immediately, the Safe is unsecured and anyone can claim it.
3. **Addresses:** Safe factory addresses are *usually* the same across chains (CREATE2), but always verify on the Base docs or Block explorer.
