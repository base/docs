import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import App from '../App';
import FundWrapper from '../components/FundWrapper';
import { FundButton, getOnrampBuyUrl } from '@coinbase/onchainkit/fund';
import { Wallet, ConnectWallet } from '@coinbase/onchainkit/wallet';
import { Avatar, Name } from '@coinbase/onchainkit/identity';

const meta = {
  title: 'OnchainKit/Fund/Button',
  component: FundButton,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof FundButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithFundingUrl: Story = {
  name: 'WithFundingUrl',
  render: () => (
    <App>
      <FundWrapper>
        {({ address, projectId }) => {
          if (address && projectId) {
            const onrampBuyUrl = getOnrampBuyUrl({
              projectId,
              addresses: { [address]: ['base'] },
              assets: ['USDC'],
              presetFiatAmount: 20,
              fiatCurrency: 'USD',
            });
            return <FundButton fundingUrl={onrampBuyUrl} />;
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
  ),
};

export const OpenInTab: Story = {
  name: 'OpenInTab',
  render: () => (
    <App>
      <FundWrapper>
        {({ address }) => {
          if (address) {
            return <FundButton openIn="tab" />;
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
  ),
};

export const CustomTextAndHideIcon: Story = {
  name: 'CustomTextAndHideIcon',
  render: () => (
    <App>
      <FundWrapper>
        {({ address }) => {
          if (address) {
            return <FundButton text="Onramp" hideIcon />;
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
  ),
};

export const HideText: Story = {
  name: 'HideText',
  render: () => (
    <App>
      <FundWrapper>
        {({ address }) => {
          if (address) {
            return <FundButton hideText />;
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
  ),
};
