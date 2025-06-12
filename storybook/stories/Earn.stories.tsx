import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  EarnMain,
  EarnDeposit,
  RearrangedEarnDeposit,
  PredefinedInputDeposit,
} from './components/EarnComponents';

const meta = {
  title: 'OnchainKit/Earn',
  component: EarnMain,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof EarnMain>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Main: Story = {
  name: 'EarnMain',
};

export const Deposit: Story = {
  name: 'EarnDeposit',
  render: () => <EarnDeposit />,
};

export const RearrangedDeposit: Story = {
  name: 'RearrangedEarnDeposit',
  render: () => <RearrangedEarnDeposit />,
};

export const PredefinedDeposit: Story = {
  name: 'PredefinedInputDeposit',
  render: () => <PredefinedInputDeposit />,
};
