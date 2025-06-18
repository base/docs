#!/usr/bin/env node

// Test for potential redirect loops
const loopTests = [
  // These should NOT redirect (they're already at the destination)
  {
    test: "/learn/hardhat/hardhat-tools-and-testing/overview",
    shouldRedirect: false,
    description: "Already at hardhat-tools-and-testing destination"
  },
  {
    test: "/learn/hardhat/hardhat-deploy/example",
    shouldRedirect: false,
    description: "Already at hardhat-deploy destination"
  },
  {
    test: "/learn/hardhat/hardhat-forking/guide",
    shouldRedirect: false,
    description: "Already at hardhat-forking destination"
  },
  {
    test: "/learn/hardhat/hardhat-setup-overview/intro",
    shouldRedirect: false,
    description: "Already at hardhat-setup-overview destination"
  },
  {
    test: "/learn/hardhat/hardhat-testing/unit-tests",
    shouldRedirect: false,
    description: "Already at hardhat-testing destination"
  },
  {
    test: "/learn/hardhat/hardhat-verify/basescan",
    shouldRedirect: false,
    description: "Already at hardhat-verify destination"
  },
  {
    test: "/learn/hardhat/etherscan/verify",
    shouldRedirect: false,
    description: "Already at etherscan destination"
  },
  
  // These SHOULD redirect
  {
    test: "/learn/hardhat/random-page",
    shouldRedirect: true,
    expected: "/learn/hardhat/hardhat-tools-and-testing/random-page",
    description: "Generic hardhat page should redirect"
  },
  {
    test: "/learn/hardhat-deploy/setup",
    shouldRedirect: true,
    expected: "/learn/hardhat/hardhat-deploy/setup",
    description: "Old hardhat-deploy path"
  },
  {
    test: "/learn/hardhat-forking/mainnet",
    shouldRedirect: true,
    expected: "/learn/hardhat/hardhat-forking/mainnet",
    description: "Old hardhat-forking path"
  }
];

console.log('Testing for redirect loops...\n');

async function checkRedirect(url) {
  try {
    const response = await fetch(`http://localhost:3000${url}`, {
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    const location = response.headers.get('location');
    const status = response.status;
    
    return {
      redirected: status === 301 || status === 302 || status === 307 || status === 308,
      location: location,
      status: status
    };
  } catch (error) {
    return {
      redirected: false,
      error: error.message
    };
  }
}

async function detectLoop(url, maxDepth = 5) {
  const visited = new Set();
  let currentUrl = url;
  let depth = 0;
  
  while (depth < maxDepth) {
    if (visited.has(currentUrl)) {
      return { hasLoop: true, chain: Array.from(visited) };
    }
    
    visited.add(currentUrl);
    const result = await checkRedirect(currentUrl);
    
    if (!result.redirected) {
      return { hasLoop: false, chain: Array.from(visited), finalStatus: result.status };
    }
    
    if (result.location.startsWith('http://localhost:3000')) {
      currentUrl = result.location.replace('http://localhost:3000', '');
    } else {
      currentUrl = result.location;
    }
    depth++;
  }
  
  return { hasLoop: true, chain: Array.from(visited), note: 'Max depth reached' };
}

async function runTests() {
  let issues = 0;
  
  for (const test of loopTests) {
    const result = await checkRedirect(test.test);
    const loopCheck = await detectLoop(test.test);
    
    if (test.shouldRedirect) {
      if (!result.redirected) {
        console.log(`❌ ${test.description}`);
        console.log(`   URL: ${test.test}`);
        console.log(`   Expected redirect to: ${test.expected}`);
        console.log(`   But got status: ${result.status}\n`);
        issues++;
      } else if (result.location !== test.expected) {
        console.log(`⚠️  ${test.description}`);
        console.log(`   URL: ${test.test}`);
        console.log(`   Expected: ${test.expected}`);
        console.log(`   Got:      ${result.location}\n`);
      } else {
        console.log(`✅ ${test.description}`);
        console.log(`   URL: ${test.test} -> ${result.location}\n`);
      }
    } else {
      if (result.redirected) {
        console.log(`❌ ${test.description}`);
        console.log(`   URL: ${test.test}`);
        console.log(`   Should NOT redirect, but redirects to: ${result.location}`);
        if (loopCheck.hasLoop) {
          console.log(`   🔄 REDIRECT LOOP DETECTED!`);
          console.log(`   Chain: ${loopCheck.chain.join(' -> ')}`);
        }
        console.log('');
        issues++;
      } else {
        console.log(`✅ ${test.description}`);
        console.log(`   URL: ${test.test} (correctly not redirecting)\n`);
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`Total issues found: ${issues}`);
  
  if (issues > 0) {
    console.log('\n⚠️  The /learn/hardhat/:slug* redirect is too broad and catches URLs that are already in the correct subdirectories.');
    console.log('This causes redirect loops for pages already under /learn/hardhat/hardhat-*/');
  }
}

runTests().catch(console.error);