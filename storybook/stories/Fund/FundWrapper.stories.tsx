import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import App from '../App';
import FundWrapper from '../components/FundWrapper';
import { FundButton } from '@coinbase/onchainkit/fund';
import ConnectUI from '../components/ConnectUI';

interface FundExampleProps {
  connected: boolean;
}

// Declare the example component before using in meta
const FundExample: React.FC<FundExampleProps> = ({ connected }) => (
  <App>
    <FundWrapper>
      {({ address }) => {
        const isConnected = connected || Boolean(address);
        if (isConnected) {
          return <FundButton />;
        }
        return (
          <ConnectUI/>
        );
      }}
    </FundWrapper>
  </App>
);

const meta = {
  title: 'OnchainKit/Fund',
  component: FundExample,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    connected: { control: 'boolean' },
  },
} satisfies Meta<typeof FundExample>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NotConnected: Story = {
  name: 'NotConnected',
  args: {
    connected: false,
  },
};

export const Connected: Story = {
  name: 'Connected',
  args: {
    connected: true,
    address: "0x849151d7D0bF1F34b70d5caD5149D28CC2308bf1",
  },
};
