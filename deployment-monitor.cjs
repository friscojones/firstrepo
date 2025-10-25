#!/usr/bin/env node

/**
 * Deployment Monitoring and Troubleshooting Script
 * Helps monitor GitHub Actions and Cloudflare deployments
 */

const https = require('https');
const { execSync } = require('child_process');

const REPO = 'friscojones/firstrepo';
const GITHUB_PAGES_URL = 'https://friscojones.github.io/firstrepo';
const WORKER_URL = 'https://guess-the-sentence-api-production.therobinson.workers.dev';

console.log('🔍 Deployment Monitor - Checking deployment status...\n');

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
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
    req.end();
  });
}

// Check GitHub Actions status
async function checkGitHubActions() {
  console.log('📋 Checking GitHub Actions status...');
  try {
    const response = await makeRequest(`https://api.github.com/repos/${REPO}/actions/runs?per_page=3`);
    
    if (response.status === 200 && response.data.workflow_runs) {
      const runs = response.data.workflow_runs;
      
      console.log('Recent workflow runs:');
      runs.forEach((run, index) => {
        const status = run.conclusion === 'success' ? '✅' : 
                      run.conclusion === 'failure' ? '❌' : 
                      run.status === 'in_progress' ? '🔄' : '⏳';
        
        console.log(`  ${status} ${run.name} - ${run.conclusion || run.status} (${run.created_at})`);
        console.log(`     URL: ${run.html_url}`);
      });
      
      const latestRun = runs[0];
      if (latestRun.conclusion === 'failure') {
        console.log('\n⚠️  Latest run failed. Check the logs at:', latestRun.html_url);
        return false;
      } else if (latestRun.status === 'in_progress') {
        console.log('\n🔄 Deployment in progress...');
        return 'in_progress';
      } else {
        console.log('\n✅ Latest deployment successful');
        return true;
      }
    } else {
      console.log('❌ Could not fetch GitHub Actions status');
      return false;
    }
  } catch (error) {
    console.log('❌ Error checking GitHub Actions:', error.message);
    return false;
  }
}

// Check GitHub Pages deployment
async function checkGitHubPages() {
  console.log('\n🌐 Checking GitHub Pages deployment...');
  try {
    const response = await makeRequest(GITHUB_PAGES_URL);
    
    if (response.status === 200) {
      console.log('✅ GitHub Pages is accessible');
      console.log(`   URL: ${GITHUB_PAGES_URL}`);
      return true;
    } else {
      console.log(`❌ GitHub Pages returned status ${response.status}`);
      console.log('   This might indicate the site is not deployed yet or there\'s an issue');
      return false;
    }
  } catch (error) {
    console.log('❌ GitHub Pages check failed:', error.message);
    return false;
  }
}

