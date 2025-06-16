import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import App from "./App";
import BuyWrapper from "./components/BuyWrapper";
import { Buy } from "@coinbase/onchainkit/buy";

// Props for our story
interface BuyStoryProps {
  disabled: boolean;
}

// Declare the component before the meta
const BuyExample: React.FC<BuyStoryProps> = ({ disabled }) => (
  <App>
    <BuyWrapper>
      {({ toToken }) => <Buy toToken={toToken} disabled={disabled} />}
    </BuyWrapper>
  </App>
);

const meta = {
  title: "OnchainKit/Buy",
  component: BuyExample,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof BuyExample>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Disabled: Story = {
  name: "Disabled",
  args: {
    disabled: true,
  },
};

export const Enabled: Story = {
  name: "Enabled",
  args: {
    disabled: false,
  },
};
