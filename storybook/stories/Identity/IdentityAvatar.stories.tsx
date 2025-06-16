import { Avatar, Badge, Identity } from "@coinbase/onchainkit/identity";
import App from "../App";
import type { Meta, StoryObj } from "@storybook/react";
import { base } from "viem/chains";

const meta = {
  title: "OnchainKit/Identity/Avatar",
  component: Avatar,
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
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DefaultIdentity: Story = {
  name: "Avatar",
  args: {
    address: "0x849151d7D0bF1F34b70d5caD5149D28CC2308bf1",
  },
};

export const FullAddress: Story = {
  name: "FullAddress",
  args: {
    address: "0x849151d7D0bF1F34b70d5caD5149D28CC2308bf1",
    chain: base,
  },
};

export const OverrideStyles: Story = {
  name: "OverrideStyles",
  args: {
    address: "0x849151d7D0bF1F34b70d5caD5149D28CC2308bf1",
    className: "bg-white rounded-full",
  },
};

export const DefaultLoadingComponents: Story = {
  name: "DefaultLoadingComponents",
  render: () => (
    <App>
      <Avatar
        address="0x1234567890abcdef1234567890abcdef12345678"
        loadingComponent={
          <div className="h-8 w-8">
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <polygon
                points="6,1 14,1 19,6 19,14 14,19 6,19 1,14 1,6"
                fill="yellow"
                stroke="yellow"
                stroke-width="1"
              />
            </svg>
          </div>
        }
        defaultComponent={
          <div className="h-8 w-8">
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <polygon
                points="6,1 14,1 19,6 19,14 14,19 6,19 1,14 1,6"
                fill="green"
                stroke="green"
                stroke-width="1"
              />
            </svg>
          </div>
        }
      />
    </App>
  ),
};

export const WithBadge: Story = {
  name: "WithBadge",
  render: () => (
    <App>
      <Identity
        schemaId="0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9"
        address="0x838aD0EAE54F99F1926dA7C3b6bFbF617389B4D9"
        className="bg-transparent"
      >
        <Avatar>
          <Badge />
        </Avatar>
      </Identity>
    </App>
  ),
};
