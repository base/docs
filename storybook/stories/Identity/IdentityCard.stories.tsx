import { IdentityCard } from "@coinbase/onchainkit/identity";
import { base } from "viem/chains";
import App from "../App";
import type { Meta, StoryObj } from "@storybook/react";
import { mainnet } from "wagmi/chains";

const meta = {
  title: "OnchainKit/Identity/Card",
  component: IdentityCard,
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
} satisfies Meta<typeof IdentityCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DefaultIdentity: Story = {
  name: "IdentityCard",
  args: {
    address: "0x849151d7D0bF1F34b70d5caD5149D28CC2308bf1",
    chain: base,
    schemaId:
      "0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9",
  },
};

export const badgeTooltip: Story = {
  name: "badgeTooltip",
  render: () => (
    <App>
      <IdentityCard
        schemaId="0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9"
        address="0x4bEf0221d6F7Dd0C969fe46a4e9b339a84F52FDF"
        chain={base}
        className="max-w-[300px]"
        badgeTooltip={true}
      />
    </App>
  ),
};

export const badgeTooltipCustom: Story = {
  name: "badgeTooltipCustom",
  render: () => (
    <App>
      <IdentityCard
        schemaId="0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9"
        address="0x4bEf0221d6F7Dd0C969fe46a4e9b339a84F52FDF"
        chain={base}
        className="max-w-[300px]"
        badgeTooltip="Coinbase Verified"
      />
    </App>
  ),
};

export const Customization: Story = {
  name: "Customization",
  render: () => (
    <App>
      <IdentityCard
        schemaId="0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9"
        address="0x4bEf0221d6F7Dd0C969fe46a4e9b339a84F52FDF"
        chain={mainnet}
        className="cyberpunk max-w-[300px]"
      />
    </App>
  ),
};
