---
title: "Identity-First UX with Basenames"
slug: /cookbook/identity/basenames
description: Learn how to resolve Basenames (.base.eth) and display user avatars on L2 using a custom React hook and the L2 Resolver.
author: [Jadonamite]
tags: [identity, basenames, ens, viem, frontend]
---

### Phase 1: The Content

**The Problem: The "0x" UX Barrier**
In a social or consumer app, displaying `0x71C...3A9` is a failure of design. Users recognize names and faces, not hexadecimal strings.
While Ethereum Mainnet has ENS (`.eth`), Base has **Basenames** (`.base.eth`).

**The Technical Challenge: L2 Resolution**
Standard libraries often default ENS lookups to Ethereum Mainnet (L1). If you try to resolve a Basename using a standard Mainnet provider, it will fail or return null because the records live on Base (L2).

**The Solution: The L2 Resolver Pattern**
To build an "Identity-First" dApp, we must:

1. **Force L2 Resolution:** Point our lookup logic specifically to the **Base L2 Resolver Contract**.
2. **Handle Metadata:** A name is not enough. We need the `avatar` text record to display the user's profile picture.
3. **Sanitize Inputs:** We must use name normalization (EIP-137) to prevent spoofing attacks where visually similar characters (homoglyphs) map to different addresses.

---

### Phase 2: The Implementation

**1. Install Dependencies**
We need `viem` for contract interaction and string normalization.

```bash
npm install viem

```

**2. The Custom Hook (`useBasename`)**
This hook performs "Reverse Resolution" (Address -> Name) and fetches the Avatar text record in parallel.

**File:** `hooks/useBasename.ts`

```typescript
import { useState, useEffect } from 'react';
import { createPublicClient, http, parseAbiItem, namehash } from 'viem';
import { base } from 'viem/chains';
import { normalize } from 'viem/ens';

// 1. Setup the Client specifically for Base Mainnet
const publicClient = createPublicClient({
  chain: base,
  transport: http()
});

// 2. Base L2 Resolver Address (Universal for .base.eth)
const L2_RESOLVER_ADDRESS = '0xC6d566A56A1aFf6508b41f6c90ff131615583BCD';

export function useBasename(address: string | undefined) {
  const [basename, setBasename] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address || !address.startsWith('0x')) return;

    const fetchIdentity = async () => {
      setLoading(true);
      try {
        // Step A: Reverse Resolve (Address -> Name)
        // We use the standard ENS Reverse Registrar logic but on L2
        const name = await publicClient.getEnsName({
          address: address as `0x${string}`,
          // In simpler setups, publicClient.getEnsName handles the resolver lookup automatically.
          // However, for explicit control or text records, we often query manually.
        });

        if (name) {
          setBasename(name);

          // Step B: Fetch Metadata (Avatar)
          // We must query the resolver for the 'avatar' text record
          const avatarRecord = await publicClient.getEnsText({
            name: normalize(name),
            key: 'avatar',
          });

          setAvatar(avatarRecord);
        }
      } catch (error) {
        console.error("Failed to resolve Basename:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchIdentity();
  }, [address]);

  return { basename, avatar, loading };
}

```

**3. The Display Component (`IdentityBadge`)**
This component elegantly falls back to a truncated address if no Basename is found.

**File:** `components/IdentityBadge.tsx`

```tsx
'use client';

import { useBasename } from '../hooks/useBasename';

export default function IdentityBadge({ address }: { address: string }) {
  const { basename, avatar, loading } = useBasename(address);

  // Helper to truncate 0x1234...5678
  const truncated = `${address.slice(0, 6)}...${address.slice(-4)}`;

  if (loading) return <div className="animate-pulse h-10 w-32 bg-slate-800 rounded-full" />;

  return (
    <div className="flex items-center space-x-3 bg-slate-900 px-4 py-2 rounded-full border border-slate-700">
      {/* Avatar Circle */}
      <div className="relative h-8 w-8 rounded-full overflow-hidden bg-indigo-600">
        {avatar ? (
          <img 
            src={avatar} 
            alt={basename || address} 
            className="h-full w-full object-cover"
          />
        ) : (
          // Gradient Fallback for users without avatars
          <div className="h-full w-full bg-gradient-to-br from-blue-400 to-purple-500" />
        )}
      </div>

      {/* Name / Address Display */}
      <div className="flex flex-col">
        <span className="font-bold text-white text-sm">
          {basename || truncated}
        </span>
        {basename && (
          <span className="text-xs text-slate-400 font-mono">
            {truncated}
          </span>
        )}
      </div>
    </div>
  );
}

```

---

