
---
title: "Advanced OnchainKit Patterns"
slug: /cookbook/advanced-onchainkit
description: Learn how to batch transactions (approve + deposit), create custom design themes, and sync on-chain events with off-chain databases.
authors: [Jadonamite]
tags: [onchainkit, frontend, batching, theming, react, ux]
---

# Advanced OnchainKit Patterns

This guide covers three production-grade patterns for OnchainKit:
1.  **Atomic Transaction Batching:** Combining `approve` and `deposit` into a single user action.
2.  **Design System Integration:** Overriding CSS variables to enforce strict brand consistency.
3.  **Reactive State Synchronization:** Triggering database updates immediately upon transaction finality.

---

## 1. Custom Design Systems

OnchainKit allows you to inject "Design Tokens" via CSS variables. This is superior to overriding individual classes because it maintains consistency across Shadow DOMs and complex internal components.

### Step 1: Define the Theme
Add a scoped theme class to your global CSS. This defines your typography, border radius, and color palette.

**File:** `app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom Theme: 'midnight-blue'
  Naming convention: .[theme-name]-theme-[mode]
*/
.midnight-blue-theme-dark {
  /* Typography */
  --ock-font-family: "JetBrains Mono", "Inter", sans-serif;
  
  /* Shape & Borders */
  --ock-border-radius: 4px;         /* Brutalist/Sharp edges */
  --ock-border-radius-inner: 2px;
  
  /* Surface Colors */
  --ock-bg-default: #020617;        /* Deep Slate */
  --ock-bg-secondary: #1e293b;      /* Component Background */
  --ock-bg-alternate: #334155;      /* Hover States */
  
  /* Interactive Colors */
  --ock-text-primary: #f8fafc;
  --ock-text-secondary: #94a3b8;
  --ock-accent: #6366f1;            /* Indigo Primary */
  --ock-accent-foreground: #ffffff;
}

```

### Step 2: Register the Theme

Apply the theme name in your root provider configuration.

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
          mode: 'dark',             // Enforce Dark Mode
          theme: 'midnight-blue',   // Matches .midnight-blue-theme-dark
        },
      }}
    >
      {children}
    </OnchainKitProvider>
  );
}

```

---

## 2. Atomic Transaction Batching (EIP-5792)

Standard dApp interactions often require multiple signatures (e.g., Approve Token -> Wait -> Deposit Token). OnchainKit uses EIP-5792 to bundle these into a single "Call Batch."

If the user connects a Smart Wallet (like Coinbase Smart Wallet), they sign once, and both operations execute in the same transaction context.

### Implementation: The Vault Manager

**File:** `components/VaultManager.tsx`

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
  TransactionResponse 
} from '@coinbase/onchainkit/transaction';
import { parseUnits, erc20Abi } from 'viem';

// Configuration
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const VAULT_ADDRESS = '0x...'; // Your Vault Address

const VAULT_ABI = [
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  }
] as const;

export default function VaultManager({ amount }: { amount: string }) {
  
  // 1. Construct the Call Batch
  // We use useCallback to prevent unnecessary re-renders.
  const getCalls = useCallback(() => {
    const amountBigInt = parseUnits(amount, 6); // USDC has 6 decimals

    return [
      // Op 1: Approve
      {
        to: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'approve',
        args: [VAULT_ADDRESS, amountBigInt],
      },
      // Op 2: Deposit
      {
        to: VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: 'deposit',
        args: [amountBigInt],
      }
    ];
  }, [amount]);

  // 2. Handle Off-Chain Sync
  const handleSuccess = useCallback(async (response: TransactionResponse) => {
    const txHash = response.transactionReceipts?.[0]?.transactionHash;
    if (txHash) {
      await fetch('/api/sync-deposit', {
        method: 'POST',
        body: JSON.stringify({ txHash, amount }),
      });
    }
  }, [amount]);

  return (
    <div className="w-full max-w-md bg-slate-900 p-6 rounded-xl">
      <Transaction
        chainId={8453}
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

## 3. Reactive State Synchronization

Polling the blockchain (via `useContractRead`) can be slow. The `onSuccess` callback in the `<Transaction>` component provides the fastest way to update your UI or database.

**Best Practice:**
Do not rely on the client to update the database directly. Instead, send the `txHash` to your backend. The backend should verify the transaction on-chain before updating the database.

```typescript
// Example: Client-side callback
const handleSuccess = (response) => {
  // Optimistically update UI
  toast.success("Deposit detected! Indexing...");
  
  // Trigger Backend Indexer
  triggerRevalidation(response.transactionReceipts[0].transactionHash);
};

```

```
