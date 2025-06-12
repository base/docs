
import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownBasename,
  WalletDropdownDisconnect,
} from '@coinbase/onchainkit/wallet';
import {
  Address,
  Avatar,
  Name,
  Identity,
  EthBalance,
} from '@coinbase/onchainkit/identity';
import { color } from '@coinbase/onchainkit/theme';
import WalletComponents from '../components/WalletComponents';
import AppWithWalletModal from '../components/AppWithWalletModal';

const meta = {
  title: 'OnchainKit/Wallet/Basename',
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
      <Wallet>
        <ConnectWallet text="Log In">
          <Avatar className="h-6 w-6" />
          <Name />
        </ConnectWallet>
        <WalletDropdown>
          <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
            <Avatar />
            <Name />
            <Address className={color.foregroundMuted} />
            <EthBalance />
          </Identity>
          <WalletDropdownBasename />
          <WalletDropdownDisconnect />
        </WalletDropdown>
      </Wallet>
    </WalletComponents>
  ),
};

export const OverrideStyles: Story = {
  name: 'OverrideStyles',
  render: () => (
    <WalletComponents>
      <Wallet>
        <ConnectWallet text="Log In">
          <Avatar className="h-6 w-6" />
          <Name />
        </ConnectWallet>
        <WalletDropdown>
          <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
            <Avatar />
            <Name />
            <Address className={color.foregroundMuted} />
            <EthBalance />
          </Identity>
          <WalletDropdownBasename className="hover:bg-red-500"/>
          <WalletDropdownDisconnect />
        </WalletDropdown>
      </Wallet>
    </WalletComponents>
  ),
};