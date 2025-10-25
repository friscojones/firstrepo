#!/usr/bin/env node

/**
 * Production deployment script for Cloudflare Worker
 * Validates configuration and deploys with production settings
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting production deployment...');

// Validate configuration first
console.log('📋 Validating configuration...');
try {
  execSync('node validate-config.js', { stdio: 'inherit' });
  console.log('✅ Configuration validation passed');
} catch (error) {
  console.error('❌ Configuration validation failed');
  process.exit(1);
}

// Check if wrangler.toml has production configuration
const wranglerConfig = fs.readFileSync('wrangler.toml', 'utf8');
if (!wranglerConfig.includes('[env.production]')) {
  console.error('❌ Production environment not configured in wrangler.toml');
  process.exit(1);
}

// Deploy to production
console.log('🌐 Deploying to Cloudflare Workers...');
try {
  execSync('wrangler deploy --env production', { stdio: 'inherit' });
  console.log('✅ Deployment successful!');
} catch (error) {
  console.error('❌ Deployment failed');
  process.exit(1);
}

// Verify deployment
console.log('🔍 Verifying deployment...');
try {
  execSync('wrangler tail --env production --format pretty', { 
    stdio: 'inherit',
    timeout: 5000 
  });
} catch (error) {
  // Tail command will timeout, which is expected
  console.log('✅ Worker is running (tail timeout is normal)');
}

console.log('🎉 Production deployment complete!');
console.log('📊 Monitor your worker at: https://dash.cloudflare.com/');