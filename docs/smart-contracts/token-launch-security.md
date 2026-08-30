---
title: "Token Launch Security: TimeLock & Verification"
slug: /cookbook/token-launch-security
description: A production guide for securing tokens on Base using AccessControl and TimeLocks instead of renouncing ownership.
author: [Jadonamite]
tags: [smart-contracts, security, timelock, solidity, launch]
---

###  Token Launch Security: From "Renounced" to "Verified"

**Target Audience:** Smart Contract Engineers & Founders
**Goal:** Implement a security architecture that builds trust without sacrificing the ability to upgrade or fix critical bugs. We move beyond the "Renounce Ownership" meta to a professional "TimeLock + Access Control" standard.

#### Part 1: The Security Architecture

The "Renounced Ownership" model is binary: you are either 100% in control or 0% in control. Production apps on Base require a gradient of security.

| Security Model | Mechanism | Implication | Best For |
| --- | --- | --- | --- |
| **Renounced Ownership** | `owner = 0x0` | **Immutable.** No one can fix bugs, pause trading, or blacklist hackers. | Meme coins with zero roadmap. |
| **Dev Multisig** | `owner = Gnosis Safe` | **Trusted.** A group of humans must sign transactions. Faster than TimeLock, but relies on trust. | Early-stage active development. |
| **TimeLock Controller** | `owner = TimeLock Contract` | **Verifiable.** Transactions are queued on-chain for a set time (e.g., 48h) before execution. Users can exit if they disagree. | **Production standard for DeFi/Tokens.** |

**The Recommended Setup:**

1. **Token Contract:** Inherits `AccessControl` (not just `Ownable`).
2. **Admin Role:** Held by the **TimeLock Contract**.
3. **Proposer Role:** Held by the **Dev Team (or Multisig)**.
4. **Executor Role:** Held by the **Dev Team (or Multisig)** (or "Any" address in advanced setups).

---

#### Part 2: Implementation (Smart Contracts)

We do not use `Ownable` because it is too rigid. We use `AccessControl` to separate the "Minter" from the "Admin."

**1. The Token Contract**
File: `contracts/SecureToken.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract SecureToken is ERC20, ERC20Burnable, AccessControl, ERC20Permit {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    constructor(address defaultAdmin, address minter)
        ERC20("SecureBase", "SBASE")
        ERC20Permit("SecureBase")
    {
        // 1. Grant the DEFAULT_ADMIN_ROLE to the TimeLock (passed as defaultAdmin)
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        
        // 2. Grant the MINTER_ROLE to the TimeLock or a specific logic contract
        _grantRole(MINTER_ROLE, minter);
    }

    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    // Example of a privileged function that might need TimeLock protection
    function recoverStuckETH() public onlyRole(DEFAULT_ADMIN_ROLE) {
        payable(msg.sender).transfer(address(this).balance);
    }
}

```

---

#### Part 3: The Deployment Script (Wiring the TimeLock)

This is the most critical part. We must deploy the TimeLock *first*, then the Token, and ensuring the roles are assigned correctly.

**Framework:** Hardhat + Ethers v6
File: `scripts/deploy_secure.ts`

```typescript
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // --- 1. Configure TimeLock Parameters ---
  // Min Delay: 2 days (172800 seconds). Users have 48h to react to changes.
  const MIN_DELAY = 172800; 
  
  // Proposers: Who can schedule a change? (Usually the Dev Team/Multisig)
  const proposers = [deployer.address]; 
  
  // Executors: Who can execute the change after delay? (Usually Dev Team)
  // Note: Passing address(0) would allow *anyone* to execute after the delay passes.
  const executors = [deployer.address];

  // --- 2. Deploy TimeLock ---
  // We use the standard OpenZeppelin TimelockController
  const TimeLock = await ethers.getContractFactory("TimelockController");
  const timeLock = await TimeLock.deploy(MIN_DELAY, proposers, executors, deployer.address);
  await timeLock.waitForDeployment();
  const timeLockAddress = await timeLock.getAddress();
  
  console.log("TimeLock deployed to:", timeLockAddress);

  // --- 3. Deploy Token ---
  // Pass timeLockAddress as the Admin. 
  // Pass timeLockAddress as the Minter (if you want minting to be time-delayed too).
  const Token = await ethers.getContractFactory("SecureToken");
  const token = await Token.deploy(timeLockAddress, timeLockAddress);
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();

  console.log("SecureToken deployed to:", tokenAddress);
  console.log("Verify on Basescan: The Token's 'DEFAULT_ADMIN_ROLE' must match the TimeLock address.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

```

---

#### Part 4: Verification & Maintenance

Security is useless if your users cannot verify it. Here is how to prove your setup on Basescan.

**1. Verifying Ownership (TimeLock)**
Do not tell users "Ownership is Renounced." Tell them "Governance is Timelocked."

* **Step 1:** Users go to your Token Contract on Basescan -> Read Contract.
* **Step 2:** They query `hasRole(DEFAULT_ADMIN_ROLE, <TimeLock_Address>)`. It must return `true`.
* **Step 3:** They go to the TimeLock Contract -> Read Contract -> `getMinDelay()`. It must return `172800` (or your chosen delay).

**2. Verifying Liquidity Locking**
Liquidity Locking is **not** handled by your token contract. It is handled by the LP Token contract.

* **Scenario:** You created a pool on Uniswap V3.
* **Verification:** Find the Uniswap V3 NFT position that represents your liquidity.
* **Proof:** Ensure the **Owner** of that NFT is a reputable Locking Contract (e.g., Unicrypt, Team Finance, or your own TimeLock), **not** your personal wallet.

**3. The "Emergency" Pitfall**

* **Problem:** You discover a bug, but the TimeLock forces you to wait 48 hours to fix it.
* **Solution:** In the `TimelockController` setup, there is an `admin` role for the TimeLock itself. This role can sometimes bypass delays if configured incorrectly.
* **Best Practice:** Ensure the TimeLock's self-admin is *also* a Multisig, requiring multiple team members to sign off on emergency bypasses (if your architecture permits bypasses).

---

#### Part 5: Pre-Deployment Checklist

Copy this into your internal documentation before mainnet launch.

**Contract Logic**

* [ ] **Reentrancy:** Is `nonReentrant` (OpenZeppelin) applied to all functions that transfer ETH or ERC20s back to the user?
* [ ] **Integer Safety:** Are you using Solidity `^0.8.0`? (This handles overflow/underflow automatically).
* [ ] **Loop Safety:** Do you have any `for` loops that iterate over an unbounded array? (This will eventually hit the gas limit and brick the contract).

**Access Control**

* [ ] **Privilege Check:** List every function with `onlyRole` or `onlyOwner`. Document exactly *who* holds that key.
* [ ] **Role Separation:** Ensure the wallet that deploys the contract does *not* retain admin rights indefinitely. Rotate them to the TimeLock immediately.

**Ecosystem**

* [ ] **Verified Source:** Is the contract verified on Basescan? (Run `npx hardhat verify ...`). Unverified contracts are treated as malicious by default.

---
