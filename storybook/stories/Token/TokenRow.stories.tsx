import { TokenRow } from "@coinbase/onchainkit/token";
import App from "../App";
import type { Meta, StoryObj } from "@storybook/react";

const meta = {
  title: "OnchainKit/Token/Row",
  component: TokenRow,
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
} satisfies Meta<typeof TokenRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: "Main",
  args: {
    token: {
      address: "0x1234",
      chainId: 1,
      decimals: 18,
      image:
        "https://dynamic-assets.coinbase.com/dbb4b4983bde81309ddab83eb598358eb44375b930b94687ebe38bc22e52c3b2125258ffb8477a5ef22e33d6bd72e32a506c391caa13af64c00e46613c3e5806/asset_icons/4113b082d21cc5fab17fc8f2d19fb996165bcce635e6900f7fc2d57c4ef33ae9.png",
      name: "Ethereum",
      symbol: "ETH",
    },
  },
};

export const Null: Story = {
  name: "Null",
  args: {
    token: {
      address: "0x1234",
      chainId: 1,
      decimals: 18,
      image: null,
      name: "Ethereum",
      symbol: "ETH",
    },
    amount: "1000.00234",
  },
};

export const Amount: Story = {
  name: "Amount",
  args: {
    token: {
      address: "0x1234",
      chainId: 1,
      decimals: 18,
      image:
        "https://dynamic-assets.coinbase.com/dbb4b4983bde81309ddab83eb598358eb44375b930b94687ebe38bc22e52c3b2125258ffb8477a5ef22e33d6bd72e32a506c391caa13af64c00e46613c3e5806/asset_icons/4113b082d21cc5fab17fc8f2d19fb996165bcce635e6900f7fc2d57c4ef33ae9.png",
      name: "Ethereum",
      symbol: "ETH",
    },
    amount: "1000",
  },
};

export const HideSymbol: Story = {
  name: "HideSymbol",
  args: {
    token: {
      address: "0x1234",
      chainId: 1,
      decimals: 18,
      image:
        "https://dynamic-assets.coinbase.com/dbb4b4983bde81309ddab83eb598358eb44375b930b94687ebe38bc22e52c3b2125258ffb8477a5ef22e33d6bd72e32a506c391caa13af64c00e46613c3e5806/asset_icons/4113b082d21cc5fab17fc8f2d19fb996165bcce635e6900f7fc2d57c4ef33ae9.png",
      name: "Ethereum",
      symbol: "ETH",
    },
    hideSymbol: true,
  },
};

export const HideImage: Story = {
  name: "HideImage",
  args: {
    token: {
      address: "0x1234",
      chainId: 1,
      decimals: 18,
      image:
        "https://dynamic-assets.coinbase.com/dbb4b4983bde81309ddab83eb598358eb44375b930b94687ebe38bc22e52c3b2125258ffb8477a5ef22e33d6bd72e32a506c391caa13af64c00e46613c3e5806/asset_icons/4113b082d21cc5fab17fc8f2d19fb996165bcce635e6900f7fc2d57c4ef33ae9.png",
      name: "Ethereum",
      symbol: "ETH",
    },
    hideImage: true,
  },
};

export const HideBoth: Story = {
  name: "HideBoth",
  args: {
    token: {
      address: "0x1234",
      chainId: 1,
      decimals: 18,
      image:
        "https://dynamic-assets.coinbase.com/dbb4b4983bde81309ddab83eb598358eb44375b930b94687ebe38bc22e52c3b2125258ffb8477a5ef22e33d6bd72e32a506c391caa13af64c00e46613c3e5806/asset_icons/4113b082d21cc5fab17fc8f2d19fb996165bcce635e6900f7fc2d57c4ef33ae9.png",
      name: "Ethereum",
      symbol: "ETH",
    },
    hideSymbol: true,
    hideImage: true,
  },
};
