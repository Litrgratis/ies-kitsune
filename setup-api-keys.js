#!/usr/bin/env node

/**
 * Interactive API Keys Setup Script for IES/Kitsune
 * This script helps users configure their environment variables
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

console.log('🦊 IES/Kitsune API Keys Setup');
console.log('================================\n');

// Check if .env.example exists
if (!fs.existsSync(envExamplePath)) {
  console.error('❌ .env.example file not found!');
  console.log('Please ensure you have the .env.example file in your project root.');
  process.exit(1);
}

// Check if .env already exists
if (fs.existsSync(envPath)) {
  console.log('⚠️  .env file already exists.');
  console.log('This script will create a backup and generate a new one.\n');
  
  // Create backup
  const backupPath = path.join(__dirname, `.env.backup.${Date.now()}`);
  fs.copyFileSync(envPath, backupPath);
  console.log(`📦 Backup created: ${path.basename(backupPath)}\n`);
}

// Copy .env.example to .env
fs.copyFileSync(envExamplePath, envPath);
console.log('✅ Created .env file from template\n');

console.log('🔑 Next Steps:');
console.log('==============\n');

console.log('1. 📝 Edit the .env file with your API keys:');
console.log(`   code ${envPath}`);
console.log('   # or use any text editor\n');

console.log('2. 🔐 Get your API keys:');
console.log('   • OpenAI: https://platform.openai.com/api-keys');
console.log('   • Anthropic: https://console.anthropic.com/');
console.log('   • Google: https://makersuite.google.com/app/apikey\n');

console.log('3. 🧪 Test your configuration:');
console.log('   npm install    # Install dependencies');
console.log('   npm start      # Start the server');
console.log('   # Check console for API key status\n');

console.log('4. 📚 Read the full guide:');
console.log('   API_SETUP_GUIDE.md\n');

console.log('🔒 Security Notes:');
console.log('================');
console.log('• Never commit .env to version control');
console.log('• Keep API keys secure and private');
console.log('• Use different keys for development/production');
console.log('• Monitor your API usage and costs\n');

console.log('🚀 You can start with mock mode by setting:');
console.log('   ENABLE_REAL_AI=false');
console.log('   MOCK_MODE=true\n');

console.log('Happy problem solving with IES/Kitsune! 🦊✨');
