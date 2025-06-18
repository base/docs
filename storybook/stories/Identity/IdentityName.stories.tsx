import { Identity, Name, Badge } from "@coinbase/onchainkit/identity";
import App from "../App";
import type { Meta, StoryObj } from "@storybook/react";
import { base } from "viem/chains";

const meta = {
  title: "OnchainKit/Identity/Name",
  component: Name,
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
} satisfies Meta<typeof Name>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DefaultIdentity: Story = {
  name: "Main",
  args: {
    address: "0x02feeb0AdE57b6adEEdE5A4EEea6Cf8c21BeB6B1",
  },
};

export const WithBasename: Story = {
  name: "WithBasename",
  args: {
    address: "0x02feeb0AdE57b6adEEdE5A4EEea6Cf8c21BeB6B1",
    chain: base,
  },
};

export const OverrideStyles: Story = {
  name: "OverrideStyles",
  args: {
    address: "0x02feeb0AdE57b6adEEdE5A4EEea6Cf8c21BeB6B1",
    className: "bg-emerald-400 px-2 py-1 rounded",
  },
};

export const AddBadge: Story = {
  name: "AddBadge",
  render: () => (
    <App>
      <Identity
        schemaId="0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9"
        address="0x838aD0EAE54F99F1926dA7C3b6bFbF617389B4D9"
        className="bg-transparent"
      >
        <Name>
          <Badge />
        </Name>
      </Identity>
    </App>
  ),
};
