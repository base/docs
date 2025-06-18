#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load the docs.json file
const docsPath = path.join(__dirname, 'docs', 'docs.json');
const docsConfig = JSON.parse(fs.readFileSync(docsPath, 'utf8'));

console.log('=== Testing ALL Redirects ===\n');
console.log('This test verifies that all redirect destinations are reachable.\n');

// Extract all redirects
const redirects = docsConfig.redirects || [];
console.log(`Found ${redirects.length} redirects to test.\n`);

// Group redirects by type
const slugRedirects = redirects.filter(r => r.source.includes(':slug*'));
const staticRedirects = redirects.filter(r => !r.source.includes(':slug*'));

console.log(`- Static redirects: ${staticRedirects.length}`);
console.log(`- Slug redirects: ${slugRedirects.length}\n`);

async function checkDestination(url) {
  try {
    const response = await fetch(`http://localhost:3000${url}`, {
      redirect: 'manual',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    // If we get a 200, the page exists
    if (response.status === 200) {
      return { exists: true, status: 200 };
    }
    
    // If we get a redirect, check where it goes
    if ([301, 302, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      // If it redirects to /get-started/base, the page doesn't exist
      if (location === '/get-started/base' || location === 'http://localhost:3000/get-started/base') {
        return { exists: false, status: response.status, redirectsTo: '/get-started/base' };
      }
      return { exists: true, status: response.status, redirectsTo: location };
    }
    
    return { exists: false, status: response.status };
  } catch (error) {
    return { exists: false, error: error.message };
  }
}

async function testRedirect(redirect) {
  // For slug redirects, we'll test with a sample path
  let testSource = redirect.source;
  let expectedDest = redirect.destination;
  
  if (redirect.source.includes(':slug*')) {
    // Replace :slug* with a test path
    testSource = redirect.source.replace(':slug*', 'test-page');
    if (redirect.destination.includes(':slug*')) {
      expectedDest = redirect.destination.replace(':slug*', 'test-page');
    }
  }
  
  // Test the redirect
  try {
    const response = await fetch(`http://localhost:3000${testSource}`, {
      redirect: 'manual',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    const location = response.headers.get('location');
    const actualDest = location?.replace('http://localhost:3000', '') || null;
    
    // Check if the destination exists
    const destCheck = await checkDestination(expectedDest);
    
    return {
      source: redirect.source,
      destination: redirect.destination,
      testSource,
      expectedDest,
      actualDest,
      redirectWorks: actualDest === expectedDest,
      destinationExists: destCheck.exists,
      destStatus: destCheck.status,
      destRedirectsTo: destCheck.redirectsTo
    };
  } catch (error) {
    return {
      source: redirect.source,
      destination: redirect.destination,
      error: error.message
    };
  }
}

async function runTests() {
  const results = {
    working: [],
    brokenRedirect: [],
    brokenDestination: [],
    errors: []
  };
  
  console.log('Testing redirects...\n');
  
  // Test in batches to avoid overwhelming the server
  const batchSize = 10;
  for (let i = 0; i < redirects.length; i += batchSize) {
    const batch = redirects.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(testRedirect));
    
    for (const result of batchResults) {
      if (result.error) {
        results.errors.push(result);
      } else if (!result.redirectWorks) {
        results.brokenRedirect.push(result);
      } else if (!result.destinationExists) {
        results.brokenDestination.push(result);
      } else {
        results.working.push(result);
      }
    }
    
    // Progress indicator
    process.stdout.write(`\rProgress: ${Math.min(i + batchSize, redirects.length)}/${redirects.length}`);
    
    // Small delay between batches
    if (i + batchSize < redirects.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  console.log('\n\n=== Results ===\n');
  
  console.log(`✅ Working redirects: ${results.working.length}`);
  console.log(`❌ Broken redirects (wrong destination): ${results.brokenRedirect.length}`);
  console.log(`⚠️  Redirects to non-existent pages: ${results.brokenDestination.length}`);
  console.log(`💥 Errors: ${results.errors.length}`);
  
  if (results.brokenRedirect.length > 0) {
    console.log('\n❌ Broken Redirects (redirect goes to wrong place):');
    for (const r of results.brokenRedirect) {
      console.log(`  ${r.source}`);
      console.log(`    Expected: ${r.destination}`);
      console.log(`    Actual: ${r.actualDest || 'No redirect'}`);
    }
  }
  
  if (results.brokenDestination.length > 0) {
    console.log('\n⚠️  Redirects to Non-Existent Pages:');
    for (const r of results.brokenDestination) {
      console.log(`  ${r.source} -> ${r.destination}`);
      if (r.destRedirectsTo) {
        console.log(`    (destination redirects to ${r.destRedirectsTo})`);
      }
    }
  }
  
  if (results.errors.length > 0) {
    console.log('\n💥 Errors:');
    for (const r of results.errors) {
      console.log(`  ${r.source}: ${r.error}`);
    }
  }
  
  // Test some specific smart wallet redirects
  console.log('\n=== Testing Specific Smart Wallet Redirects ===');
  const smartWalletTests = [
    '/identity/smart-wallet/concepts/usage-details/self-calls',
    '/identity/smart-wallet/faq/something',
    '/identity/smart-wallet/wallet-library-support',
    '/identity/smart-wallet/why'
  ];
  
  for (const url of smartWalletTests) {
    const response = await fetch(`http://localhost:3000${url}`, {
      redirect: 'manual',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    const location = response.headers.get('location');
    const destCheck = location ? await checkDestination(location) : null;
    
    console.log(`\nTest: ${url}`);
    console.log(`  Redirects to: ${location || 'No redirect'}`);
    if (destCheck) {
      console.log(`  Destination exists: ${destCheck.exists ? '✅' : '❌'}`);
      if (!destCheck.exists && destCheck.redirectsTo) {
        console.log(`  Falls back to: ${destCheck.redirectsTo}`);
      }
    }
  }
}

runTests().catch(console.error);