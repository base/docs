import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from '@coinbase/onchainkit/wallet';
import {
  Address,
  Avatar,
  Name,
  Identity,
  EthBalance,
} from '@coinbase/onchainkit/identity';
import WalletComponents from '../components/WalletComponents';
import AppWithWalletModal from '../components/AppWithWalletModal';
import { color } from '@coinbase/onchainkit/theme';

const meta = {
  title: 'OnchainKit/Wallet/Modal',
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

export const ConnectWalletInUI: Story = {
  name: 'ConnectWalletInUI',
  render: () => (
    <AppWithWalletModal>
      <div className="my-10 flex justify-center">
        <Wallet>
          <ConnectWallet>
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
            <WalletDropdownDisconnect />
          </WalletDropdown>
        </Wallet>
      </div>
    </AppWithWalletModal>
  ),
};
