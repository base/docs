import type { Meta, StoryObj } from '@storybook/react';
import { CodePlayground } from './CodePlayground';

const meta = {
  title: 'Documentation/CodePlayground',
  component: CodePlayground,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Interactive code playground for running examples directly in documentation. Supports JavaScript, TypeScript, and Solidity syntax highlighting.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    language: {
      control: 'select',
      options: ['javascript', 'typescript', 'solidity'],
      description: 'Programming language for syntax highlighting',
    },
    editable: {
      control: 'boolean',
      description: 'Allow users to edit the code',
    },
    showLineNumbers: {
      control: 'boolean',
      description: 'Show line numbers in the editor',
    },
    height: {
      control: 'text',
      description: 'Height of the code editor',
    },
  },
} satisfies Meta<typeof CodePlayground>;

export default meta;
type Story = StoryObj<typeof meta>;

export const JavaScriptExample: Story = {
  name: 'JavaScript Example',
  args: {
    initialCode: `// Simple JavaScript example
const greeting = "Hello, Base!";
console.log(greeting);

// Working with arrays
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
console.log("Doubled:", doubled);

// Async example
async function fetchData() {
  return "Data loaded successfully";
}

fetchData().then(data => console.log(data));`,
    language: 'javascript',
    editable: true,
    showLineNumbers: true,
    height: '400px',
  },
};

export const TypeScriptExample: Story = {
  name: 'TypeScript Example',
  args: {
    initialCode: `// TypeScript example with types
interface User {
  name: string;
  address: string;
}

const user: User = {
  name: "Alice",
  address: "0x1234567890abcdef"
};

console.log("User:", user);

// Type-safe function
function formatAddress(address: string): string {
  return address.slice(0, 6) + "..." + address.slice(-4);
}

console.log("Formatted:", formatAddress(user.address));`,
    language: 'typescript',
    editable: true,
    height: '400px',
  },
};

export const SolidityExample: Story = {
  name: 'Solidity Example',
  args: {
    initialCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleStorage {
    uint256 private storedData;

    event DataStored(uint256 data);

    function set(uint256 x) public {
        storedData = x;
        emit DataStored(x);
    }

    function get() public view returns (uint256) {
        return storedData;
    }
}`,
    language: 'solidity',
    editable: true,
    height: '400px',
  },
};

export const BaseAccountExample: Story = {
  name: 'Base Account Example',
  args: {
    initialCode: `// Example: Creating a Base Account transaction
import { createBaseAccount } from '@base/account-sdk';

async function createTransaction() {
  // Initialize Base Account
  const account = await createBaseAccount({
    privateKey: process.env.PRIVATE_KEY
  });

  console.log("Account address:", account.address);

  // Create a transaction
  const tx = await account.sendTransaction({
    to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    value: "0.01", // ETH
    data: "0x"
  });

  console.log("Transaction hash:", tx.hash);
  console.log("Waiting for confirmation...");

  await tx.wait();
  console.log("Transaction confirmed!");
}

// Note: This is a demo - requires Base Account SDK
console.log("Base Account Example");
console.log("Visit docs.base.org for full implementation");`,
    language: 'javascript',
    editable: true,
    height: '450px',
  },
};

export const OnchainKitExample: Story = {
  name: 'OnchainKit Example',
  args: {
    initialCode: `// Example: Using OnchainKit components
import { Transaction, TransactionButton } from '@coinbase/onchainkit/transaction';
import { base } from 'wagmi/chains';

function PaymentComponent() {
  const handleSuccess = (response) => {
    console.log("Transaction successful:", response);
  };

  return (
    <Transaction
      chainId={base.id}
      onSuccess={handleSuccess}
    >
      <TransactionButton />
    </Transaction>
  );
}

// Interactive demo
console.log("OnchainKit simplifies Web3 development");
console.log("Features: Wallet integration, transactions, tokens");
console.log("Learn more at docs.base.org/onchainkit");`,
    language: 'javascript',
    editable: true,
    height: '450px',
  },
};

export const ReadOnly: Story = {
  name: 'Read-Only Example',
  args: {
    initialCode: `// This example cannot be edited
// Perfect for showing final implementations

const result = calculateTotal([1, 2, 3, 4, 5]);
console.log("Total:", result);

function calculateTotal(numbers) {
  return numbers.reduce((sum, n) => sum + n, 0);
}`,
    language: 'javascript',
    editable: false,
    height: '300px',
  },
};

export const CompactView: Story = {
  name: 'Compact View',
  args: {
    initialCode: `// Smaller playground for inline examples
console.log("Quick demo");`,
    language: 'javascript',
    editable: true,
    height: '150px',
  },
};
