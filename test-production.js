#!/usr/bin/env node

/**
 * End-to-end production testing script
 * Tests the complete game flow in production environment
 */

const https = require('https');
const { URL } = require('url');

// Configuration
const GITHUB_PAGES_URL = process.env.GITHUB_PAGES_URL || 'https://yourusername.github.io/guess-the-sentence-game';
const WORKER_URL = process.env.WORKER_URL || 'https://guess-the-sentence-api.yourusername.workers.dev';

console.log('🧪 Starting end-to-end production tests...');
console.log(`📱 Frontend URL: ${GITHUB_PAGES_URL}`);
console.log(`⚡ Worker URL: ${WORKER_URL}`);

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Production-Test-Script/1.0',
        'Accept': 'application/json',
        ...options.headers
      }
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = res.headers['content-type']?.includes('application/json') 
            ? JSON.parse(data) 
            : data;
          resolve({ status: res.statusCode, headers: res.headers, data: jsonData });
        } catch (error) {
          resolve({ status: res.statusCode, headers: res.headers, data });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// Test functions
async function testFrontendAvailability() {
  console.log('\n📋 Testing frontend availability...');
  try {
    const response = await makeRequest(GITHUB_PAGES_URL);
    if (response.status === 200) {
      console.log('✅ Frontend is accessible');
      return true;
    } else {
      console.log(`❌ Frontend returned status ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Frontend test failed: ${error.message}`);
    return false;
  }
}

async function testWorkerHealth() {
  console.log('\n⚡ Testing worker health...');
  try {
    const response = await makeRequest(`${WORKER_URL}/health`);
    if (response.status === 200) {
      console.log('✅ Worker is healthy');
      return true;
    } else {
      console.log(`❌ Worker health check failed with status ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Worker health test failed: ${error.message}`);
    return false;
  }
}

async function testSentenceAPI() {
  console.log('\n📝 Testing sentence API...');
  try {
    const today = new Date().toISOString().split('T')[0];
    const response = await makeRequest(`${WORKER_URL}/api/sentence/${today}`);
    
    if (response.status === 200 && response.data.sentence) {
      console.log('✅ Sentence API working');
      console.log(`📄 Today's sentence: "${response.data.sentence}"`);
      return true;
    } else {
      console.log(`❌ Sentence API failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Sentence API test failed: ${error.message}`);
    return false;
  }
}

async function testLeaderboardAPI() {
  console.log('\n🏆 Testing leaderboard API...');
  try {
    const response = await makeRequest(`${WORKER_URL}/api/leaderboard`);
    
    if (response.status === 200 && Array.isArray(response.data)) {
      console.log('✅ Leaderboard API working');
      console.log(`📊 Found ${response.data.length} leaderboard entries`);
      return true;
    } else {
      console.log(`❌ Leaderboard API failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Leaderboard API test failed: ${error.message}`);
    return false;
  }
}

async function testScoreSubmission() {
  console.log('\n💯 Testing score submission...');
  try {
    const testScore = {
      playerName: `TestPlayer${Date.now()}`,
      dailyScore: 150,
      gameDate: new Date().toISOString().split('T')[0]
    };

    const response = await makeRequest(`${WORKER_URL}/api/scores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testScore)
    });

    if (response.status === 200 && response.data.success) {
      console.log('✅ Score submission working');
      console.log(`📈 Cumulative score: ${response.data.cumulativeScore}`);
      return true;
    } else {
      console.log(`❌ Score submission failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Score submission test failed: ${error.message}`);
    return false;
  }
}

async function testCORSHeaders() {
  console.log('\n🔒 Testing CORS configuration...');
  try {
    const response = await makeRequest(`${WORKER_URL}/api/leaderboard`, {
      headers: {
        'Origin': GITHUB_PAGES_URL
      }
    });

    const corsHeader = response.headers['access-control-allow-origin'];
    if (corsHeader && (corsHeader === '*' || corsHeader === GITHUB_PAGES_URL)) {
      console.log('✅ CORS headers configured correctly');
      return true;
    } else {
      console.log(`❌ CORS headers missing or incorrect: ${corsHeader}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ CORS test failed: ${error.message}`);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  const tests = [
    testFrontendAvailability,
    testWorkerHealth,
    testSentenceAPI,
    testLeaderboardAPI,
    testScoreSubmission,
    testCORSHeaders
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.log(`❌ Test error: ${error.message}`);
      failed++;
    }
  }

  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! Production environment is ready.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please check the configuration.');
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help')) {
  console.log(`
Usage: node test-production.js [options]

Environment Variables:
  GITHUB_PAGES_URL  - Your GitHub Pages URL (default: placeholder)
  WORKER_URL        - Your Cloudflare Worker URL (default: placeholder)

Options:
  --help           Show this help message

Example:
  GITHUB_PAGES_URL=https://username.github.io/repo WORKER_URL=https://api.workers.dev node test-production.js
  `);
  process.exit(0);
}

// Run the tests
runAllTests().catch(error => {
  console.error('💥 Test runner failed:', error.message);
  process.exit(1);
});