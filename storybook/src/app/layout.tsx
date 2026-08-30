

import type { Metadata } from 'next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MiniKitProvider } from '@coinbase/onchainkit/minikit';
import { SafeArea } from '@coinbase/onchainkit/minikit';
import { minikitConfig } from '../minikit.config';  // yolunu kontrol et
import './globals.css';

const queryClient = new QueryClient();

export const metadata: Metadata = {
  title: 'Join CUBBEY',
  description: 'Hey there, Get early access and be the first to experience the future of crypto marketing strategy.',
  other: {
    'base:app_id': '698f1aaf7ca0f75750bddb827...'  // gerçek ID
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <QueryClientProvider client={queryClient}>
          <MiniKitProvider config={minikitConfig}>
            <SafeArea>
              {children}
            </SafeArea>
          </MiniKitProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}









