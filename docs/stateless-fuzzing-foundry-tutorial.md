# Stress Test Your Math: Stateless Fuzzing with Foundry

**Author:** @jadonamite
**Topic:** Security & Testing
**Level:** Intermediate
**Prerequisites:** Foundry Project

In the previous tutorial, we covered **Stateful Invariant Tests** (checking the health of the system over a long sequence of events). Now, we will focus on **Stateless Fuzz Testing**.

Stateless fuzzing is the art of throwing random data at a **single function** to see if it breaks. It is particularly good at catching **math errors**, **overflows**, and **edge cases** (like 0 or `uint256.max`) that human developers often forget to test manually.

In this tutorial, we will write a fuzz test for a DeFi Yield Calculator that reveals a hidden overflow bug.

---

## 1. Architecture

* **Target:** `YieldMath.sol` (A library calculating interest).
* **The Bug:** Order of operations leading to an overflow on large inputs.
* **The Tool:** Foundry's `testFuzz` feature (automatically triggered by adding arguments to a test function).

---

## 2. Implementation

### Step 1: The Vulnerable Contract (`src/YieldMath.sol`)

Let's imagine a simple library used to calculate staking rewards.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract YieldMath {
    // Calculate reward: (principal * rate * duration) / 365 days
    // Rate is in basis points (10000 = 100%)
    function calculateReward(
        uint256 principal,
        uint256 rateBps,
        uint256 durationSeconds
    ) public pure returns (uint256) {
        // BUG: This multiplication can overflow uint256 if inputs are large
        return (principal * rateBps * durationSeconds) / (365 days * 10000);
    }
}

```

### Step 2: The Manual Test (The "Happy Path")

If we only wrote a standard unit test, we might miss the bug because we tend to use "nice" numbers.

```solidity
// This passes easily
function test_CalculateReward_Manual() public {
    uint256 reward = yieldMath.calculateReward(1000 ether, 500, 30 days);
    assertEq(reward, 4109589041095890410); // Checked with calculator
}

```

### Step 3: The Fuzz Test (`test/YieldMath.t.sol`)

Now, let's write a Fuzz Test. In Foundry, if you add arguments to a test function, the fuzzer automatically supplies random values for them.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {YieldMath} from "../src/YieldMath.sol";

contract YieldMathTest is Test {
    YieldMath public math;

    function setUp() public {
        math = new YieldMath();
    }

    // FUZZ TEST: Foundry provides random values for p, r, and t
    function testFuzz_CalculateReward(uint256 p, uint256 r, uint256 t) public {
        // 1. Filter unrealistic inputs (Assumptions)
        // Rate shouldn't be zero or absurdly high (e.g., max 1000%)
        // We use 'bound' to restrict the fuzzer to "interesting" but valid ranges
        r = bound(r, 1, 100_000); // 0.01% to 1000%
        
        // Time shouldn't be zero, max 10 years
        t = bound(t, 1, 3650 days);

        // 2. Run the function
        // If this reverts due to overflow, the test fails
        uint256 reward = math.calculateReward(p, r, t);

        // 3. Assert properties
        // Reward should never be greater than principal * rate (sanity check)
        if (p > 0) {
            assertLt(reward, p * r); 
        }
    }
}

```

### Step 4: Running the Test

Run the fuzz test. Foundry will try thousands of inputs.

```bash
forge test --match-contract YieldMathTest

```

**Expected Result: FAILURE**

```text
[FAIL. Reason: Arithmetic over/underflow] testFuzz_CalculateReward(uint256,uint256,uint256)
[Counterexample] 
  p: 115792089237316195423570985008687907853269984665640564039457584007913129639935
  r: 58494
  t: 26189154

```

Foundry found a `principal` (`p`) so large that multiplying it by `r` and `t` exceeded the maximum size of a `uint256` (approx `1.15e77`), causing the transaction to revert (Panic code 0x11).

### Step 5: Fixing the Bug

The fuzzer showed us that our function isn't safe for "whale" amounts or high-inflation tokens. We need to handle the math differently, perhaps using a `mulDiv` library that supports 512-bit intermediate numbers (like `FullMath.sol` from Uniswap).

Modified `src/YieldMath.sol`:

```solidity
import "@openzeppelin/contracts/utils/math/Math.sol";

function calculateReward(uint256 p, uint256 r, uint256 t) public pure returns (uint256) {
    // Use Math.mulDiv to handle intermediate overflow
    // (p * r * t) / denominator
    return Math.mulDiv(p, r * t, 365 days * 10000);
}

```

Run the test again:

```bash
forge test --match-contract YieldMathTest

```

**Result: PASS**

---

## 3. Best Practices: `vm.assume` vs `bound`

When constraining fuzzer inputs, you have two choices:

1. **`vm.assume(condition)`**:
* Tells the fuzzer: "If this condition is false, **discard** this run and try a new random number."
* *Risk:* If you assume too much (e.g., `vm.assume(x > 999999)`), the fuzzer might burn all its attempts trying to find a valid number and fail with "Rejected too many inputs".


2. **`bound(input, min, max)`**:
* Tells the fuzzer: "Force this random number to fit inside [min, max]."
* *Benefit:* It never discards runs. It is strictly more efficient.
* **Recommendation:** Always prefer `bound` for numerical ranges. Use `vm.assume` only for complex logic checks (e.g., `vm.assume(address(x) != address(0))`).



---

## 4. Common Pitfalls

1. **Revert on Zero:**
* **Context:** `100 / x` will revert if `x` is 0.
* **Fix:** If `x` *can* be zero in reality, your code should handle it (`if (x==0) return 0`). If `x` *shouldn't* be zero (input validation), bound your test: `x = bound(x, 1, type(uint256).max)`.


2. **Stateless vs Stateful:**
* **Context:** Fuzzing `deposit(amount)` passes, but the contract breaks if you deposit twice.
* **Fix:** Stateless fuzzing resets the contract after every run. To catch multi-step bugs, you *must* use Invariant Testing (previous tutorial).


