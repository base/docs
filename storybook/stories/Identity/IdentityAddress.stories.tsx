import { Address } from "@coinbase/onchainkit/identity";
import App from "../App";
import type { Meta, StoryObj } from "@storybook/react";

const meta = {
  title: "OnchainKit/Identity/Address",
  component: Address,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <App>
        <Story />
      </App>
    ),
  ],
} satisfies Meta<typeof Address>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DefaultIdentity: Story = {
  name: "Address",
  args: {
    address: "0x849151d7D0bF1F34b70d5caD5149D28CC2308bf1",
  },
};

export const FullAddress: Story = {
  name: "FullAddress",
  args: {
    address: "0x849151d7D0bF1F34b70d5caD5149D28CC2308bf1",
    isSliced: false,
  },
};

export const OverrideStyles: Story = {
  name: "OverrideStyles",
  args: {
    address: "0x849151d7D0bF1F34b70d5caD5149D28CC2308bf1",
    className: "bg-emerald-400 px-2 py-1 rounded",
  },
};
