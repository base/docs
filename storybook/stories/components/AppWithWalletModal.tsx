'use client';

import { OnchainKitProvider } from '@coinbase/onchainkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { http, WagmiProvider, createConfig } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { coinbaseWallet } from 'wagmi/connectors';
import '@coinbase/onchainkit/styles.css';

export const queryClient = new QueryClient();

const wagmiConfig = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    coinbaseWallet({
      appName: 'OnchainKit',
      preference: 'all',
    }),
  ],
  ssr: true,
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
});

export default function AppWithWalletModal({
  children,
}: {
  children: ReactNode;
}) {
  const isServer = typeof window === 'undefined';
  if (isServer) {
    return null;
  }
  const viteCdpApiKey = "15d5754b-9cab-406a-8720-42c7341f5945";
  const viteProjectId = "81eac42f-0b13-48e3-a6bb-9dd44a958a1e";

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          apiKey={viteCdpApiKey}
          chain={base} // TODO: remove
          projectId={viteProjectId}
          schemaId="0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9"
          config={{
            appearance: {
              mode: 'auto',
            },
            wallet: {
              display: 'modal', // 'modal' | 'classic'
              termsUrl: 'https://www.coinbase.com/legal/privacy',
              privacyUrl: 'https://www.coinbase.com/legal/cookie',
            },
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {children}
          </div>
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
