---
title: Advanced OnchainKit Patterns
description: Learn how to batch transactions (approve + deposit), create custom design themes, and sync on-chain events with off-chain databases.
authors: [jadonamite]
tags: [onchainkit, frontend, batching, theming, react]
---


### Phase 1: The "Senior Engineer" Content

**The Problem: The "Click-Wait-Click" Fatigue**
Standard dApp interactions often require users to sign an `approve` transaction, wait for it to mine, and *then* sign a `deposit` transaction. This friction kills conversion rates.
Additionally, generic dApp UIs break immersion. A "production-grade" application shouldn't look like a generic template; it needs to fit your brand's design system seamlessly.

**The Solution: Atomic Batching & Reactive Updates**

1. **Atomic Batching (EIP-5792):** Instead of sending two serial transactions, we bundle `approve` + `deposit` into a single operation. If the user's wallet (like Coinbase Smart Wallet) supports it, they sign once, and both execute in the same block. If one fails, they both fail—no more "stuck approvals."
2. **Theme Variables:** We don't overwrite CSS classes manually with `!important`. We inject values into OnchainKit's CSS Variable engine to ripple changes across every component safely.
3. **Optimistic vs. Deterministic UI:** We use the `onSuccess` callback not just to show a toast, but to trigger off-chain indexing (e.g., updating a leaderboard database) immediately after the chain confirms the event.

---

### Phase 2: The "Copy-Paste" Implementation

**1. The Custom Theme Setup**
First, we define your brand's "Design Tokens" in global CSS. This overrides OnchainKit's defaults without breaking layout logic.

**File:** `app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Define your custom theme - must end in -light or -dark */
.my-brand-theme-dark {
  /* 1. Typography */
  --ock-font-family: "Inter", sans-serif;
  
  /* 2. Shape */
  --ock-border-radius: 12px;
  --ock-border-radius-inner: 8px;

  /* 3. Surface Colors */
  --ock-bg-default: #0f172a; /* Slate 900 */
  --ock-bg-secondary: #1e293b; /* Slate 800 */
  --ock-bg-alternate: #334155; /* Slate 700 */
  
  /* 4. Interactive Colors */
  --ock-text-primary: #f8fafc;
  --ock-text-secondary: #94a3b8;
  --ock-icon-color: #64748b;
}

```

**2. The Provider Configuration**
Register the theme in your root provider.

**File:** `app/providers.tsx`

```tsx
'use client';

import { OnchainKitProvider } from '@coinbase/onchainkit';
import { base } from 'wagmi/chains';

export function Providers({ children }) {
  return (
    <OnchainKitProvider
      chain={base}
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
      config={{
        appearance: {
          mode: 'dark',        // Force Dark Mode
          theme: 'my-brand-theme', // Matches '.my-brand-theme-dark' in CSS
        },
      }}
    >
      {children}
    </OnchainKitProvider>
  );
}

```

**3. The Batched Transaction Component**
This component handles the `approve` + `deposit` logic in one go and syncs with your database on success.

**File:** `components/VaultDeposit.tsx`

```tsx
'use client';

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
import { parseUnits } from 'viem';
import { erc20Abi } from 'viem';

// Example ABIs
const VAULT_ABI = [
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  }
] as const;

// Constants
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const VAULT_ADDRESS = '0x123...'; // Your Contract

export default function VaultDeposit({ amount }: { amount: string }) {
  const amountBigInt = parseUnits(amount, 6); // USDC has 6 decimals

  // 1. Define the Batch
  // The <Transaction> component will auto-batch these if the wallet supports it.
  const calls = [
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

  // 2. Off-chain Sync Logic
  const handleSuccess = async (response: any) => {
    console.log("Onchain Success:", response);
    
    // Trigger your backend to re-index immediately
    await fetch('/api/user/refresh-balance', {
      method: 'POST',
      body: JSON.stringify({ txHash: response.transactionReceipts[0].transactionHash })
    });
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-slate-800 rounded-xl">
      <Transaction
        chainId={8453}
        calls={calls}
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
