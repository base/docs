import { Avatar, Badge, Identity, Name } from "@coinbase/onchainkit/identity";
import App from "../App";
import type { Meta, StoryObj } from "@storybook/react";

const meta = {
  title: "OnchainKit/Identity/Badge",
  component: Badge,
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
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DefaultIdentity: Story = {
  name: "Badge",
  args: {
    className: "badge",
  },
};

export const CustomColor: Story = {
  name: "CustomColor",
  args: {
    className: "bg-blue-400 border-white",
  },
};

export const Tooltip: Story = {
  name: "Tooltip",
  args: {
    tooltip: true,
    className: "badge",
  },
};

export const CustomTooltip: Story = {
  name: "CustomTooltip",
  args: {
    tooltip: "Coinbase Verified Account",
    className: "badge",
  },
};

export const BadgeOnName: Story = {
  name: "BadgeOnName",
  render: () => (
    <App>
      <Identity
        className="bg-transparent"
        address="0x838aD0EAE54F99F1926dA7C3b6bFbF617389B4D9"
        schemaId="0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9"
      >
        <Name>
          <Badge tooltip={true} />
        </Name>
      </Identity>
    </App>
  ),
};

export const BadgeOnAvatar: Story = {
  name: "BadgeOnAvatar",
  render: () => (
    <App>
      <Identity
        schemaId="0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9"
        address="0x838aD0EAE54F99F1926dA7C3b6bFbF617389B4D9"
        className="bg-transparent"
      >
        <Avatar>
          <Badge tooltip="Verified by Coinbase" />
        </Avatar>
      </Identity>
    </App>
  ),
};
