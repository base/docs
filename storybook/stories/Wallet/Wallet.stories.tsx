import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownBasename,
  WalletDropdownFundLink,
  WalletDropdownLink,
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
  title: 'OnchainKit/Wallet/WalletComponents',
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


export const Base: Story = {
  name: 'Base',
  render: () => (
    <WalletComponents>
      <Wallet />
    </WalletComponents>
  ),
};

export const onboard: Story = {
  name: 'onboard',
  render: () => (
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
  ),
};

export const WithIdentityAndDisconnect: Story = {
  name: 'WithIdentityAndDisconnect',
  render: () => (
    <WalletComponents>
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
          </Identity>
          <WalletDropdownDisconnect />
        </WalletDropdown>
      </Wallet>
    </WalletComponents>
  ),
};

export const FullDropdown: Story = {
  name: 'FullDropdown',
  render: () => (
    <WalletComponents>
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
          <WalletDropdownBasename />
          <WalletDropdownLink icon="wallet" href="https://keys.coinbase.com">
            Wallet
          </WalletDropdownLink>
          <WalletDropdownFundLink />
          <WalletDropdownDisconnect />
        </WalletDropdown>
      </Wallet>
    </WalletComponents>
  ),
};

export const CustomStyling: Story = {
  name: 'CustomStyling',
  render: () => (
    <WalletComponents>
      <Wallet>
        <ConnectWallet className="bg-blue-800" disconnectedLabel="Log In">
          <Avatar className="h-6 w-6" />
          <Name className="text-white" />
        </ConnectWallet>
        <WalletDropdown>
          <Identity className="px-4 pt-3 pb-2 hover:bg-blue-200" hasCopyAddressOnClick>
            <Avatar />
            <Name />
            <Address className={color.foregroundMuted} />
            <EthBalance />
          </Identity>
          <WalletDropdownLink
            className="hover:bg-blue-200"
            icon="wallet"
            href="https://keys.coinbase.com"
          >
            Wallet
          </WalletDropdownLink>
          <WalletDropdownDisconnect className="hover:bg-blue-200" />
        </WalletDropdown>
      </Wallet>
    </WalletComponents>
  ),
};
