import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import {
  ViewCardMain,
  ViewCardTitleAbove,
  ViewCardScaled,
  ViewCardOverrideStyles,
} from "../components/NFTComponents";

const meta = {
  title: "OnchainKit/NFT/Card",
  component: ViewCardMain,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ViewCardMain>;

export default meta;

type Story = StoryObj<typeof meta>;

export const CardMain: Story = {
  name: "ViewCardMain",
  render: () => <ViewCardMain />,
};

export const CardTitleAbove: Story = {
  name: "ViewCardTitleAbove",
  render: () => <ViewCardTitleAbove />,
};

export const CardOverrideStyles: Story = {
  name: "ViewCardOverrideStyles",
  render: () => <ViewCardOverrideStyles />,
};

export const CardScaled: Story = {
  name: "ViewCardScaled",
  render: () => <ViewCardScaled square={true} />,
};

export const CardNotScaled: Story = {
  name: "CardNotScaled",
  render: () => <ViewCardScaled square={false} />,
};
