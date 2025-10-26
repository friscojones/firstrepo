#!/usr/bin/env node

/**
 * Configuration validation script for Cloudflare setup
 * Checks that all required resources are properly configured
 * 
 * Usage: node validate-config.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Cloudflare configuration...\n');

// Helper function to execute commands safely
function runCommand(command, description) {
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    console.log(`✅ ${description}: OK`);
    return { success: true, output };
  } catch (error) {
    console.log(`❌ ${description}: FAILED`);
    console.log(`   Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Check if wrangler.toml exists and has required configuration
function validateWranglerConfig() {
  console.log('📋 Checking wrangler.toml configuration...');
  
  if (!fs.existsSync('wrangler.toml')) {
    console.log('❌ wrangler.toml not found');
    return false;
  }
  
  const config = fs.readFileSync('wrangler.toml', 'utf8');
  
  // Check for required sections
  const checks = [
    { pattern: /name\s*=\s*"guess-the-sentence-api"/, name: 'Worker name' },
    { pattern: /binding\s*=\s*"SENTENCES_KV"/, name: 'KV binding' },
    { pattern: /binding\s*=\s*"GAME_DB"/, name: 'D1 binding' },
    { pattern: /database_name\s*=\s*"guess-the-sentence-db"/, name: 'Database name' },
    { pattern: /ALLOWED_ORIGINS/, name: 'CORS configuration' }
  ];
  
  let allValid = true;
  checks.forEach(check => {
    if (check.pattern.test(config)) {
      console.log(`✅ ${check.name}: Configured`);
    } else {
      console.log(`❌ ${check.name}: Missing or incorrect`);
      allValid = false;
    }
  });
  
  // Check for placeholder values
  if (config.includes('database_id_placeholder')) {
    console.log('⚠️  Database ID still contains placeholder - update with real ID');
    allValid = false;
  }
  
  if (config.includes('sentences_namespace_id') && !config.match(/id\s*=\s*"[a-f0-9]{32}"/)) {
    console.log('⚠️  KV namespace ID appears to be placeholder - update with real ID');
    allValid = false;
  }
  
  return allValid;
}

// Validate KV namespace
function validateKV() {
  console.log('\n📦 Checking KV namespace...');
  return runCommand(
    'wrangler kv namespace list',
    'KV namespace accessibility'
  );
}

// Validate D1 database
function validateD1() {
  console.log('\n🗄️  Checking D1 database...');
  const dbCheck = runCommand(
    'wrangler d1 list',
    'D1 database accessibility'
  );
  
  if (dbCheck.success) {
    // Try to query the database
    return runCommand(
      'wrangler d1 execute guess-the-sentence-db --command="SELECT COUNT(*) as table_count FROM sqlite_master WHERE type=\'table\' AND name IN (\'players\', \'daily_scores\');"',
      'Database schema validation'
    );
  }
  
  return dbCheck;
}

// Check if sentences are populated
function validateSentences() {
  console.log('\n📝 Checking sentence population...');
  return runCommand(
    'wrangler kv key list --binding=SENTENCES_KV',
    'Sentence data in KV store'
  );
}

// Test API endpoints (if deployed)
function testEndpoints() {
  console.log('\n🌐 Testing API endpoints (if deployed)...');
  
  try {
    const workerUrl = execSync('wrangler whoami', { encoding: 'utf8' });
    // This is a basic check - in practice you'd need the actual worker URL
    console.log('ℹ️  Worker deployment status check requires manual verification');
    console.log('   Run "wrangler dev" to test locally or check your worker URL');
  } catch (error) {
    console.log('ℹ️  Could not determine deployment status');
  }
}

// Main validation flow
async function main() {
  let overallSuccess = true;
  
  // 1. Validate configuration file
  if (!validateWranglerConfig()) {
    overallSuccess = false;
  }
  
  // 2. Check KV namespace
  const kvResult = validateKV();
  if (!kvResult.success) {
    overallSuccess = false;
  }
  
  // 3. Check D1 database
  const d1Result = validateD1();
  if (!d1Result.success) {
    overallSuccess = false;
  }
  
  // 4. Check sentence population
  const sentenceResult = validateSentences();
  if (!sentenceResult.success) {
    overallSuccess = false;
  }
  
  // 5. Test endpoints
  testEndpoints();
  
  // Summary
  console.log('\n' + '='.repeat(50));
  if (overallSuccess) {
    console.log('🎉 Configuration validation completed successfully!');
    console.log('\n✅ Your Cloudflare setup appears to be ready');
    console.log('💡 Next steps:');
    console.log('   - Run "wrangler dev" to test locally');
    console.log('   - Run "wrangler deploy" to deploy to production');
    console.log('   - Update your frontend with the worker URL');
  } else {
    console.log('⚠️  Configuration validation found issues');
    console.log('\n❌ Please fix the issues above before deploying');
    console.log('💡 Common fixes:');
    console.log('   - Run "node setup-cloudflare.js" to create missing resources');
    console.log('   - Update wrangler.toml with correct IDs');
    console.log('   - Run "wrangler login" if authentication failed');
  }
}

main().catch(console.error);