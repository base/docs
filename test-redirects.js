#!/usr/bin/env node

const redirects = [
  // Test slug redirects specifically
  {
    test: "/builderkits/onchainkit/some-page",
    expected: "/onchainkit/some-page",
    description: "OnchainKit slug redirect"
  },
  {
    test: "/builderkits/onchainkit/nested/path/here",
    expected: "/onchainkit/nested/path/here",
    description: "OnchainKit nested slug redirect"
  },
  {
    test: "/cookbook/smart-contract-development/foundry/deploy-guide",
    expected: "/learn/foundry/deploy-guide",
    description: "Foundry slug redirect"
  },
  {
    test: "/cookbook/smart-contract-development/hardhat/testing-guide",
    expected: "/learn/hardhat/hardhat-tools-and-testing/testing-guide",
    description: "Hardhat slug redirect"
  },
  {
    test: "/identity/basenames/setup-guide",
    expected: "/onchainkit/guides/use-basename-in-onchain-app",
    description: "Basenames slug redirect (should go to same page regardless of slug)"
  },
  {
    test: "/identity/smart-wallet/guides/example",
    expected: "/smart-wallet/guides/example",
    description: "Smart wallet slug redirect"
  },
  {
    test: "/learn/erc-20-token/implementation",
    expected: "/learn/token-development/erc-20-token/implementation",
    description: "ERC-20 token slug redirect"
  },
  
  // Test some specific redirects from the list
  {
    test: "/builderkits/onchainkit/getting-started",
    expected: "/onchainkit/getting-started",
    description: "OnchainKit getting started"
  },
  {
    test: "/chain/base-contracts",
    expected: "/base-chain/network-information/base-contracts",
    description: "Base contracts redirect"
  },
  {
    test: "/cookbook/account-abstraction/gasless-transactions-with-paymaster",
    expected: "/learn/onchain-app-development/account-abstraction/gasless-transactions-with-paymaster",
    description: "Account abstraction redirect"
  },
  {
    test: "/identity/smart-wallet",
    expected: "/smart-wallet/quickstart",
    description: "Smart wallet base redirect"
  },
  {
    test: "/learn/hardhat/hardhat-tools-and-testing/test-page",
    expected: "/learn/hardhat/hardhat-tools-and-testing/test-page",
    description: "Hardhat catch-all redirect"
  },
  
  // Test redirects that go to static pages (not slug-based)
  {
    test: "/cookbook/smart-contract-development/remix/any-page",
    expected: "/learn/introduction-to-solidity/deployment-in-remix",
    description: "Remix redirect (static destination)"
  },
  {
    test: "/identity/basenames/any-page-here",
    expected: "/onchainkit/guides/use-basename-in-onchain-app",
    description: "Basenames redirect (static destination)"
  }
];

console.log('Testing redirects on http://localhost:3000...\n');

async function testRedirect(testCase) {
  try {
    const response = await fetch(`http://localhost:3000${testCase.test}`, {
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    const location = response.headers.get('location');
    const status = response.status;
    
    // Check if it's a redirect
    if (status === 301 || status === 302 || status === 307 || status === 308) {
      // Parse the location to handle relative URLs
      let finalLocation = location;
      if (location && !location.startsWith('http')) {
        finalLocation = location;
      }
      
      const isExpected = finalLocation === testCase.expected || 
                        finalLocation === `http://localhost:3000${testCase.expected}`;
      
      console.log(`${isExpected ? '✅' : '❌'} ${testCase.description}`);
      console.log(`   Test URL: ${testCase.test}`);
      console.log(`   Expected: ${testCase.expected}`);
      console.log(`   Got:      ${finalLocation || 'No redirect'}`);
      console.log(`   Status:   ${status}\n`);
      
      return isExpected;
    } else if (status === 200) {
      // Check if the page loaded directly (might be the final destination)
      console.log(`ℹ️  ${testCase.description}`);
      console.log(`   Test URL: ${testCase.test}`);
      console.log(`   Status:   200 OK (no redirect)\n`);
      return false;
    } else {
      console.log(`❌ ${testCase.description}`);
      console.log(`   Test URL: ${testCase.test}`);
      console.log(`   Status:   ${status} (unexpected)\n`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${testCase.description}`);
    console.log(`   Test URL: ${testCase.test}`);
    console.log(`   Error:    ${error.message}\n`);
    return false;
  }
}

async function runTests() {
  let passed = 0;
  let failed = 0;
  
  for (const testCase of redirects) {
    const result = await testRedirect(testCase);
    if (result) passed++;
    else failed++;
    
    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n=== Summary ===');
  console.log(`Total tests: ${redirects.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  // Test a URL that should fallback to /get-started/base
  console.log('\n=== Testing fallback behavior ===');
  await testRedirect({
    test: "/non-existent-page-12345",
    expected: "/get-started/base",
    description: "Non-existent page (should NOT redirect to /get-started/base as a pass)"
  });
}

// Run the tests
runTests().catch(console.error);