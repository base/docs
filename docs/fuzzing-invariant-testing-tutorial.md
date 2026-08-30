# Upgrade Your Pipeline: Automated Fuzzing & Invariants

**Author:** @jadonamite
**Topic:** Security & Testing
**Level:** Advanced
**Prerequisites:** Foundry Project, Previous CI/CD Setup

Static analysis tools read your code; Fuzzers *attack* it.

Foundry has a powerful built-in fuzzer that throws random data at your functions to try and break your assertions. In this tutorial, we will write a **Stateful Invariant Test** (a test that checks if a property holds true *forever*, no matter what users do) and add it to your GitHub Actions pipeline.

---

## 1. Architecture

* **Invariant:** A property that must always be true. (e.g., "The contract must never be insolvent" or "User A cannot withdraw User B's funds").
* **Handler:** A helper contract that restricts the fuzzer to "reasonable" inputs (to avoid wasting time on invalid calls).
* **CI Integration:** Running these computationally intensive tests automatically on every PR.

---

## 2. Implementation

### Step 1: The Target Contract (`src/Vault.sol`)

Let's assume a simple Vault contract that *might* have a rounding error bug.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Vault {
    mapping(address => uint256) public balances;
    uint256 public totalAssets;

    function deposit() external payable {
        balances[msg.sender] += msg.value;
        totalAssets += msg.value;
    }

    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        balances[msg.sender] -= amount;
        totalAssets -= amount;
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
    }
}

```

### Step 2: The Invariant Test (`test/invariants/Vault.invariants.t.sol`)

Create a folder `test/invariants` and add this file. We want to prove that `totalAssets` **always** equals the sum of individual `balances`.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {Vault} from "../../src/Vault.sol";

// 1. The Handler (Simplifies interactions for the fuzzer)
contract Handler is Test {
    Vault public vault;
    
    constructor(Vault _vault) {
        vault = _vault;
    }

    // Fuzzer calls this with random 'amount' and random 'caller'
    function deposit(uint256 amount) public {
        amount = bound(amount, 1, 10 ether); // Constrain input to realistic values
        vm.deal(address(this), amount); // Fund the handler
        vault.deposit{value: amount}();
    }

    function withdraw(uint256 amount) public {
        amount = bound(amount, 0, vault.balances(address(this)));
        vault.withdraw(amount);
    }
    
    // Allow receiving ETH
    receive() external payable {}
}

// 2. The Invariant Test Suite
contract VaultInvariant is Test {
    Vault vault;
    Handler handler;

    function setUp() external {
        vault = new Vault();
        handler = new Handler(vault);

        // Tell Foundry to target the Handler contract for random calls
        targetContract(address(handler));
    }

    // The property that must hold TRUE forever
    function invariant_solvency() external view {
        // totalAssets in Vault should equal the balance of the Handler
        // (Since Handler is the only user in this isolated test environment)
        assertEq(vault.totalAssets(), vault.balances(address(handler)));
    }
    
    // Check that ETH balance matches internal accounting
    function invariant_eth_balance() external view {
        assertEq(address(vault).balance, vault.totalAssets());
    }
}

```

### Step 3: Local Config (`foundry.toml`)

Configure how hard the fuzzer tries to break your code.

```toml
[profile.default]
# ... existing config ...

[fuzz]
runs = 1000 # Number of random inputs per function

[invariant]
runs = 500 # Number of random sequences
depth = 25 # Depth of calls per sequence (deposit -> withdraw -> deposit...)
fail_on_revert = false

```

### Step 4: Update GitHub Actions (`.github/workflows/audit.yml`)

Add a new step to your existing pipeline (from the previous tutorial) to run these tests.

```yaml
      # ... (After Build Contracts step) ...

      - name: Run Fuzz & Invariant Tests
        run: forge test --fuzz-runs 5000 --invariant-runs 1000
        env:
          FOUNDRY_PROFILE: default

```

*Note: We increase the runs in CI (5000) compared to local (1000) to catch deeper bugs.*

---

## 3. Testing the Fuzzer

1. **Run Locally:**
```bash
forge test --match-contract VaultInvariant

```


*Output: `[PASS] invariant_solvency() ... runs: 500, calls: 12500*`
2. **Break It:**
Modify `src/Vault.sol` to introduce a bug:
```solidity
function deposit() external payable {
    balances[msg.sender] += msg.value;
    // totalAssets += msg.value; // <--- Comment this out (BUG!)
}

```


3. **Run Again:**
```bash
forge test --match-contract VaultInvariant

```


*Output: `[FAIL] invariant_solvency() ...*`
Foundry will output the exact sequence of calls (the "Counterexample") that caused the mismatch.

---

## 4. Common Pitfalls

1. **"Ghost" Reverts:**
* **Context:** The fuzzer calls `withdraw` when the balance is 0, causing a revert.
* **Fix:** Ensure `fail_on_revert = false` in `foundry.toml` or use `bound()` in your Handler to ensure inputs are valid (e.g., don't withdraw more than you have).


2. **Handler State Desync:**
* **Context:** The Handler tracks "ghost variables" (like `sumOfDeposits`) but the contract logic is complex.
* **Fix:** Keep Handlers simple. They should just wrap calls. Rely on querying the actual contract state for assertions.


3. **CI Timeouts:**
* **Context:** Fuzzing 10,000 runs takes too long.
* **Fix:** Tune the `--fuzz-runs` number in CI. Find the balance between coverage and speed (usually 1k-5k runs is sufficient for PRs).




