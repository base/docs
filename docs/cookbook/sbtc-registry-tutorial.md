# Module 27: sBTC Integration - Accepting Bitcoin Deposits

**Author:** @jadonamite
**Difficulty:** Expert
**Time:** 30 Minutes

**sBTC** is the 1:1 Bitcoin-backed asset on Stacks. While regular SIP-010 transfers are easy (`ft-transfer?`), receiving a **Deposit** (converting BTC L1 -> sBTC L2) directly into your smart contract requires specific handling.

You don't just "listen" for sBTC. The user sends real BTC on the Bitcoin network with a special `OP_RETURN` script. The Stacks Signers detect this, mint sBTC, and deliver it to the destination defined in that script.

This module teaches you how to construct the **Deposit Script** for your frontend and how to write a contract that reacts to the arrival of these funds.

## 1. The Architecture

1. **User Action (Bitcoin L1):** User sends BTC + `OP_RETURN` payload.
2. **Signer Action:** Validators verify the BTC tx.
3. **Protocol Action (Stacks L2):** The protocol calls `(mint ...)` on the sBTC asset contract.
4. **Your Contract:** Receives the sBTC.

## 2. The Contract Logic

Your contract doesn't need "magic" code to receive sBTC. It just needs to implement the `sip-010-trait`. When the system mints sBTC to your contract principal, it's just a balance update.

However, if you want to **react** to it (e.g., "User deposited 1 BTC, so issue them 1000 Governance Tokens"), you cannot rely on a callback from the sBTC contract (it doesn't notify receivers).

**Pattern:** The "Claim" or "Sweep" Pattern.
The user deposits to your contract address. Then, they call a `deposit` function on your contract proving they sent the funds.

**File:** `contracts/sbtc-registry.clar`

```clarity
(use-trait sip-010-trait .sip-010-trait.sip-010-trait)

(define-constant ERR-WRONG-TOKEN (err u100))
(define-constant ERR-TRANSFER-FAILED (err u101))

;; Define the official sBTC contract principal (Mainnet or Testnet)
(define-constant SBTC-TOKEN 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSWA816CA.sbtc-token)

(define-map user-deposits principal uint)

;; The user calls this AFTER the sBTC has arrived in this contract's account.
;; They are essentially saying: "I sent sBTC to this contract, please credit my internal balance."
(define-public (register-deposit (amount uint))
    (let
        (
            (sender tx-sender)
        )
        ;; 1. Transfer sBTC from User -> Contract?
        ;; NO. In the sBTC peg-in flow, the system minted sBTC directly to the recipient.
        ;; IF the user used a standard SIP-010 transfer, we do this:
        (try! (contract-call? SBTC-TOKEN transfer amount sender (as-contract tx-sender) none))

        ;; 2. Update Internal State
        (map-set user-deposits sender 
            (+ (default-to u0 (map-get? user-deposits sender)) amount)
        )
        
        (print { event: "deposit", user: sender, amount: amount })
        (ok true)
    )
)

```

**Wait, what if they Peg-In directly to the contract?**
If the user constructs a Bitcoin transaction that mints sBTC *directly* to `contracts/sbtc-registry`, your contract balance increases, but `user-deposits` map does not update automatically.

* *Solution:* You need an off-chain indexer (Hiro API) to watch for mint events to your contract and trigger a state update, OR stick to the pattern where the user Pegs-In to *their own* Stacks wallet first, then does a normal `transfer` to your contract (as shown above). The latter is safer for DeFi.

## 3. The Frontend: Generating the Deposit Script

To get sBTC, your user interacts with Bitcoin, not Stacks. You must generate the correct `OP_RETURN` payload.

**Script:** `scripts/generate-peg-in.ts` (using `@stacks/sbtc`)

```typescript
import { bytesToHex } from '@stacks/common';
import { Cl } from '@stacks/transactions';

// This is pseudo-code for the sBTC SDK structure
// Goal: Create the OP_RETURN data that tells Signers:
// "Mint sBTC to THIS Stacks Address"

function createDepositScript(stacksAddress: string) {
  // 1. The Magic Bytes (Protocol ID for sBTC)
  const protocolId = Buffer.from('T2', 'ascii'); // Example ID

  // 2. The Recipient (Your Stacks Wallet or Contract)
  // We need the hash160 of the Stacks address
  const recipientData = Cl.standardPrincipal(stacksAddress); 
  
  // In reality, you use the official SDK helper:
  // const payload = sbtcDepositHelper(stacksAddress);
  
  console.log("Send BTC to the Gatekeeper address with this OP_RETURN:");
  console.log(bytesToHex(protocolId) + "...");
}

```

## 4. Key Security Note: The "Gatekeeper"

You don't just send BTC anywhere. You send it to a specific **Gatekeeper Multisig Address** managed by the Stacks Signers. This address rotates.

* **Always** query the Stacks API (`/v2/sbtc/config` or similar) to get the current Gatekeeper address before showing a QR code to the user. Do not hardcode it.

## 5. Summary Checklist

* [ ] **Flow Choice:** Did you decide between "Peg-in to User" (Safe) vs "Peg-in to Contract" (Complex)?
* [ ] **SDK Usage:** Are you using the official sBTC library to generate the `OP_RETURN`? A single byte error means the BTC is burnt and sBTC is never minted.
* [ ] **Gatekeeper:** Are you fetching the active Signer address dynamically?

