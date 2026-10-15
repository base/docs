### Phase 1: The "Senior Engineer" Content

**The UX Bottleneck: Sequential Signing**
In standard dApp development, complex actions often require multiple wallet interactions. For example, a Vault Deposit usually involves:

1. **Approval Transaction:** User signs to allow the contract to spend tokens.
2. **Wait:** User waits for the block to mine.
3. **Deposit Transaction:** User signs again to actually move funds.

This "Click-Wait-Click" flow results in high user drop-off rates.

**The Solution: Atomic Batching & Reactive State**
OnchainKit leverages EIP-5792 (Wallet Call Requests) to solve this.

* **Atomic Batching:** We bundle `approve` and `deposit` into a single array. If the user's wallet (like Coinbase Smart Wallet) supports batching, they sign once. Both operations execute in the same transaction context.
* **Systemic Theming:** Instead of overriding individual CSS classes, we inject "Design Tokens" via CSS variables. This ensures your dApp maintains visual consistency (Dark/Light mode, border radius, font stacks) without fighting the library's internal styles.
* **Deterministic Updates:** We utilize the `onSuccess` callback to trigger off-chain indexing immediately upon transaction receipt, ensuring the UI and database stay in sync with the chain.

---

### Phase 2: The "Copy-Paste" Implementation

**1. The Design System (Global CSS)**
We define a custom theme by overriding specific OnchainKit CSS variables. This creates a "Design System" layer that propagates to all components.

**File:** `app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom Theme Definition 
  Naming Convention: .[name]-theme-[mode]
*/
.vault-theme-dark {
  /* Typography */
  --ock-font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
  
  /* Component Shape */
  --ock-border-radius: 16px;        /* Outer container */
  --ock-border-radius-inner: 12px;  /* Buttons/Inputs */

  /* Color Palette (Slate Blue Scheme) */
  --ock-bg-default: #0f172a;        /* Background */
  --ock-bg-secondary: #1e293b;      /* Hover states */
  --ock-bg-alternate: #334155;      /* Active states */
  
  /* Text Hierarchy */
  --ock-text-primary: #f8fafc;
  --ock-text-secondary: #94a3b8;
  
  /* Branding */
  --ock-accent: #3b82f6;            /* Primary Action Color */
}

```

**2. The Provider Configuration**
Register the custom theme in your root provider to activate it.

**File:** `app/providers.tsx`

```tsx
'use client';

import { OnchainKitProvider } from '@coinbase/onchainkit';
import { base } from 'wagmi/chains';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <OnchainKitProvider
      chain={base}
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
      config={{
        appearance: {
          mode: 'dark',           // Enforce Dark Mode
          theme: 'vault-theme',   // References .vault-theme-dark from globals.css
        },
      }}
    >
      {children}
    </OnchainKitProvider>
  );
}

```

**3. The Batched Transaction Component**
This component implements the "Approve + Deposit" pattern. It handles the full lifecycle: constructing the batch, executing it, and syncing with a backend on success.

**File:** `components/VaultDeposit.tsx`

```tsx
'use client';

import { useCallback } from 'react';
import { 
  Transaction, 
  TransactionButton, 
  TransactionStatus, 
  TransactionStatusLabel, 
  TransactionStatusAction,
  TransactionToast,
  TransactionToastIcon,
  TransactionToastLabel,
  TransactionToastAction,
} from '@coinbase/onchainkit/transaction';
import { parseUnits, encodeFunctionData, erc20Abi } from 'viem';

// --- Configuration ---
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const VAULT_ADDRESS = '0xc8c3...'; // Replace with your Vault Contract

const VAULT_ABI = [
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  }
] as const;

export default function VaultDeposit({ amount }: { amount: string }) {
  // 1. Construct the Batch
  // We define the operations required. The <Transaction> component handles 
  // the logic of bundling these for Smart Wallets or serializing them for EOAs.
  const getCalls = useCallback(() => {
    const amountBigInt = parseUnits(amount, 6); // USDC = 6 decimals

    return [
      {
        to: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'approve',
        args: [VAULT_ADDRESS, amountBigInt],
      },
      {
        to: VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: 'deposit',
        args: [amountBigInt],
      }
    ];
  }, [amount]);

  // 2. Handle Finality
  // This callback fires only when the transaction is confirmed on-chain.
  const handleSuccess = useCallback(async (response: any) => {
    // Extract the transaction hash from the receipt
    const txHash = response.transactionReceipts?.[0]?.transactionHash;
    
    if (txHash) {
      // Trigger backend re-indexing immediately
      await fetch('/api/indexer/sync-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userAddress: response.transactionReceipts[0].from,
          txHash: txHash 
        })
      });
    }
  }, []);

  return (
    <div className="w-full max-w-md">
      <Transaction
        chainId={8453} // Base Mainnet
        calls={getCalls}
        onSuccess={handleSuccess}
      >
        <TransactionButton text="Approve & Deposit USDC" />
        
        <TransactionStatus>
          <TransactionStatusLabel />
          <TransactionStatusAction />
        </TransactionStatus>

        <TransactionToast>
          <TransactionToastIcon />
          <TransactionToastLabel />
          <TransactionToastAction />
        </TransactionToast>
      </Transaction>
    </div>
  );
}

```

---
