// src/stories/SwapSettings.stories.tsx
import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  Swap,
  SwapAmountInput,
  SwapToggleButton,
  SwapButton,
  SwapMessage,
  SwapSettings,
  SwapSettingsSlippageTitle,
  SwapSettingsSlippageDescription,
  SwapSettingsSlippageInput,
} from '@coinbase/onchainkit/swap';
import ConnectUI from '../components/ConnectUI';
import App from '../App';
import SwapWrapper from '../components/SwapWrapper';
import { walletDropdownLinkCustomBaseIconSvg } from '../components/svg/walletDropdownLinkCustomBaseIconSvg';

const meta = {
  title: 'OnchainKit/Swap/Settings',
  component: SwapSettings,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SwapSettings>;

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
              <Swap>
                <SwapSettings>
                  <SwapSettingsSlippageTitle>Max. slippage</SwapSettingsSlippageTitle>
                  <SwapSettingsSlippageDescription>
                    Your swap will revert if the prices change by more than the selected percentage.
                  </SwapSettingsSlippageDescription>
                  <SwapSettingsSlippageInput />
                </SwapSettings>
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

export const StyledTitleAndDescription: Story = {
  name: 'StyledTitleAndDescription',
  render: () => (
    <App>
      <SwapWrapper>
        {({ address, swappableTokens }) => {
          if (address) {
            return (
              <Swap>
                <SwapSettings>
                  <SwapSettingsSlippageTitle className="text-[#EA580C]">
                    Max. slippage
                  </SwapSettingsSlippageTitle>
                  <SwapSettingsSlippageDescription className="text-[#EA580C]">
                    Your swap will revert if the prices change by more than the selected percentage.
                  </SwapSettingsSlippageDescription>
                  <SwapSettingsSlippageInput />
                </SwapSettings>
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

export const WithIcon: Story = {
  name: 'WithIcon',
  render: () => (
    <App>
      <SwapWrapper>
        {({ address, swappableTokens }) => {
          if (address) {
            return (
              <Swap>
                <SwapSettings icon={walletDropdownLinkCustomBaseIconSvg}>
                  <SwapSettingsSlippageTitle>Max. slippage</SwapSettingsSlippageTitle>
                  <SwapSettingsSlippageDescription>
                    Your swap will revert if the prices change by more than the selected percentage.
                  </SwapSettingsSlippageDescription>
                  <SwapSettingsSlippageInput />
                </SwapSettings>
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

export const WithTextProp: Story = {
  name: 'WithTextProp',
  render: () => (
    <App>
      <SwapWrapper>
        {({ address, swappableTokens }) => {
          if (address) {
            return (
              <Swap>
                <SwapSettings text="Settings">
                  <SwapSettingsSlippageTitle>Max. slippage</SwapSettingsSlippageTitle>
                  <SwapSettingsSlippageDescription>
                    Your swap will revert if the prices change by more than the selected percentage.
                  </SwapSettingsSlippageDescription>
                  <SwapSettingsSlippageInput />
                </SwapSettings>
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

export const CustomTitleAndDescription: Story = {
  name: 'CustomTitleAndDescription',
  render: () => (
    <App>
      <SwapWrapper>
        {({ address, swappableTokens }) => {
          if (address) {
            return (
              <Swap>
                <SwapSettings>
                  <SwapSettingsSlippageTitle>Slippage Settings</SwapSettingsSlippageTitle>
                  <SwapSettingsSlippageDescription>
                    Set a max slippage you are willing to accept.
                  </SwapSettingsSlippageDescription>
                  <SwapSettingsSlippageInput />
                </SwapSettings>
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
