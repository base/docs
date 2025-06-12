import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import GithubRepoCard from './components/GithubRepoCard';

const meta = {
  title: 'Components/GithubRepoCard',
  component: GithubRepoCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/']}>
        <Story />
      </MemoryRouter>
    ),
  ],
  argTypes: {
    title: { control: 'text' },
    githubUrl: { control: 'text' },
  },
} satisfies Meta<typeof GithubRepoCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// You can pass different props via `args` when using the story:
export const Default: Story = {
  name: 'Default',
  args: {
    title: 'BASE',
    githubUrl: 'https://github.com/base/repo',
  },
};
