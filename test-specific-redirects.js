#!/usr/bin/env node

// Test specific problematic redirects
const problematicTests = [
  {
    test: "/learn/hardhat/test-page",
    expected: "/learn/hardhat/hardhat-tools-and-testing/test-page",
    description: "Hardhat base redirect"
  },
  {
    test: "/learn/hardhat-tools-and-testing/overview",
    expected: "/learn/hardhat/hardhat-tools-and-testing/overview",
    description: "Hardhat tools redirect (explicit)"
  },
  {
    test: "/learn/hardhat/another/nested/path",
    expected: "/learn/hardhat/hardhat-tools-and-testing/another/nested/path",
    description: "Hardhat nested path redirect"
  }
];

console.log('Testing specific hardhat redirects...\n');

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
    
    if (status === 301 || status === 302 || status === 307 || status === 308) {
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
      
      return { passed: isExpected, location: finalLocation };
    } else {
      console.log(`ℹ️  ${testCase.description}`);
      console.log(`   Test URL: ${testCase.test}`);
      console.log(`   Status:   ${status} (no redirect)\n`);
      return { passed: false, location: null };
    }
  } catch (error) {
    console.log(`❌ ${testCase.description}`);
    console.log(`   Test URL: ${testCase.test}`);
    console.log(`   Error:    ${error.message}\n`);
    return { passed: false, location: null };
  }
}

async function followRedirects(url, maxRedirects = 5) {
  console.log(`\nFollowing redirect chain for: ${url}`);
  let currentUrl = url;
  let redirectCount = 0;
  
  while (redirectCount < maxRedirects) {
    try {
      const response = await fetch(`http://localhost:3000${currentUrl}`, {
        redirect: 'manual',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });
      
      const location = response.headers.get('location');
      const status = response.status;
      
      if (status === 301 || status === 302 || status === 307 || status === 308) {
        console.log(`  ${redirectCount + 1}. ${currentUrl} -> ${location} (${status})`);
        if (location.startsWith('http://localhost:3000')) {
          currentUrl = location.replace('http://localhost:3000', '');
        } else {
          currentUrl = location;
        }
        redirectCount++;
      } else {
        console.log(`  Final: ${currentUrl} (${status})`);
        break;
      }
    } catch (error) {
      console.log(`  Error: ${error.message}`);
      break;
    }
  }
  
  if (redirectCount >= maxRedirects) {
    console.log(`  Warning: Max redirects reached!`);
  }
}

async function runTests() {
  for (const testCase of problematicTests) {
    const result = await testRedirect(testCase);
    if (!result.passed) {
      await followRedirects(testCase.test);
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

runTests().catch(console.error);