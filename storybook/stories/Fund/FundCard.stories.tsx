// src/stories/FundCard.stories.tsx
import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import App from '../App';
import FundWrapper from '../components/FundWrapper';
import { FundCard } from '@coinbase/onchainkit/fund';
import { Wallet, ConnectWallet } from '@coinbase/onchainkit/wallet';
import { Avatar, Name } from '@coinbase/onchainkit/identity';

interface FundCardExampleProps {
  connected: boolean;
  assetSymbol: string;
  country: string;
  currency: string;
  headerText?: string;
  buttonText?: string;
}

// Declare the example component before using it in meta
const FundCardExample: React.FC<FundCardExampleProps> = ({ connected, assetSymbol, country, currency, headerText, buttonText }) => (
  <App>
    <FundWrapper>
      {({ address }) => {
        const isConnected = connected || Boolean(address);
        if (isConnected) {
          return (
            <FundCard
              assetSymbol={assetSymbol}
              country={country}
              currency={currency}
              headerText={headerText}
              buttonText={buttonText}
            />
          );
        }
        return (
          <Wallet>
            <ConnectWallet>
              <Avatar className="h-6 w-6" />
              <Name />
            </ConnectWallet>
          </Wallet>
        );
      }}
    </FundWrapper>
  </App>
);

const meta = {
  title: 'OnchainKit/Fund/Card',
  component: FundCardExample,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    connected: { control: 'boolean' },
    assetSymbol: { control: 'text' },
    country: { control: 'text' },
    currency: { control: 'text' },
    headerText: { control: 'text' },
    buttonText: { control: 'text' },
  },
} satisfies Meta<typeof FundCardExample>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: 'Default',
  args: {
    connected: true,
    assetSymbol: 'ETH',
    country: 'US',
    currency: 'USD',
    headerText: undefined,
    buttonText: undefined,
  },
};

export const WithCustomText: Story = {
  name: 'WithHeaderAndButtonText',
  args: {
    connected: true,
    assetSymbol: 'ETH',
    country: 'US',
    currency: 'USD',
    headerText: 'Purchase Ethereum',
    buttonText: 'Purchase',
  },
};