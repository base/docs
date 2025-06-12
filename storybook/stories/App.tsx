"use client";

import { OnchainKitProvider } from "@coinbase/onchainkit";
import "@coinbase/onchainkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { http, WagmiProvider, createConfig } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { coinbaseWallet } from "wagmi/connectors";
import { defineChain } from "viem";
import ThemeProvider, { useTheme } from "./ThemeProvider";

const queryClient = new QueryClient();

export const SANDBOX_CHAIN = defineChain({
  id: 8453200058,
  name: "Sandbox Network",
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://sandbox-rpc-testnet.appchain.base.org"],
    },
  },
});

const wagmiConfig = createConfig({
  chains: [base, baseSepolia, SANDBOX_CHAIN],
  connectors: [
    coinbaseWallet({
      appName: "OnchainKit",
    }),
  ],
  ssr: true,
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
    [SANDBOX_CHAIN.id]: http(),
  },
});

export default function App({ children }: { children: ReactNode }) {
  const isServer = typeof window === "undefined";
  if (isServer) {
    return null;
  }

  return (
    <ThemeProvider>
      <Container>{children}</Container>
    </ThemeProvider>
  );
}

const Container = ({ children }: { children: ReactNode }) => {
  const { theme } = useTheme();

  const viteCdpApiKey = "15d5754b-9cab-406a-8720-42c7341f5945";
  const viteProjectId = "81eac42f-0b13-48e3-a6bb-9dd44a958a1e";
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          apiKey={viteCdpApiKey}
          chain={base}
          projectId={viteProjectId}
          schemaId="0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9"
          config={{
            appearance: {
              mode: "auto",
              theme: theme,
            },
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            {children}
          </div>
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
