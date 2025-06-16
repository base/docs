import {
  Address,
  Avatar,
  Identity,
  Name,
  Badge,
} from "@coinbase/onchainkit/identity";
import App from "../App";
import type { Meta, StoryObj } from "@storybook/react";
import { base } from "viem/chains";

const meta = {
  title: "OnchainKit/Identity/Identity",
  component: Identity,
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
} satisfies Meta<typeof Identity>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DefaultIdentity: Story = {
  name: "Main",
  render: () => (
    <App>
      <Identity
        address="0x838aD0EAE54F99F1926dA7C3b6bFbF617389B4D9"
        schemaId="0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9"
      >
        <Avatar />
        <Name>
          <Badge />
        </Name>
        <Address />
      </Identity>
    </App>
  ),
};

export const BadgeTooltip: Story = {
  name: "BadgeTooltip",
  render: () => (
    <App>
      <Identity
        address="0x838aD0EAE54F99F1926dA7C3b6bFbF617389B4D9"
        schemaId="0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9"
      >
        <Avatar />
        <Name>
          <Badge tooltip={true} />
        </Name>
        <Address />
      </Identity>
    </App>
  ),
};

export const BadgeCustomTooltip: Story = {
  name: "BadgeCustomTooltip",
  render: () => (
    <App>
      <Identity
        address="0x838aD0EAE54F99F1926dA7C3b6bFbF617389B4D9"
        schemaId="0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9"
      >
        <Avatar />
        <Name>
          <Badge tooltip="Coinbase Verified Account" />
        </Name>
        <Address />
      </Identity>
    </App>
  ),
};

export const ClassNameProp: Story = {
  name: "ClassNameProp",
  render: () => (
    <App>
      <Identity
        address="0x838aD0EAE54F99F1926dA7C3b6bFbF617389B4D9"
        schemaId="0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9"
      >
        <Avatar>
          <Badge className="bg-error" />
        </Avatar>
        <Name className="text-orange-600" />
        <Address className="text-zinc-500 font-bold" />
      </Identity>
    </App>
  ),
};

export const ChooseComponents: Story = {
  name: "ChooseComponents",
  render: () => (
    <App>
      <Identity
        address="0x838aD0EAE54F99F1926dA7C3b6bFbF617389B4D9"
        schemaId="0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9"
      >
        <Avatar />
        <Name>
          <Badge />
        </Name>
      </Identity>
      <Identity
        address="0x838aD0EAE54F99F1926dA7C3b6bFbF617389B4D9"
        schemaId="0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9"
        className="mt-2"
      >
        <Name>
          <Badge />
        </Name>
        <Address />
      </Identity>
    </App>
  ),
};

export const UseBasenameInOnchainApp: Story = {
  name: "UseBasenameInOnchainApp",
  render: () => (
    <App>
      <Avatar
        address="0x02feeb0AdE57b6adEEdE5A4EEea6Cf8c21BeB6B1"
        chain={base}
      />
      <Name address="0x02feeb0AdE57b6adEEdE5A4EEea6Cf8c21BeB6B1" chain={base} />
    </App>
  ),
};
