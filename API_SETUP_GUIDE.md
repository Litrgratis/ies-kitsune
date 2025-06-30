# 🔑 API Keys Setup Guide for IES/Kitsune

This guide explains how to properly configure and use API keys for OpenAI, Anthropic (Claude), and Google (Gemini) in your IES/Kitsune project.

## 📋 Quick Setup

### 1. Install Required Dependencies

```bash
npm install dotenv
```

### 2. Create Environment File

Copy the example environment file and add your API keys:

```bash
# Copy the template
cp .env.example .env

# Edit the .env file with your actual API keys
```

### 3. Configure Your API Keys

Edit the `.env` file and replace the placeholder values:

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-your_actual_openai_key_here
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=1000

# Anthropic Configuration (Claude)
ANTHROPIC_API_KEY=sk-ant-your_actual_anthropic_key_here
ANTHROPIC_MODEL=claude-3-sonnet-20240229
ANTHROPIC_MAX_TOKENS=1000

# Google AI Configuration (Gemini)
GOOGLE_API_KEY=your_actual_google_api_key_here
GOOGLE_MODEL=gemini-pro
GOOGLE_MAX_TOKENS=1000

# Enable real AI (set to false to use mock responses)
ENABLE_REAL_AI=true
MOCK_MODE=false
```

## 🔐 How to Get API Keys

### OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to **API Keys** section
4. Click **"Create new secret key"**
5. Copy the key (starts with `sk-`)
6. **Important**: Save it immediately - you won't see it again!

**Cost**: Pay-per-use, starting at $0.002 per 1K tokens for GPT-4

### Anthropic (Claude) API Key

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign up or log in to your account
3. Navigate to **API Keys**
4. Click **"Create Key"**
5. Copy the key (starts with `sk-ant-`)
6. Set usage limits if needed

**Cost**: Pay-per-use, varies by model (Claude-3 Sonnet ~$15/1M tokens)

### Google AI (Gemini) API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Choose existing project or create new one
5. Copy the generated API key
6. Enable the Generative Language API in Google Cloud Console

**Cost**: Free tier available, then pay-per-use

## 🚀 Usage in Code

### Basic Configuration

The application automatically loads your API keys from the `.env` file:

```javascript
// The config is automatically loaded
import { appConfig } from './src/config.js';

// Check which providers are configured
console.log('Available providers:', appConfig.getAvailableProviders());
```

### Using the AI Service

```javascript
import { AIService } from './src/ai_service.js';

// Initialize the AI service
const aiService = new AIService();

// Generate a response
const result = await aiService.generateResponse(
  'builder1',           // AI agent role
  'Problem solving',    // Topic
  'How to improve?',    // Prompt
  {
    temperature: 0.7,   // Creativity level (0-1)
    maxTokens: 500      // Response length limit
  }
);

console.log(result);
// {
//   response: "AI generated response...",
//   quality: 8.5,
//   confidence: 0.9,
//   provider: "openai",
//   usage: { ... }
// }
```

### Provider Fallback

The system automatically falls back to other providers if one fails:

```javascript
// If OpenAI fails, it will try Anthropic, then Google
const aiService = new AIService();

// Check current status
console.log(aiService.getStatus());
// {
//   currentProvider: "openai",
//   availableProviders: ["openai", "anthropic", "google"],
//   isConfigured: true
// }
```

## 🔧 Advanced Configuration

### Environment Variables Reference

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# OpenAI Settings
OPENAI_API_KEY=sk-your_key_here
OPENAI_MODEL=gpt-4                    # or gpt-3.5-turbo
OPENAI_MAX_TOKENS=1000               # Max response length

# Anthropic Settings  
ANTHROPIC_API_KEY=sk-ant-your_key_here
ANTHROPIC_MODEL=claude-3-sonnet-20240229  # or claude-3-haiku-20240307
ANTHROPIC_MAX_TOKENS=1000

# Google Settings
GOOGLE_API_KEY=your_key_here
GOOGLE_MODEL=gemini-pro              # or gemini-pro-vision
GOOGLE_MAX_TOKENS=1000

# API Behavior
DEFAULT_AI_PROVIDER=openai           # Primary provider
ENABLE_REAL_AI=true                  # Enable real AI calls
MOCK_MODE=false                      # Use mock responses

# Security & Performance
CIRCUIT_BREAKER_THRESHOLD=5          # Failure threshold
CIRCUIT_BREAKER_TIMEOUT=60000        # Recovery time (ms)
RATE_LIMIT_WINDOW_MS=900000          # Rate limit window
RATE_LIMIT_MAX_REQUESTS=100          # Max requests per window
```

