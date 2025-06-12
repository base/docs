import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Transaction } from '@coinbase/onchainkit/transaction';
import App from './App';
import TransactionWrapper from './components/TransactionWrapper';
import {
  TransactionButton,
  TransactionSponsor,
  TransactionStatus,
  TransactionStatusLabel,
  TransactionStatusAction,
} from '@coinbase/onchainkit/transaction';
import { Wallet, ConnectWallet } from '@coinbase/onchainkit/wallet';
import { Avatar, Name } from '@coinbase/onchainkit/identity';
import ConnectUI from './components/ConnectUI';

const BASE_SEPOLIA_CHAIN_ID = 84532;

const meta = {
  title: 'OnchainKit/Transaction',
  component: Transaction,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Transaction>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: 'Default',
  render: () => (
    <App>
      <TransactionWrapper>
        {({ address, contracts, onStatus }) => {
          if (address) {
            return (
              <Transaction
                isSponsored={true}
                chainId={BASE_SEPOLIA_CHAIN_ID}
                calls={contracts}
                onStatus={onStatus}
              />
            )
          } else {
            return (
              <ConnectUI/>
            )
          }
        }}
      </TransactionWrapper>
    </App>
  )
};

export const Types: Story = {
  name: 'Types',
  render: () => (
    <App>
      <TransactionWrapper>
        {({ address, contracts, onStatus }) => {
          if (address) {
            return (
              <Transaction
                isSponsored={true}
                chainId={BASE_SEPOLIA_CHAIN_ID}
                contracts={contracts}
                onStatus={onStatus}
              >
                <TransactionButton />
                <TransactionSponsor />
                <TransactionStatus>
                  <TransactionStatusLabel />
                  <TransactionStatusAction />
                </TransactionStatus>
              </Transaction>
            )
          } else {
            return (
              <ConnectUI/>
            )
          }
        }}

      </TransactionWrapper>
    </App>
  ),
};
