
---
title: "Building Transactional Farcaster Frames"
slug: /cookbook/farcaster/transactional-frames
description: A comprehensive guide to building interactive Frames that execute on-chain transactions (Minting NFTs) directly from the Farcaster feed.
authors: [your-github-username]
tags: [farcaster, frames, onchainkit, nextjs, nft, minting]
---

# Building Transactional Farcaster Frames

Farcaster Frames transform social media posts into interactive mini-apps. While basic Frames just change images when clicked, **Transactional Frames** allow users to interact with smart contracts (Mint, Swap, Vote) without ever leaving their feed.

This guide builds a **"Mint-in-Feed" Frame**. Users will see an NFT preview, click "Mint", sign the transaction in their wallet, and see a success message—all within the Farcaster client.



## The Architecture: Buttons vs. Redirects

Before coding, it is critical to understand how Frame interactions differ from standard web links.

| Feature | Standard Link (`<a href>`) | Frame Button (`fc:frame:button`) |
| :--- | :--- | :--- |
| **Behavior** | Opens a new browser tab. | Sends a POST request to your server. |
| **Context** | Server sees a generic IP address. | Server receives a **cryptographically signed payload** containing the user's FID (Farcaster ID) and wallet address. |
| **Outcome** | User leaves the app. | User stays in the app; the Frame updates or triggers a wallet transaction. |

---

## Phase 1: The Frame Metadata (The View)

The entry point is a standard Next.js Page. We export metadata that defines the initial image and the buttons. We use the **Open Graph (OG)** standard extended with `fc:frame` tags.

**File:** `app/frames/mint/page.tsx`

```tsx
import { getFrameMetadata } from '@coinbase/onchainkit/frame';
import type { Metadata } from 'next';

// 1. Define the Frame Logic
const frameMetadata = getFrameMetadata({
  buttons: [
    {
      action: 'tx', // <--- CRITICAL: Tells the client this triggers a wallet transaction
      label: 'Mint NFT (0.001 ETH)',
      target: `${process.env.NEXT_PUBLIC_URL}/api/frame/tx-data`, // Endpoint to fetch Calldata
      postUrl: `${process.env.NEXT_PUBLIC_URL}/api/frame/tx-success`, // Callback after success
    },
  ],
  image: {
    src: `${process.env.NEXT_PUBLIC_URL}/nft-preview.png`,
    aspectRatio: '1:1',
  },
  input: {
    text: 'Quantity (Optional)',
  },
});

// 2. Export Next.js Metadata
export const metadata: Metadata = {
  title: 'Mint NFT Frame',
  description: 'Mint directly from Farcaster',
  openGraph: {
    title: 'Mint NFT Frame',
    description: 'Mint directly from Farcaster',
    images: [`${process.env.NEXT_PUBLIC_URL}/nft-preview.png`],
  },
  other: {
    ...frameMetadata,
  },
};

export default function Page() {
  return (
    <div>
      <h1>Mint NFT Frame</h1>
      <p>Share this link on Warpcast to see the Frame!</p>
    </div>
  );
}

```

---

## Phase 2: The Transaction Server (The Logic)

When the user clicks the "Mint" button, the Farcaster client sends a POST request to the `target` URL defined above. Your server must return the raw transaction data (calldata).

**Key Security Step:** We use `getFrameMessage` to validate the packet. This ensures the request actually came from Farcaster and was signed by the user's custody address.

**File:** `app/api/frame/tx-data/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { encodeFunctionData, parseEther, parseAbi } from 'viem';
import { getFrameMessage } from '@coinbase/onchainkit/frame';

const MINT_ABI = parseAbi([
  'function mint(address to, uint256 quantity) external payable'
]);

const CONTRACT_ADDRESS = '0xYourNftContractAddress';
const MINT_PRICE = parseEther('0.001');

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json();

  // 1. Validate the Message
  // This verifies the signature against the Farcaster Hubs.
  const { isValid, message } = await getFrameMessage(body, { 
    neynarApiKey: process.env.NEYNAR_API_KEY // Optional but recommended for reliable validation
  });

  if (!isValid) {
    return new NextResponse('Message not valid', { status: 400 });
  }

  // 2. Parse User Input (if any)
  // We can access text input from the frame here
  const quantity = body.untrustedData.inputText ? parseInt(body.untrustedData.inputText) : 1;
  const userAddress = message.interactor.verified_accounts[0]; // Get user's connected wallet

  if (!userAddress) {
    return new NextResponse('User has no verified wallet', { status: 400 });
  }

  // 3. Construct Calldata
  // We use Viem to encode the specific function call for the smart contract.
  const data = encodeFunctionData({
    abi: MINT_ABI,
    functionName: 'mint',
    args: [userAddress, BigInt(quantity)],
  });

  // 4. Return Transaction Object (JSON)
  // The Farcaster client reads this and opens the user's wallet.
  return NextResponse.json({
    chainId: 'eip155:8453', // Base Mainnet
    method: 'eth_sendTransaction',
    params: {
      abi: MINT_ABI,
      to: CONTRACT_ADDRESS,
      data: data,
      value: (MINT_PRICE * BigInt(quantity)).toString(),
    },
  });
}

```

---

## Phase 3: The Success State (Closing the Loop)

After the user signs the transaction in their wallet, the Farcaster client (Warpcast) sends *another* POST request to the `postUrl` defined in the metadata. This allows you to update the Frame UI to say "Success!".

**File:** `app/api/frame/tx-success/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getFrameHtmlResponse } from '@coinbase/onchainkit/frame';

export async function POST(req: NextRequest): Promise<NextResponse> {
  return new NextResponse(
    getFrameHtmlResponse({
      buttons: [
        {
          action: 'link', // Switch to link action to let them view on explorer
          label: 'View on BaseScan',
          target: '[https://basescan.org](https://basescan.org)', // You can append tx hash if available in client state
        },
      ],
      image: {
        src: `${process.env.NEXT_PUBLIC_URL}/mint-success.png`,
        aspectRatio: '1:1',
      },
    })
  );
}

```

---

## Troubleshooting & Best Practices

1. **CORS & Localhost:** Frames require HTTPS. When developing locally, use a tunneling service like **ngrok** to expose your `localhost:3000` to the internet.
2. **Transaction Simulation:** Warpcast simulates transactions before showing the wallet. If your contract reverts (e.g., "Insufficient Funds" or "Mint Sold Out"), the user will see a generic error. Ensure your contract handles errors gracefully.
3. **Caching:** Farcaster clients cache images aggressively. If you update your image but the Frame doesn't change, append a timestamp query param: `src: url + '?ts=' + Date.now()`.

## Checklist for Production

* [ ] **Validation:** Did you configure `getFrameMessage` with a Hub provider (Neynar/Pinata) to ensure signatures are valid?
* [ ] **Chain ID:** Ensure `chainId` matches the network your contract is deployed on (`eip155:8453` for Base).
* [ ] **Gas Estimation:** Do not hardcode gas limits. Let the user's wallet estimate it.

```
