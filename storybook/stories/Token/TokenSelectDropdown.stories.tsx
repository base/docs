import { TokenSelectDropdown } from "@coinbase/onchainkit/token";
import App from "../App";
import type { Meta, StoryObj } from "@storybook/react";
import TokenSelectorContainer from "../components/TokenSelectorContainer";

const tokenOptions = [
  {
    name: "Ethereum",
    address: "",
    symbol: "ETH",
    decimals: 18,
    image:
      "https://wallet-api-production.s3.amazonaws.com/uploads/tokens/eth_288.png",
    chainId: 8453,
  },
  {
    name: "USDC",
    address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
    symbol: "USDC",
    decimals: 6,
    image:
      "https://d3r81g40ycuhqg.cloudfront.net/wallet/wais/44/2b/442b80bd16af0c0d9b22e03a16753823fe826e5bfd457292b55fa0ba8c1ba213-ZWUzYjJmZGUtMDYxNy00NDcyLTg0NjQtMWI4OGEwYjBiODE2",
    chainId: 8453,
  },
  {
    name: "Dai",
    address: "0x50c5725949a6f0c72e6c4a641f24049a917db0cb",
    symbol: "DAI",
    decimals: 18,
    image:
      "https://d3r81g40ycuhqg.cloudfront.net/wallet/wais/d0/d7/d0d7784975771dbbac9a22c8c0c12928cc6f658cbcf2bbbf7c909f0fa2426dec-NmU4ZWViMDItOTQyYy00Yjk5LTkzODUtNGJlZmJiMTUxOTgy",
    chainId: 8453,
  },
];

const meta = {
  title: "OnchainKit/Token/SelectorDropdown",
  component: TokenSelectorContainer,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof TokenSelectorContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: "Default",
  render: () => (
    <App>
      <TokenSelectorContainer>
        {(token, setToken) => (
          <TokenSelectDropdown
            token={token}
            setToken={setToken}
            options={tokenOptions}
          />
        )}
      </TokenSelectorContainer>
    </App>
  ),
};
