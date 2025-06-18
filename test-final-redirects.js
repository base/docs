#!/usr/bin/env node

console.log('=== Final Redirect Test Summary ===\n');

const slugRedirects = [
  // Slug redirects that should work
  { from: "/builderkits/onchainkit/any/path/here", to: "/onchainkit/any/path/here" },
  { from: "/cookbook/smart-contract-development/foundry/test", to: "/learn/foundry/test" },
  { from: "/cookbook/smart-contract-development/hardhat/guide", to: "/learn/hardhat/hardhat-tools-and-testing/guide" },
  { from: "/identity/smart-wallet/concepts/test", to: "/smart-wallet/concepts/test" },
  { from: "/learn/erc-20-token/guide", to: "/learn/token-development/erc-20-token/guide" },
  { from: "/learn/erc-721-token/guide", to: "/learn/token-development/erc-721-token/guide" },
  { from: "/learn/etherscan/tutorial", to: "/learn/hardhat/etherscan/tutorial" },
  { from: "/learn/frontend-setup/viem", to: "/learn/onchain-app-development/frontend-setup/viem" },
  { from: "/learn/hardhat-deploy/script", to: "/learn/hardhat/hardhat-deploy/script" },
  { from: "/learn/hardhat-forking/mainnet", to: "/learn/hardhat/hardhat-forking/mainnet" },
  { from: "/learn/hardhat-setup-overview/intro", to: "/learn/hardhat/hardhat-setup-overview/intro" },
  { from: "/learn/hardhat-testing/unit", to: "/learn/hardhat/hardhat-testing/unit" },
  { from: "/learn/hardhat-verify/basescan", to: "/learn/hardhat/hardhat-verify/basescan" },
  { from: "/learn/intro-to-tokens/vid", to: "/learn/token-development/intro-to-tokens/vid" },
  { from: "/learn/minimal-tokens/transfer", to: "/learn/token-development/minimal-tokens/transfer" },
  { from: "/learn/reading-and-displaying-data/hooks", to: "/learn/onchain-app-development/reading-and-displaying-data/hooks" },
  { from: "/learn/writing-to-contracts/wagmi", to: "/learn/onchain-app-development/writing-to-contracts/wagmi" },
  
  // Static redirects (slug is ignored)
  { from: "/cookbook/smart-contract-development/remix/anything", to: "/learn/introduction-to-solidity/deployment-in-remix" },
  { from: "/identity/basenames/whatever", to: "/onchainkit/guides/use-basename-in-onchain-app" },
];

async function testRedirect(from, to) {
  try {
    const response = await fetch(`http://localhost:3000${from}`, {
      redirect: 'manual',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    const location = response.headers.get('location');
    const isCorrect = location === to || location === `http://localhost:3000${to}`;
    
    return { success: isCorrect, actual: location, status: response.status };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function runTests() {
  let passed = 0;
  let failed = 0;
  
  for (const redirect of slugRedirects) {
    const result = await testRedirect(redirect.from, redirect.to);
    
    if (result.success) {
      console.log(`✅ ${redirect.from}`);
      passed++;
    } else {
      console.log(`❌ ${redirect.from}`);
      console.log(`   Expected: ${redirect.to}`);
      console.log(`   Got: ${result.actual || result.error}`);
      failed++;
    }
    
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  console.log(`\n=== Results ===`);
  console.log(`Total: ${slugRedirects.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  if (failed === 0) {
    console.log('\n✅ All slug redirects are working correctly!');
  }
}

runTests().catch(console.error);