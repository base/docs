import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import {
  MintCardMain,
  MintCardTitleAbove,
  MintCardScaled,
  MintCardOverrideStyles,
} from "../components/NFTComponents";

const meta = {
  title: "OnchainKit/NFT/MintCard",
  component: MintCardMain,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof MintCardMain>;

export default meta;

type Story = StoryObj<typeof meta>;

export const CardMain: Story = {
  name: "MintCardMain",
  render: () => <MintCardMain />,
};

export const CardTitleAbove: Story = {
  name: "MintCardTitleAbove",
  render: () => <MintCardTitleAbove />,
};

export const CardOverrideStyles: Story = {
  name: "MintCardOverrideStyles",
  render: () => <MintCardOverrideStyles />,
};

export const CardScaled: Story = {
  name: "MintCardScaled",
  render: () => <MintCardScaled square={true} />,
};

export const CardNotScaled: Story = {
  name: "MintCardNotScaled",
  render: () => <MintCardScaled square={false} />,
};
