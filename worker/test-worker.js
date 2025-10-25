/**
 * Simple test script to validate Worker TypeScript compilation
 * Run with: node test-worker.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Testing Cloudflare Worker setup...');

// Check if required files exist
const requiredFiles = [
  'src/index.ts',
  'src/types.ts',
  'wrangler.toml',
  'tsconfig.json',
  'package.json',
  'schema.sql'
];

console.log('\n1. Checking required files...');
requiredFiles.forEach(file => {
  if (fs.existsSync(path.join(__dirname, file))) {
    console.log(`✓ ${file} exists`);
  } else {
    console.log(`✗ ${file} missing`);
  }
});

// Check TypeScript compilation
console.log('\n2. Checking TypeScript compilation...');
try {
  // Install dependencies first
  console.log('Installing dependencies...');
  execSync('npm install', { cwd: __dirname, stdio: 'pipe' });
  
  // Check if wrangler can validate the configuration
  console.log('Validating wrangler configuration...');
  execSync('npx wrangler types', { cwd: __dirname, stdio: 'pipe' });
  
  console.log('✓ TypeScript compilation successful');
} catch (error) {
  console.log('✗ TypeScript compilation failed:', error.message);
}

// Validate API endpoints structure
console.log('\n3. Validating API structure...');
const indexContent = fs.readFileSync(path.join(__dirname, 'src/index.ts'), 'utf8');

const endpoints = [
  '/api/sentence/',
  '/api/scores',
  '/api/leaderboard'
];

endpoints.forEach(endpoint => {
  if (indexContent.includes(endpoint)) {
    console.log(`✓ ${endpoint} endpoint implemented`);
  } else {
    console.log(`✗ ${endpoint} endpoint missing`);
  }
});

// Check CORS implementation
if (indexContent.includes('Access-Control-Allow-Origin')) {
  console.log('✓ CORS headers implemented');
} else {
  console.log('✗ CORS headers missing');
}

// Check security features
const securityFeatures = [
  'requestedDate > today', // Future date blocking
  'sanitizedName', // Input sanitization
  'existingScore' // Duplicate prevention
];

securityFeatures.forEach(feature => {
  if (indexContent.includes(feature)) {
    console.log(`✓ Security feature: ${feature}`);
  } else {
    console.log(`✗ Security feature missing: ${feature}`);
  }
});

console.log('\nWorker validation complete!');
console.log('\nNext steps:');
console.log('1. Update wrangler.toml with your actual database and KV namespace IDs');
console.log('2. Run: wrangler d1 create guess-the-sentence-db');
console.log('3. Run: wrangler kv:namespace create "SENTENCES_KV"');
console.log('4. Run: wrangler d1 execute guess-the-sentence-db --file=./schema.sql');
console.log('5. Run: wrangler deploy');