import {
  Address,
  Avatar,
  Badge,
  Identity,
  Name,
  Socials,
} from "@coinbase/onchainkit/identity";
import App from "../App";
import type { Meta, StoryObj } from "@storybook/react";
import { base, mainnet } from "viem/chains";

const meta = {
  title: "OnchainKit/Identity/Socials",
  component: Socials,
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
} satisfies Meta<typeof Socials>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DefaultIdentity: Story = {
  name: "Main",
  render: () => (
    <App>
      <Identity
        address="0x4bEf0221d6F7Dd0C969fe46a4e9b339a84F52FDF"
        schemaId="0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9"
        chain={base}
      >
        <Avatar />
        <Name>
          <Badge />
        </Name>
        <Address />
        <Socials />
      </Identity>
    </App>
  ),
};

export const Standalone: Story = {
  name: "Standalone",
  args: {
    address: "0x4bEf0221d6F7Dd0C969fe46a4e9b339a84F52FDF",
    chain: base,
  },
};

export const CustomChain: Story = {
  name: "CustomChain",
  render: () => (
    <App>
      <Identity
        address="0x4bEf0221d6F7Dd0C969fe46a4e9b339a84F52FDF"
        schemaId="0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9"
        chain={mainnet}
      >
        <Avatar />
        <Name>
          <Badge />
        </Name>
        <Address />
        <Socials />
      </Identity>
    </App>
  ),
};
