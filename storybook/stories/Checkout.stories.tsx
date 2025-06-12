import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Checkout, CheckoutButton } from '@coinbase/onchainkit/checkout';
import App from './App';

interface CheckoutStoryProps {
  disabled: boolean;
  coinbaseBranded: boolean;
  text: string;
  className: string;
}

// Declare the example component before using it in meta
const CheckoutExample: React.FC<CheckoutStoryProps> = ({ disabled, coinbaseBranded, text, className }) => (
  <App>
    <Checkout>
      <CheckoutButton
        disabled={disabled}
        coinbaseBranded={coinbaseBranded}
        text={text}
        className={className}
      />
    </Checkout>
  </App>
);

const meta = {
  title: 'OnchainKit/Checkout',
  component: CheckoutExample,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
    coinbaseBranded: { control: 'boolean' },
    text: { control: 'text' },
    className: { control: 'text' },
  },
} satisfies Meta<typeof CheckoutExample>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Disabled: Story = {
  name: 'Disabled',
  args: {
    disabled: true,
    coinbaseBranded: false,
    text: 'Pay',
    className: '',
  },
};

export const Branded: Story = {
  name: 'CoinbaseBranded',
  args: {
    disabled: true,
    coinbaseBranded: true,
    text: 'Pay',
    className: '',
  },
};

export const WithCustomText: Story = {
  name: 'WithCustomText',
  args: {
    disabled: true,
    coinbaseBranded: false,
    text: 'Checkout with USDC',
    className: '',
  },
};

export const WithCustomClass: Story = {
  name: 'WithCustomClass',
  args: {
    disabled: true,
    coinbaseBranded: false,
    text: 'Pay',
    className: 'bg-[#EA580C]',
  },
};