### Custom Provider Settings

```javascript
// Override default settings per request
const result = await aiService.generateResponse(
  'builder1',
  'Complex problem',
  'Detailed analysis needed',
  {
    model: 'gpt-4-1106-preview',      // Specific model
    temperature: 0.3,                 // Lower for more focused
    maxTokens: 2000,                  // Longer response
    provider: 'openai'                // Force specific provider
  }
);
```

## 🛡️ Security Best Practices

### 1. Environment File Security

```bash
# Add .env to .gitignore (already included)
echo ".env" >> .gitignore

# Never commit API keys to version control
git rm --cached .env  # If accidentally added
```

### 2. Key Rotation

```javascript
// Regularly rotate your API keys
// Update .env file and restart application
// No code changes needed
```

### 3. Access Control

```env
# Use different keys for different environments
NODE_ENV=development    # Use development keys
NODE_ENV=production     # Use production keys with higher limits
```

### 4. Monitoring Usage

```javascript
// Monitor API usage in responses
const result = await aiService.generateResponse(/*...*/);
console.log('Usage:', result.usage);
// {
//   prompt_tokens: 50,
//   completion_tokens: 200,
//   total_tokens: 250
// }
```

## 🧪 Testing Configuration

### Test API Keys

```bash
# Start the server
npm start

# Check if keys are loaded correctly
curl http://localhost:3000/health

# Test AI endpoint
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"builder":"builder1","topic":"test","prompt":"Hello"}'
```

### Mock Mode for Development

```env
# Disable real AI for testing
ENABLE_REAL_AI=false
MOCK_MODE=true
```

## 🚨 Troubleshooting

### Common Issues

**Issue**: "No valid AI API keys found"
```bash
# Solution: Check your .env file
cat .env | grep API_KEY
# Ensure at least one key is set correctly
```

**Issue**: "OpenAI API error (401): Unauthorized"
```bash
# Solution: Verify your API key
# Check if key starts with 'sk-' and is complete
# Verify account has credits/billing enabled
```

**Issue**: "Anthropic API error (403): Forbidden"
```bash
# Solution: Check API key and model access
# Ensure you have access to Claude-3 models
# Verify billing is set up
```

**Issue**: "Google API error (403): Forbidden"
```bash
# Solution: Enable Generative Language API
# Go to Google Cloud Console
# Enable the API for your project
```

### Debug Mode

```env
# Enable detailed logging
NODE_ENV=development

# Check configuration on startup
ENABLE_REAL_AI=true
```

## 💰 Cost Management

### Monitoring Costs

```javascript
// Track usage per session
let totalTokens = 0;
const result = await aiService.generateResponse(/*...*/);
totalTokens += result.usage?.total_tokens || 0;

console.log(`Session cost estimate: $${(totalTokens / 1000 * 0.002).toFixed(4)}`);
```

### Rate Limiting

```env
# Prevent excessive usage
RATE_LIMIT_MAX_REQUESTS=50      # Lower for development
CIRCUIT_BREAKER_THRESHOLD=3     # Fail fast on errors
```

### Budget Alerts

1. Set up billing alerts in each provider's console
2. Monitor usage regularly
3. Use cheaper models for development:
   - OpenAI: `gpt-3.5-turbo` instead of `gpt-4`
   - Anthropic: `claude-3-haiku` instead of `claude-3-sonnet`
   - Google: `gemini-pro` (often free tier available)

## 🎯 Next Steps

1. **Setup**: Copy `.env.example` to `.env` and add your keys
2. **Install**: Run `npm install` to install dotenv
3. **Test**: Start the server and test the AI endpoints
4. **Monitor**: Check the console for API key status on startup
5. **Optimize**: Adjust models and parameters for your use case

## 📞 Support

If you encounter issues:

1. Check the console logs for detailed error messages
2. Verify API keys are correct and have sufficient credits
3. Test with mock mode first: `MOCK_MODE=true`
4. Check provider status pages for outages

**Remember**: Never share your API keys publicly or commit them to version control!
