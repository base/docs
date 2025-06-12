import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletAdvancedDefault,
  WalletAdvancedAddressDetails,
  WalletAdvancedTransactionActions,
  WalletAdvancedTokenHoldings,
  WalletAdvancedWalletActions,
  WalletIsland,
} from '@coinbase/onchainkit/wallet';
import {
  Avatar,
  Name,
} from '@coinbase/onchainkit/identity';
import WalletComponents from '../components/WalletComponents';
import AppWithWalletModal from '../components/AppWithWalletModal';


const meta = {
  title: 'OnchainKit/Wallet/Island',
  component: WalletComponents,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <AppWithWalletModal>
        <Story />
      </AppWithWalletModal>
    ),
  ],
} satisfies Meta<typeof WalletComponents>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Main: Story = {
  name: 'main',
  render: () => (
    <WalletComponents>
      <WalletAdvancedDefault />
      <WalletIsland />
    </WalletComponents>
  ),
};

export const WalletAndAdvanced: Story = {
  name: 'WalletAndAdvanced',
  render: () => (
    <WalletComponents>
      <Wallet>
        <ConnectWallet disconnectedLabel="Connect Wallet">
          <Avatar className="h-6 w-6" />
          <Name />
        </ConnectWallet>
        <WalletDropdown>
          <WalletAdvancedWalletActions />
          <WalletAdvancedAddressDetails />
          <WalletAdvancedTransactionActions />
          <WalletAdvancedTokenHoldings />
        </WalletDropdown>
      </Wallet>
    </WalletComponents>
  ),
};
