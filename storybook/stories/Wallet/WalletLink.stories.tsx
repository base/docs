import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
  WalletDropdownFundLink,
  WalletDropdownLink,
  WalletDropdownBasename,
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
import { walletDropdownLinkCustomBaseIconSvg } from '../components/svg/walletDropdownLinkCustomBaseIconSvg';


const meta = {
  title: 'OnchainKit/Wallet/Link',
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
          <WalletDropdownLink icon="wallet" href="https://keys.coinbase.com">
            Wallet
          </WalletDropdownLink>
          <WalletDropdownDisconnect />
        </WalletDropdown>
      </Wallet>
    </WalletComponents>
  ),
};

export const DropInWalletComponent: Story = {
  name: 'DropInWalletComponent',
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

export const DropInPremadeWalletComponent: Story = {
  name: 'DropInPremadeWalletComponent',
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
          <WalletDropdownLink
            icon="wallet"
            href="https://keys.coinbase.com"
          >
            Wallet
          </WalletDropdownLink>
          <WalletDropdownFundLink />
          <WalletDropdownDisconnect />
        </WalletDropdown>
      </Wallet>
    </WalletComponents>
  ),
};

export const CustomizeTextAndStyle: Story = {
  name: 'CustomizeTextAndStyle',
  render: () => (
    <WalletComponents>
      <Wallet>
        <ConnectWallet className='bg-blue-800' disconnectedLabel='Log In'>
          <Avatar className="h-6 w-6" />
          <Name className='text-white' />
        </ConnectWallet>
        <WalletDropdown>
          <Identity className="px-4 pt-3 pb-2 hover:bg-blue-200" hasCopyAddressOnClick>
            <Avatar />
            <Name />
            <Address className={color.foregroundMuted} />
            <EthBalance />
          </Identity>
          <WalletDropdownLink
            className='hover:bg-blue-200'
            icon="wallet"
            href="https://keys.coinbase.com"
          >
            Wallet
          </WalletDropdownLink>
          <WalletDropdownDisconnect className='hover:bg-blue-200' />
        </WalletDropdown>
      </Wallet>
    </WalletComponents>
  ),
};

export const CustomLink: Story = {
  name: 'CustomLink',
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
          <WalletDropdownLink
            icon={walletDropdownLinkCustomBaseIconSvg}
            href="https://www.base.org/"
            rel="noopener noreferrer"
          >
            Base.org
          </WalletDropdownLink>
          <WalletDropdownDisconnect />
        </WalletDropdown>
      </Wallet>
    </WalletComponents>
  ),
};

export const CustomChildren: Story = {
  name: 'CustomChildren',
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
          <WalletDropdownLink icon="wallet" href="https://keys.coinbase.com">
            <span className="font-bold italic">Profile</span>
            <span> 🔵 </span>
          </WalletDropdownLink>
          <WalletDropdownDisconnect />
        </WalletDropdown>
      </Wallet>
    </WalletComponents>
  ),
};