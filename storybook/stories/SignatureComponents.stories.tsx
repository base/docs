import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  PersonalSignSignature,
  EIP712Signature,
} from './components/SignatureComponents';

const meta = {
  title: 'OnchainKit/Signature',
  component: PersonalSignSignature,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof PersonalSignSignature>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PersonalSign: Story = {
  name: 'PersonalSignSignature',
  render: () => <PersonalSignSignature />,
};

export const SecondSignature: Story = {
  name: 'EIP712Signature',
  render: () => <EIP712Signature />,
};
