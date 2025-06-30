import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

config({ path: join(projectRoot, '.env') });

/**
 * Application Configuration
 * Loads environment variables and provides defaults
 */
export const appConfig = {
  // Server Configuration
  server: {
    port: parseInt(process.env.PORT) || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000'
  },

  // OpenAI Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 1000,
    baseURL: 'https://api.openai.com/v1'
  },

  // Anthropic Configuration
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
    maxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS) || 1000,
    baseURL: 'https://api.anthropic.com'
  },

  // Google AI Configuration
  google: {
    apiKey: process.env.GOOGLE_API_KEY,
    model: process.env.GOOGLE_MODEL || 'gemini-pro',
    maxTokens: parseInt(process.env.GOOGLE_MAX_TOKENS) || 1000,
    baseURL: 'https://generativelanguage.googleapis.com/v1beta'
  },

  // Circuit Breaker Settings
  circuitBreaker: {
    threshold: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD) || 5,
    timeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT) || 60000
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  },

  // API Configuration
  api: {
    defaultProvider: process.env.DEFAULT_AI_PROVIDER || 'openai',
    enableRealAI: process.env.ENABLE_REAL_AI === 'true',
    mockMode: process.env.MOCK_MODE === 'true'
  },

  // Security
  security: {
    sessionSecret: process.env.SESSION_SECRET || 'fallback-secret-key'
  }
};

/**
 * Validate required environment variables
 */
export function validateConfig() {
  const requiredKeys = [];
  
  if (appConfig.api.enableRealAI && !appConfig.api.mockMode) {
    // Check for at least one AI provider API key
    const hasOpenAI = appConfig.openai.apiKey && appConfig.openai.apiKey !== 'your_openai_api_key_here';
    const hasAnthropic = appConfig.anthropic.apiKey && appConfig.anthropic.apiKey !== 'your_anthropic_api_key_here';
    const hasGoogle = appConfig.google.apiKey && appConfig.google.apiKey !== 'your_google_api_key_here';
    
    if (!hasOpenAI && !hasAnthropic && !hasGoogle) {
      throw new Error(
        '❌ No valid AI API keys found. Please set at least one of: OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_API_KEY in your .env file'
      );
    }
    
    console.log('🔑 AI API Keys Status:');
    console.log(`  - OpenAI: ${hasOpenAI ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`  - Anthropic: ${hasAnthropic ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`  - Google: ${hasGoogle ? '✅ Configured' : '❌ Not configured'}`);
  }
  
  return true;
}

/**
 * Get AI provider configuration based on priority
 */
export function getAvailableProviders() {
  const providers = [];
  
  if (appConfig.openai.apiKey && appConfig.openai.apiKey !== 'your_openai_api_key_here') {
    providers.push('openai');
  }
  
  if (appConfig.anthropic.apiKey && appConfig.anthropic.apiKey !== 'your_anthropic_api_key_here') {
    providers.push('anthropic');
  }
  
  if (appConfig.google.apiKey && appConfig.google.apiKey !== 'your_google_api_key_here') {
    providers.push('google');
  }
  
  return providers;
}

export default appConfig;
