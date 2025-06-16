import { TokenSearch } from "@coinbase/onchainkit/token";
import App from "../App";
import type { Meta, StoryObj } from "@storybook/react";

const meta = {
  title: "OnchainKit/Token/Search",
  component: TokenSearch,
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
} satisfies Meta<typeof TokenSearch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: "Main",
  args: {
    onChange: (value) => console.log("Search term:", value),
    delayMs: 200,
  },
};
