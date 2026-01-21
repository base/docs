# Chainlink Automation on Base

This tutorial demonstrates how to set up a smart contract that "wakes up" and executes code automatically based on a time interval. We use **Chainlink Automation** (Nodes) to monitor our contract off-chain and trigger the on-chain transaction when conditions are met.

## Objectives
- Build an `AutomationCompatible` contract.
- Implement the `checkUpkeep` (simulation) and `performUpkeep` (execution) pattern.
- Register the Upkeep on the Chainlink Automation App.

## Prerequisites
- Foundry
- Base Sepolia ETH
- Base Sepolia LINK (Get it from [faucets.chain.link](https://faucets.chain.link))

## Quick Start

### 1. Smart Contract
```bash
cd foundry
forge install smartcontractkit/chainlink --no-commit
forge test
2. Registration
After deployment, you must register your contract address at automation.chain.link to start the automation loop.

**File Path:** `tutorials/chainlink-automation/foundry/src/IntervalCounter.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

contract IntervalCounter is AutomationCompatibleInterface {
    uint256 public counter;
    uint256 public lastTimeStamp;
    uint256 public immutable interval;

    constructor(uint256 _interval) {
        interval = _interval;
        lastTimeStamp = block.timestamp;
        counter = 0;
    }

    /**
     * @notice Checks if the contract needs maintenance.
     * @dev Chainlink nodes call this off-chain (static call). 
     * If returns true, they call performUpkeep.
     * @return upkeepNeeded True if enough time has passed.
     */
    function checkUpkeep(bytes calldata /* checkData */) 
        external 
        view 
        override 
        returns (bool upkeepNeeded, bytes memory /* performData */) 
    {
        upkeepNeeded = (block.timestamp - lastTimeStamp) > interval;
        // We don't need performData for this simple example, so we return empty bytes
        return (upkeepNeeded, "");
    }

    /**
     * @notice Executes the maintenance.
     * @dev Chainlink nodes call this on-chain.
     */
    function performUpkeep(bytes calldata /* performData */) external override {
        // 1. Re-validate the condition (Critical for security!)
        if ((block.timestamp - lastTimeStamp) > interval) {
            lastTimeStamp = block.timestamp;
            counter = counter + 1;
        }
        // If condition failed, we do nothing (or could revert).
        // It's best practice to re-check state to prevent multiple Keepers 
        // from triggering it simultaneously in edge cases.
    }
}
File Path: tutorials/chainlink-automation/foundry/foundry.toml
Ini, TOML[profile.default]
src = "src"
out = "out"
libs = ["lib"]

remappings = [
    "@chainlink/=lib/chainlink/",
    "forge-std/=lib/forge-std/src/"
]
File Path: tutorials/chainlink-automation/foundry/test/IntervalCounter.t.sol
Solidity// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/IntervalCounter.sol";

contract IntervalCounterTest is Test {
    IntervalCounter public automatedContract;
    uint256 constant INTERVAL = 60; // 60 seconds

    function setUp() public {
        automatedContract = new IntervalCounter(INTERVAL);
    }

    function test_CheckUpkeep_FalseInitially() public view {
        (bool upkeepNeeded, ) = automatedContract.checkUpkeep("");
        assertFalse(upkeepNeeded);
    }

    function test_CheckUpkeep_TrueAfterInterval() public {
        // Time travel forward
        vm.warp(block.timestamp + INTERVAL + 1);
        (bool upkeepNeeded, ) = automatedContract.checkUpkeep("");
        assertTrue(upkeepNeeded);
    }

    function test_PerformUpkeep_UpdatesState() public {
        vm.warp(block.timestamp + INTERVAL + 1);
        
        // Simulate the Keeper calling the function
        automatedContract.performUpkeep("");

        assertEq(automatedContract.counter(), 1);
        assertEq(automatedContract.lastTimeStamp(), block.timestamp);
    }
}
File Path: tutorials/chainlink-automation/foundry/script/DeployCounter.s.sol
Solidity// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/IntervalCounter.sol";

contract DeployCounter is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy with 60 second interval
        IntervalCounter counter = new IntervalCounter(60);
        console.log("IntervalCounter deployed at:", address(counter));

        vm.stopBroadcast();
    }
}

2. Common Pitfalls (For the README)
Forgot to Fund: The Upkeep requires LINK (or ETH) to pay the nodes. If your Upkeep balance hits 0, it stops running.
Re-validation: Always check the condition again inside performUpkeep. Do not trust that checkUpkeep returning true guarantees the state is still valid when the transaction lands.
Gas Limit: When registering the Upkeep, ensure the gas limit is high enough for your performUpkeep logic. If your logic is complex, 500k gas might not be enough.