// Check Cloudflare Worker deployment
async function checkCloudflareWorker() {
  console.log('\n⚡ Checking Cloudflare Worker deployment...');
  try {
    // Check health endpoint
    const healthResponse = await makeRequest(`${WORKER_URL}/health`);
    
    if (healthResponse.status === 200) {
      console.log('✅ Cloudflare Worker is healthy');
      console.log(`   URL: ${WORKER_URL}`);
      
      // Test API endpoints
      const today = new Date().toISOString().split('T')[0];
      const sentenceResponse = await makeRequest(`${WORKER_URL}/api/sentence/${today}`);
      
      if (sentenceResponse.status === 200) {
        console.log('✅ Sentence API working');
        console.log(`   Today's sentence: "${sentenceResponse.data.sentence}"`);
      } else {
        console.log('⚠️  Sentence API returned status', sentenceResponse.status);
      }
      
      return true;
    } else {
      console.log(`❌ Cloudflare Worker returned status ${healthResponse.status}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Cloudflare Worker check failed:', error.message);
    return false;
  }
}

// Check local git status
function checkGitStatus() {
  console.log('\n📝 Checking local git status...');
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    
    if (status.trim() === '') {
      console.log('✅ Working directory is clean');
    } else {
      console.log('⚠️  Uncommitted changes detected:');
      console.log(status);
    }
    
    const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    console.log(`📍 Current branch: ${branch}`);
    
    const lastCommit = execSync('git log -1 --oneline', { encoding: 'utf8' }).trim();
    console.log(`📝 Last commit: ${lastCommit}`);
    
  } catch (error) {
    console.log('❌ Git status check failed:', error.message);
  }
}

// Provide troubleshooting suggestions
function provideTroubleshootingSuggestions(results) {
  console.log('\n🔧 Troubleshooting Suggestions:');
  
  if (!results.githubActions) {
    console.log('📋 GitHub Actions Issues:');
    console.log('   - Check if CLOUDFLARE_API_TOKEN secret is set correctly');
    console.log('   - Verify workflow files have correct syntax');
    console.log('   - Check if repository has Actions enabled');
    console.log('   - Review workflow logs for specific errors');
  }
  
  if (!results.githubPages) {
    console.log('🌐 GitHub Pages Issues:');
    console.log('   - Ensure GitHub Pages is enabled in repository settings');
    console.log('   - Check if Pages source is set to "GitHub Actions"');
    console.log('   - Verify the build artifacts are being uploaded correctly');
    console.log('   - Wait a few minutes for deployment to propagate');
  }
  
  if (!results.cloudflareWorker) {
    console.log('⚡ Cloudflare Worker Issues:');
    console.log('   - Verify wrangler authentication: wrangler whoami');
    console.log('   - Check wrangler.toml configuration');
    console.log('   - Ensure D1 database and KV namespaces exist');
    console.log('   - Try manual deployment: cd worker && wrangler deploy');
  }
  
  console.log('\n💡 Quick Fixes:');
  console.log('   - Re-run failed workflows from GitHub Actions tab');
  console.log('   - Check repository secrets and environment variables');
  console.log('   - Verify all configuration files are committed');
  console.log('   - Test locally before pushing: npm run build && npm run test');
}

// Main monitoring function
async function main() {
  const results = {
    githubActions: false,
    githubPages: false,
    cloudflareWorker: false
  };
  
  // Check all deployment components
  results.githubActions = await checkGitHubActions();
  results.githubPages = await checkGitHubPages();
  results.cloudflareWorker = await checkCloudflareWorker();
  
  // Check local git status
  checkGitStatus();
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Deployment Status Summary:');
  console.log(`   GitHub Actions: ${results.githubActions === true ? '✅ Working' : results.githubActions === 'in_progress' ? '🔄 In Progress' : '❌ Failed'}`);
  console.log(`   GitHub Pages:   ${results.githubPages ? '✅ Working' : '❌ Failed'}`);
  console.log(`   Cloudflare Worker: ${results.cloudflareWorker ? '✅ Working' : '❌ Failed'}`);
  
  const allWorking = results.githubActions === true && results.githubPages && results.cloudflareWorker;
  
  if (allWorking) {
    console.log('\n🎉 All systems operational! Your application is fully deployed.');
    console.log(`\n🔗 Access your game at: ${GITHUB_PAGES_URL}`);
  } else {
    console.log('\n⚠️  Some components need attention.');
    provideTroubleshootingSuggestions(results);
  }
}

// Handle command line arguments
if (process.argv.includes('--help')) {
  console.log(`
Deployment Monitor - Check the status of your deployments

Usage: node deployment-monitor.js [options]

Options:
  --help           Show this help message
  --watch          Monitor continuously (check every 30 seconds)

Examples:
  node deployment-monitor.js                    # Single check
  node deployment-monitor.js --watch           # Continuous monitoring
  `);
  process.exit(0);
}

if (process.argv.includes('--watch')) {
  console.log('🔄 Starting continuous monitoring (Ctrl+C to stop)...\n');
  
  const runMonitoring = async () => {
    await main();
    console.log('\n⏰ Next check in 30 seconds...\n');
    setTimeout(runMonitoring, 30000);
  };
  
  runMonitoring();
} else {
  main().catch(console.error);
}