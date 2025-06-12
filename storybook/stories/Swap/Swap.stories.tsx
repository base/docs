// src/stories/Swap.stories.tsx
import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import App from '../App';
import SwapWrapper from '../components/SwapWrapper';
import {
  SwapDefault,
  Swap,
  SwapAmountInput,
  SwapToggleButton,
  SwapButton,
  SwapMessage,
  SwapToast,
} from '@coinbase/onchainkit/swap';
import ConnectUI from '../components/ConnectUI';


const meta = {
  title: 'OnchainKit/Swap/Swap',
  component: SwapDefault,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof SwapDefault>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: 'Default',
  render: () => (
    <App>
      <SwapWrapper>
        {({ address, swappableTokens }) => {
          if (address) {
            return (
              <SwapDefault
                from={swappableTokens}
                to={swappableTokens.slice().reverse()}
                disabled
              />
            );
          }
          return (
            <ConnectUI/>
          );
        }}
      </SwapWrapper>
    </App>
  ),
};

export const FullSwap: Story = {
  name: 'FullSwap',
  render: () => (
    <App>
      <SwapWrapper>
        {({ address, swappableTokens }) => {
          if (address) {
            return (
              <Swap>
                <SwapAmountInput
                  label="Sell"
                  swappableTokens={swappableTokens}
                  token={swappableTokens[1]}
                  type="from"
                />
                <SwapToggleButton />
                <SwapAmountInput
                  label="Buy"
                  swappableTokens={swappableTokens}
                  token={swappableTokens[2]}
                  type="to"
                />
                <SwapButton disabled />
                <SwapMessage />
                <SwapToast />
              </Swap>
            );
          }
          return (
            <ConnectUI/>
          );
        }}
      </SwapWrapper>
    </App>
  ),
};

export const WithoutSwappableProp: Story = {
  name: 'WithoutSwappableProp',
  render: () => (
    <App>
      <SwapWrapper>
        {({ address, swappableTokens }) => {
          if (address) {
            return (
              <Swap>
                <SwapAmountInput label="Sell" token={swappableTokens[1]} type="from" />
                <SwapToggleButton />
                <SwapAmountInput label="Buy" token={swappableTokens[2]} type="to" />
                <SwapButton disabled />
                <SwapMessage />
                <SwapToast />
              </Swap>
            );
          }
          return (
            <ConnectUI/>
          );
        }}
      </SwapWrapper>
    </App>
  ),
};

export const NoToggle: Story = {
  name: 'NoToggle',
  render: () => (
    <App>
      <SwapWrapper>
        {({ address, swappableTokens }) => {
          if (address) {
            return (
              <Swap>
                <SwapAmountInput label="Sell" token={swappableTokens[1]} type="from" />
                <SwapAmountInput label="Buy" token={swappableTokens[2]} type="to" />
                <SwapButton disabled />
                <SwapMessage />
                <SwapToast />
              </Swap>
            );
          }
          return (
            <ConnectUI/>
          );
        }}
      </SwapWrapper>
    </App>
  ),
};

export const NoMessage: Story = {
  name: 'NoMessage',
  render: () => (
    <App>
      <SwapWrapper>
        {({ address, swappableTokens }) => {
          if (address) {
            return (
              <Swap>
                <SwapAmountInput label="Sell" token={swappableTokens[1]} type="from" />
                <SwapToggleButton />
                <SwapAmountInput label="Buy" token={swappableTokens[2]} type="to" />
                <SwapButton disabled />
                <SwapToast />
              </Swap>
            );
          }
          return (
            <ConnectUI/>
          );
        }}
      </SwapWrapper>
    </App>
  ),
};

export const Styled: Story = {
  name: 'Styled',
  render: () => (
    <App>
      <SwapWrapper>
        {({ address, swappableTokens }) => {
          if (address) {
            return (
              <Swap>
                <SwapAmountInput
                  label="Sell"
                  swappableTokens={swappableTokens}
                  token={swappableTokens[1]}
                  type="from"
                />
                <SwapToggleButton className="border-[#EA580C]" />
                <SwapAmountInput
                  label="Buy"
                  swappableTokens={swappableTokens}
                  token={swappableTokens[2]}
                  type="to"
                />
                <SwapButton className="bg-[#EA580C]" disabled />
                <SwapMessage />
                <SwapToast />
              </Swap>
            );
          }
          return (
            <ConnectUI/>
          );
        }}
      </SwapWrapper>
    </App>
  ),
};
