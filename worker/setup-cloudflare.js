#!/usr/bin/env node

/**
 * Comprehensive setup script for Cloudflare KV and D1 database
 * This script automates the creation and configuration of Cloudflare resources
 * 
 * Prerequisites:
 * - Wrangler CLI installed and authenticated
 * - Cloudflare account with Workers and D1 enabled
 * 
 * Usage: node setup-cloudflare.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Cloudflare resources for Guess the Sentence Game...\n');

// Helper function to execute commands with error handling
function runCommand(command, description) {
  console.log(`📋 ${description}...`);
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    console.log(`✅ ${description} completed successfully`);
    return output;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    if (error.stdout) console.log('Output:', error.stdout);
    if (error.stderr) console.log('Error:', error.stderr);
    throw error;
  }
}

// Step 1: Create D1 Database
console.log('1️⃣ Creating D1 Database');
try {
  const dbOutput = runCommand(
    'wrangler d1 create guess-the-sentence-db',
    'Creating D1 database'
  );
  
  // Extract database ID from output
  const dbIdMatch = dbOutput.match(/database_id = "([^"]+)"/);
  if (dbIdMatch) {
    const databaseId = dbIdMatch[1];
    console.log(`📝 Database ID: ${databaseId}`);
    console.log('⚠️  Please update wrangler.toml with this database ID\n');
  }
} catch (error) {
  console.log('ℹ️  Database might already exist, continuing...\n');
}

// Step 2: Create KV Namespaces
console.log('2️⃣ Creating KV Namespaces');
try {
  const kvOutput = runCommand(
    'wrangler kv namespace create "SENTENCES_KV"',
    'Creating production KV namespace'
  );
  
  const kvPreviewOutput = runCommand(
    'wrangler kv namespace create "SENTENCES_KV" --preview',
    'Creating preview KV namespace'
  );
  
  // Extract namespace IDs
  const kvIdMatch = kvOutput.match(/id = "([^"]+)"/);
  const kvPreviewIdMatch = kvPreviewOutput.match(/id = "([^"]+)"/);
  
  if (kvIdMatch && kvPreviewIdMatch) {
    console.log(`📝 Production KV ID: ${kvIdMatch[1]}`);
    console.log(`📝 Preview KV ID: ${kvPreviewIdMatch[1]}`);
    console.log('⚠️  Please update wrangler.toml with these namespace IDs\n');
  }
} catch (error) {
  console.log('ℹ️  KV namespaces might already exist, continuing...\n');
}

// Step 3: Initialize Database Schema
console.log('3️⃣ Initializing Database Schema');
try {
  runCommand(
    'wrangler d1 execute guess-the-sentence-db --file=./schema.sql',
    'Applying database schema'
  );
  console.log('');
} catch (error) {
  console.log('ℹ️  Schema might already be applied, continuing...\n');
}

// Step 4: Populate KV Store with Sentences
console.log('4️⃣ Populating KV Store with Sample Sentences');
try {
  runCommand(
    'node populate-sentences.js',
    'Adding sample sentences to KV store'
  );
  console.log('');
} catch (error) {
  console.log('⚠️  Failed to populate sentences. You can run this manually later.\n');
}

// Step 5: Verify Setup
console.log('5️⃣ Verifying Setup');
try {
  runCommand(
    'wrangler kv key list --binding=SENTENCES_KV',
    'Listing KV keys to verify setup'
  );
} catch (error) {
  console.log('⚠️  Could not verify KV setup. Check your configuration.\n');
}

console.log('🎉 Setup completed!');
console.log('\n📋 Next Steps:');
console.log('1. Update wrangler.toml with the database and KV namespace IDs shown above');
console.log('2. Update ALLOWED_ORIGINS in wrangler.toml with your GitHub Pages URL');
console.log('3. Run "wrangler deploy" to deploy your worker');
console.log('4. Test your endpoints with "wrangler dev"');
console.log('\n💡 Tip: Keep the database and namespace IDs safe - you\'ll need them for deployment!');