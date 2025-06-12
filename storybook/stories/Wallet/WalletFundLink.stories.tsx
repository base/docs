
import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
  WalletDropdownFundLink,
} from '@coinbase/onchainkit/wallet';
import {
  Address,
  Avatar,
  Name,
  Identity,
  EthBalance,
} from '@coinbase/onchainkit/identity';
import { walletDropdownLinkCustomBaseIconSvg } from '../components/svg/walletDropdownLinkCustomBaseIconSvg';
import { color } from '@coinbase/onchainkit/theme';
import WalletComponents from '../components/WalletComponents';
import AppWithWalletModal from '../components/AppWithWalletModal';


const meta = {
  title: 'OnchainKit/Wallet/FundLink',
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
          <WalletDropdownFundLink />
          <WalletDropdownDisconnect />
        </WalletDropdown>
      </Wallet>
    </WalletComponents>
  ),
};

export const OverrideText: Story = {
  name: 'OverrideText',
  render: () => (
    <WalletComponents>
      <Wallet>
        <ConnectWallet>
          <Avatar className="h-6 w-6" />
          <Name />
        </ConnectWallet>
        <WalletDropdown>
          <WalletDropdownFundLink text="Add crypto" />
          <WalletDropdownDisconnect />
        </WalletDropdown>
      </Wallet>
    </WalletComponents>
  ),
};

export const OverrideIcon: Story = {
  name: 'OverrideIcon',
  render: () => (
    <WalletComponents>
      <Wallet>
        <ConnectWallet>
          <Avatar className="h-6 w-6" />
          <Name />
        </ConnectWallet>
        <WalletDropdown>
          <WalletDropdownFundLink icon={<walletDropdownLinkCustomBaseIconSvg />} />
          <WalletDropdownDisconnect />
        </WalletDropdown>
      </Wallet>
    </WalletComponents>
  ),
};

export const PopUpSize: Story = {
  name: 'PopUpSize',
  render: () => (
    <WalletComponents>
      <Wallet>
        <ConnectWallet>
          <Avatar className="h-6 w-6" />
          <Name />
        </ConnectWallet>
        <WalletDropdown>
          <WalletDropdownFundLink popupSize="sm" />
          <WalletDropdownDisconnect />
        </WalletDropdown>
      </Wallet>
    </WalletComponents>
  ),
};

export const OverrideDefaultBehavior: Story = {
  name: 'OverrideDefaultBehavior',
  render: () => (
    <WalletComponents>
      <Wallet>
        <ConnectWallet>
          <Avatar className="h-6 w-6" />
          <Name />
        </ConnectWallet>
        <WalletDropdown>
          <WalletDropdownFundLink openIn="tab" target="_blank" />
          <WalletDropdownDisconnect />
        </WalletDropdown>
      </Wallet>
    </WalletComponents>
  ),
};

export const OverrideFundingURL: Story = {
  name: 'OverrideFundingURL',
  render: () => (
    <WalletComponents>
      <Wallet>
        <ConnectWallet>
          <Avatar className="h-6 w-6" />
          <Name />
        </ConnectWallet>
        <WalletDropdown>
          <WalletDropdownFundLink fundingUrl={"https://base.org"} openIn="tab" target="_blank" />
          <WalletDropdownDisconnect />
        </WalletDropdown>
      </Wallet>
    </WalletComponents>
  ),
};
