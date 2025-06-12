import type { Meta, StoryObj } from '@storybook/react';
import CafeUnitTestWithProviders from './components/CafeUnitTest/index.jsx';

const meta = {
  title: 'Components/CafeUnitTest',
  component: CafeUnitTestWithProviders,
  parameters: {
    layout: 'centered',
    // increase height to accommodate full UI
    docs: { iframeHeight: 800 },
  },
  tags: ['autodocs'],
  argTypes: {
    nftNum: { control: { type: 'number', min: 0 } },
  },
} satisfies Meta<typeof CafeUnitTestWithProviders>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Zero: Story = {
  name: 'Zero',
  args: {
    nftNum: 1,
  },
};

export const One: Story = {
  name: 'One',
  args: {
    nftNum: 1,
  },
};

export const Two: Story = {
  name: 'Two',
  args: {
    nftNum: 2,
  },
};

export const Three: Story = {
  name: 'Three',
  args: {
    nftNum: 3,
  },
};

export const Four: Story = {
  name: 'Four',
  args: {
    nftNum: 4,
  },
};

export const Five: Story = {
  name: 'Five',
  args: {
    nftNum: 5,
  },
};

export const Seven: Story = {
  name: 'Seven',
  args: {
    nftNum: 7,
  },
};

export const Eight: Story = {
  name: 'Eight',
  args: {
    nftNum: 8,
  },
};

export const Ten: Story = {
  name: 'Ten',
  args: {
    nftNum: 10,
  },
};

export const Twelve: Story = {
  name: 'Twelve',
  args: {
    nftNum: 12,
  },
};

export const Thirteen: Story = {
  name: 'Thirteen',
  args: {
    nftNum: 13,
  },
};

export const Fourteen: Story = {
  name: 'Fourteen',
  args: {
    nftNum: 14,
  },
};

export const Fifteen: Story = {
  name: 'Fifteen',
  args: {
    nftNum: 15,
  },
};
export const Nineteen: Story = {
  name: 'Nineteen',
  args: {
    nftNum: 19,
  },
};