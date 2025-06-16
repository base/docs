import { TokenImage } from "@coinbase/onchainkit/token";
import App from "../App";
import type { Meta, StoryObj } from "@storybook/react";

const meta = {
  title: "OnchainKit/Token/Image",
  component: TokenImage,
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
} satisfies Meta<typeof TokenImage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: "Main",
  args: {
    token: {
      name: "Ethereum",
      address: "",
      symbol: "ETH",
      decimals: 18,
      image:
        "https://wallet-api-production.s3.amazonaws.com/uploads/tokens/eth_288.png",
      chainId: 8453,
    },
    size: 24,
  },
};

export const Null: Story = {
  name: "Null",
  args: {
    token: {
      name: "USDC",
      address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
      symbol: "USDC",
      decimals: 6,
      image: null,
      blockchain: "eth",
      chainId: 8453,
    },
    size: 24,
  },
};
