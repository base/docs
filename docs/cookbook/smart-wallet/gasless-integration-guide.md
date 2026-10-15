### Phase 1: The Content

**The Paradigm Shift: Account Abstraction (ERC-4337)**
To build a "consumer-grade" application, you must eliminate the two biggest friction points in Web3: **Seed Phrases** and **Gas Fees**.

1. **Smart Accounts vs. EOAs:**
* **EOA (Externally Owned Account):** A standard wallet (MetaMask) controlled by a private key. It is "dumb." It can only sign transactions. It cannot batch actions or perform logic.
* **Smart Account (Coinbase Smart Wallet):** The user's account is a Smart Contract deployed on the blockchain. Because it is code, it can be programmed. It can verify biometric signatures (Passkeys), execute multiple commands in one step (Batching), and allow third parties to pay its bills (Paymasters).


2. **The New Standard: EIP-5792**
Legacy applications use `eth_sendTransaction`. This implies the user holds ETH and signs a specific payload.
Modern applications use `wallet_sendCalls`. This requests the wallet to perform a set of actions. Crucially, it allows the application to attach **Capabilities**. The most important capability is the **Paymaster Service**, which tells the wallet: "Do not charge the user for this; send the bill to this URL instead."
3. **The Paymaster Architecture**
When a user "clicks" a button in a Smart Wallet app:
* They do not create a Transaction. They create a **UserOperation (UserOp)**.
* This UserOp is sent to a **Bundler** (a special node), not the Mempool.
* The Bundler asks the **Paymaster**: "Will you pay for this?"
* If yes, the Paymaster signs the operation.
* The Bundler submits the transaction to the blockchain, paying the ETH. The UserOp executes.



---

### Phase 2: The Implementation

**1. Configuration: Forcing the Smart Wallet Environment**
To strictly test Account Abstraction features (Passkeys and Gas Sponsorship), we configure Wagmi to prioritize the Coinbase Smart Wallet.

**File:** `config/wagmi.ts`

```typescript
import { http, createConfig } from 'wagmi';
import { base } from 'wagmi/chains';
import { coinbaseWallet } from 'wagmi/connectors';

export const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
  connectors: [
    coinbaseWallet({
      appName: 'Base Smart App',
      // 'smartWalletOnly' forces the "Create Passkey" flow. 
      // This is essential for testing AA features during development.
      preference: 'smartWalletOnly', 
    }),
  ],
});

```

**2. Implementation: The Gasless Transaction Hook**
We use `useSendCalls` (Wagmi Experimental) to leverage EIP-5792. This hook allows us to define the `paymasterService` capability.

**Prerequisite:** You must obtain a Paymaster URL from the [Coinbase Developer Platform](https://portal.cdp.coinbase.com/).

**File:** `components/GaslessAction.tsx`

```tsx
'use client';

import { useSendCalls } from 'wagmi/experimental';
import { useAccount } from 'wagmi';
import { parseAbi, encodeFunctionData } from 'viem';

// Example Contract: A simple counter or mint function
const CONTRACT_ADDRESS = '0x...'; 
const CONTRACT_ABI = parseAbi(['function performAction() external']);

export default function GaslessAction() {
  const { isConnected } = useAccount();
  const { sendCalls, status, error } = useSendCalls();

  const handleGaslessTx = () => {
    // 1. Define the capabilities object
    // This tells the Smart Wallet: "Use this Paymaster URL to sponsor gas."
    const capabilities = {
      paymasterService: {
        url: process.env.NEXT_PUBLIC_PAYMASTER_URL, // e.g., https://api.developer.coinbase.com/rpc/v1/base/...
      },
    };

    // 2. Submit the Call
    sendCalls({
      calls: [
        {
          to: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: 'performAction',
          args: [],
        },
      ],
      capabilities,
    });
  };

  if (!isConnected) return <div>Please connect wallet</div>;

  return (
    <div className="p-4 border rounded">
      <h3 className="text-lg font-bold mb-2">Sponsored Transaction</h3>
      <p className="text-sm text-gray-500 mb-4">
        This transaction will be paid for by the Paymaster, not your ETH balance.
      </p>
      
      <button 
        onClick={handleGaslessTx}
        disabled={status === 'pending'}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {status === 'pending' ? 'Processing...' : 'Execute (Free)'}
      </button>

      {error && (
        <div className="mt-2 text-red-500 text-xs">
          Error: {error.message}
        </div>
      )}
    </div>
  );
}

```

---

### Phase 3: Troubleshooting Common AA Errors

Smart Wallet transactions fail differently than standard Ethereum transactions. The error messages often relate to the Bundler or Paymaster policies.

**1. Error: "Preverification gas low" (AA21)**

* **The Symptom:** The transaction fails immediately when the user tries to sign.
* **The Cause:** The Bundler estimates gas based on a "standard" transaction size. However, Passkey signatures (WebAuthn) are significantly larger (300+ bytes) than standard private key signatures (65 bytes). The Bundler underestimates the data cost, and the network rejects the UserOp.
* **The Fix:**
1. **Update Bundler Config:** If running your own Bundler, update the configuration to support specific "UserOp Gas Limits" for Smart Accounts.
2. **Add Buffer:** In the Coinbase Developer Platform (Paymaster settings), increase the **Gas Limit Buffer**. This forces the Paymaster to allocate extra gas to cover the large signature size variance.



**2. Error: "Paymaster policy rejected"**

* **The Symptom:** The user signs, but the API returns a rejection.
* **The Cause:** The Paymaster is a gatekeeper. It checks an "Allowlist" before paying.
* **The Fix:**
1. **Allowlist the Contract:** Ensure the *exact* address of the contract you are interacting with is in the Policy Allowlist.
2. **Check Proxies:** If your contract is a Proxy, you usually need to allowlist the **Proxy Address**, not the Implementation Address.
3. **Check Daily Limits:** Paymasters often have a "Max ETH per Day" global limit. Ensure your project has not exhausted its sponsorship budget.



---
