#!/usr/bin/env node

console.log('=== Testing Critical Redirects ===\n');
console.log('This test focuses on the most important redirects that users rely on.\n');

const criticalRedirects = [
  // Base chain redirects
  { from: '/chain/base-contracts', to: '/base-chain/network-information/base-contracts', type: 'chain' },
  { from: '/chain/fees', to: '/base-chain/network-information/network-fees', type: 'chain' },
  { from: '/chain/network-information', to: '/base-chain/quickstart/connecting-to-base', type: 'chain' },
  { from: '/chain/using-base', to: '/base-chain/quickstart/connecting-to-base', type: 'chain' },
  
  // Smart wallet redirects
  { from: '/identity/smart-wallet', to: '/smart-wallet/quickstart', type: 'smart-wallet' },
  { from: '/identity/smart-wallet/quick-start', to: '/smart-wallet/quickstart', type: 'smart-wallet' },
  { from: '/identity/smart-wallet/concepts/features/optional/spend-permissions', to: '/smart-wallet/concepts/features/optional/spend-permissions', type: 'smart-wallet' },
  { from: '/identity/smart-wallet/features/passkeys', to: '/smart-wallet/concepts/features/built-in/passkeys', type: 'smart-wallet' },
  
  // OnchainKit redirects
  { from: '/builderkits/onchainkit/getting-started', to: '/onchainkit/getting-started', type: 'onchainkit' },
  { from: '/builderkits/onchainkit/guides/themes', to: '/onchainkit/guides/themes', type: 'onchainkit' },
  
  // Learn/cookbook redirects
  { from: '/cookbook/account-abstraction/gasless-transactions-with-paymaster', to: '/learn/onchain-app-development/account-abstraction/gasless-transactions-with-paymaster', type: 'learn' },
  { from: '/learn/hardhat-deploy/setup', to: '/learn/hardhat/hardhat-deploy/setup', type: 'learn' },
  { from: '/learn/erc-20-token/standard', to: '/learn/token-development/erc-20-token/standard', type: 'learn' },
  
  // Wallet app redirects
  { from: '/wallet-app/getting-started', to: '/wallet-app/introduction/getting-started', type: 'wallet-app' },
  { from: '/builderkits/minikit/quickstart', to: '/wallet-app/build-with-minikit/quickstart', type: 'wallet-app' },
];

async function testRedirect(redirect) {
  try {
    // Test the redirect
    const response = await fetch(`http://localhost:3000${redirect.from}`, {
      redirect: 'manual',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    const location = response.headers.get('location');
    const actualDest = location?.replace('http://localhost:3000', '') || null;
    
    // Check if redirect works
    const redirectWorks = actualDest === redirect.to;
    
    // Test if destination exists
    let destExists = false;
    let fallbackTo = null;
    
    if (actualDest) {
      const destResponse = await fetch(`http://localhost:3000${redirect.to}`, {
        redirect: 'manual',
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      
      if (destResponse.status === 200) {
        destExists = true;
      } else if ([301, 302, 307, 308].includes(destResponse.status)) {
        const destLocation = destResponse.headers.get('location');
        if (destLocation === '/get-started/base' || destLocation === 'http://localhost:3000/get-started/base') {
          destExists = false;
          fallbackTo = '/get-started/base';
        } else {
          destExists = true;
        }
      }
    }
    
    return {
      ...redirect,
      actualDest,
      redirectWorks,
      destExists,
      fallbackTo,
      status: response.status
    };
  } catch (error) {
    return {
      ...redirect,
      error: error.message
    };
  }
}

async function runTests() {
  const results = {
    chain: { working: 0, broken: 0 },
    'smart-wallet': { working: 0, broken: 0 },
    onchainkit: { working: 0, broken: 0 },
    learn: { working: 0, broken: 0 },
    'wallet-app': { working: 0, broken: 0 }
  };
  
  console.log('Testing redirects...\n');
  
  for (const redirect of criticalRedirects) {
    const result = await testRedirect(redirect);
    
    const isWorking = result.redirectWorks && result.destExists;
    if (isWorking) {
      results[result.type].working++;
      console.log(`✅ ${result.from}`);
    } else {
      results[result.type].broken++;
      console.log(`❌ ${result.from}`);
      if (!result.redirectWorks) {
        console.log(`   Redirect broken: expected ${result.to}, got ${result.actualDest || 'no redirect'}`);
      }
      if (!result.destExists) {
        console.log(`   Destination missing${result.fallbackTo ? ` (falls back to ${result.fallbackTo})` : ''}`);
      }
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n=== Summary by Category ===\n');
  
  for (const [category, stats] of Object.entries(results)) {
    const total = stats.working + stats.broken;
    console.log(`${category}:`);
    console.log(`  ✅ Working: ${stats.working}/${total}`);
    if (stats.broken > 0) {
      console.log(`  ❌ Broken: ${stats.broken}/${total}`);
    }
  }
  
  const totalWorking = Object.values(results).reduce((sum, r) => sum + r.working, 0);
  const totalBroken = Object.values(results).reduce((sum, r) => sum + r.broken, 0);
  
  console.log(`\n=== Overall ===`);
  console.log(`Total redirects tested: ${criticalRedirects.length}`);
  console.log(`✅ Working: ${totalWorking} (${Math.round(totalWorking / criticalRedirects.length * 100)}%)`);
  console.log(`❌ Broken: ${totalBroken} (${Math.round(totalBroken / criticalRedirects.length * 100)}%)`);
}

runTests().catch(console.error);