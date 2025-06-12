import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { SwapDefault } from '@coinbase/onchainkit/swap';
import App from '../App';
import SwapWrapper from '../components/SwapWrapper';
import ConnectUI from '../components/ConnectUI';


type SwapWalletProps = {
  connected: boolean;
  fromTokens: string[];
  toTokens: string[];
};

// Declare the component before referencing it in meta
const SwapWallet: React.FC<SwapWalletProps> = ({ connected, fromTokens, toTokens }) => (
  <App>
    <SwapWrapper>
      {({ address, swappableTokens }) => {
        if (connected || Boolean(address)) {
          const from = swappableTokens;
          const to = swappableTokens.slice().reverse();
          return <SwapDefault from={from} to={to} disabled />;
        }
        return (
          <ConnectUI/>
        );
      }}
    </SwapWrapper>
  </App>
);

const meta = {
  title: 'OnchainKit/Swap/Wallet',
  component: SwapWallet,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    connected: { control: 'boolean' },
    fromTokens: { control: 'array' },
    toTokens:   { control: 'array' },
  },
} satisfies Meta<typeof SwapWallet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NotConnected: Story = {
  name: 'NotConnected',
  args: {
    connected: false,
    fromTokens: [],
    toTokens:   [],
  },
};

export const Connected: Story = {
  name: 'Connected',
  args: {
    connected: true,
    fromTokens: ['ETH', 'DAI'],
    toTokens:   ['DAI', 'ETH'],
  },
};
