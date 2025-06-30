import { responseCache } from './cache.js';
import { metricsCollector } from './metrics.js';

/**
 * Rate Limiting Manager
 * Implements simple rate limiting to prevent API abuse
 */
class RateLimiter {
    constructor(requestsPerSecond = 1) {
        this.requestsPerSecond = requestsPerSecond;
        this.lastRequestTime = 0;
        this.requestQueue = [];
        this.processing = false;
    }

    async waitForSlot() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        const minInterval = 1000 / this.requestsPerSecond;
        
        if (timeSinceLastRequest < minInterval) {
            const waitTime = minInterval - timeSinceLastRequest;
            console.log(`⏱️ Rate limiting: waiting ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        this.lastRequestTime = Date.now();
    }

    async execute(fn) {
        await this.waitForSlot();
        return await fn();
    }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter(
    parseFloat(process.env.API_RATE_LIMIT) || 1 // 1 request per second by default
);

/**
 * Configuration for API behavior
 */
const API_CONFIG = {
    enableRealAI: process.env.ENABLE_REAL_AI === 'true',
    mockMode: process.env.MOCK_MODE === 'true',
    defaultProvider: process.env.DEFAULT_AI_PROVIDER || 'openai',
    
    // OpenAI Configuration
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4',
    openaiMaxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 1000,
    openaiBaseURL: 'https://api.openai.com/v1',
    
    // Anthropic Configuration
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
    anthropicMaxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS) || 1000,
    anthropicBaseURL: 'https://api.anthropic.com',
    
    // Google Configuration
    googleApiKey: process.env.GOOGLE_API_KEY,
    googleModel: process.env.GOOGLE_MODEL || 'gemini-pro',
    googleMaxTokens: parseInt(process.env.GOOGLE_MAX_TOKENS) || 1000,
    googleBaseURL: 'https://generativelanguage.googleapis.com/v1beta'
};

/**
 * Call OpenAI GPT-4 API directly
 * @param {string} builder - AI agent role (builder1, builder2, synthesizer, evaluator)
 * @param {string} topic - Problem topic
 * @param {string} prompt - User prompt
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} API response
 */
export async function callOpenAI(builder, topic, prompt, options = {}) {
    // Check cache first
    const cached = responseCache.get(builder, topic, prompt, options);
    if (cached) {
        return cached;
    }

    if (!API_CONFIG.openaiApiKey) {
        throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY in .env file.');
    }

    if (!API_CONFIG.openaiApiKey.startsWith('sk-')) {
        throw new Error('Invalid OpenAI API key format. Key should start with "sk-"');
    }

    const systemPrompt = getSystemPrompt(builder);
    const userContent = `Temat: ${topic}\n\nPrompt: ${prompt}`;

    const requestBody = {
        model: options.model || API_CONFIG.openaiModel,
        messages: [
            {
                role: 'system',
                content: systemPrompt
            },
            {
                role: 'user',
                content: userContent
            }
        ],
        max_tokens: options.maxTokens || API_CONFIG.openaiMaxTokens,
        temperature: options.temperature || 0.7,
        top_p: options.topP || 1,
        frequency_penalty: options.frequencyPenalty || 0,
        presence_penalty: options.presencePenalty || 0,
        stream: false
    };

    const startTime = Date.now();
    
    try {
        console.log(`🤖 Calling OpenAI API for ${builder}...`);
        
        // Apply rate limiting
        const response = await rateLimiter.execute(async () => {
            return await fetch(`${API_CONFIG.openaiBaseURL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_CONFIG.openaiApiKey}`,
                'User-Agent': 'IES-Kitsune/1.0'
            },
            body: JSON.stringify(requestBody)
            });
        });

        // Handle specific OpenAI error codes
        if (response.status === 401) {
            throw new Error('OpenAI API: Unauthorized - Check your API key');
        }
        if (response.status === 402) {
            throw new Error('OpenAI API: Payment required - Check your billing');
        }
        if (response.status === 429) {
            throw new Error('OpenAI API: Rate limit exceeded - Try again later');
        }
        if (response.status === 500) {
            throw new Error('OpenAI API: Server error - Try again later');
        }
        if (response.status === 503) {
            throw new Error('OpenAI API: Service unavailable - Try again later');
        }

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`OpenAI API error (${response.status}): ${errorData}`);
        }

        const data = await response.json();
        
        // Validate response structure
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('Invalid response structure from OpenAI API');
        }

        const content = data.choices[0].message.content;
        const usage = data.usage || {};

        const latency = Date.now() - startTime;
        console.log(`✅ OpenAI API call successful for ${builder}`);
        console.log(`📊 Tokens used: ${usage.total_tokens || 'unknown'}`);

        // Prepare response object
        const result = {
            response: content,
            quality: assessResponseQuality(content),
            confidence: assessResponseConfidence(content),
            provider: 'openai',
            model: data.model,
            usage: usage,
            finishReason: data.choices[0].finish_reason,
            latency
        };

        // Record metrics
        metricsCollector.recordAPICall('openai', data.model, builder, usage, latency);
        
        // Cache successful response
        responseCache.set(builder, topic, prompt, result, options);

        return result;

    } catch (error) {
        const latency = Date.now() - startTime;
        console.error(`❌ OpenAI API call failed for ${builder}:`, error.message);
        
        // Record failed metrics
        metricsCollector.recordAPICall('openai', options.model || API_CONFIG.openaiModel, builder, { total_tokens: 0 }, latency, error);
        
        // Re-throw with more context
        if (error.message.includes('fetch')) {
            throw new Error(`Network error calling OpenAI API: ${error.message}`);
        }
        throw error;
    }
}

/**
 * Call Anthropic Claude API directly
 * @param {string} builder - AI agent role (builder1, builder2, synthesizer, evaluator)
 * @param {string} topic - Problem topic
 * @param {string} prompt - User prompt
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} API response
 */
export async function callAnthropic(builder, topic, prompt, options = {}) {
    // Check cache first
    const cached = responseCache.get(builder, topic, prompt, options);
    if (cached) {
        return cached;
    }

    if (!API_CONFIG.anthropicApiKey) {
        throw new Error('Anthropic API key not configured. Set ANTHROPIC_API_KEY in .env file.');
    }

    if (!API_CONFIG.anthropicApiKey.startsWith('sk-ant-')) {
        throw new Error('Invalid Anthropic API key format. Key should start with "sk-ant-"');
    }

    const systemPrompt = getSystemPrompt(builder);
    const userContent = `Temat: ${topic}\n\nPrompt: ${prompt}`;

    const requestBody = {
        model: options.model || API_CONFIG.anthropicModel,
        max_tokens: options.maxTokens || API_CONFIG.anthropicMaxTokens,
        temperature: options.temperature || 0.7,
        system: systemPrompt,
        messages: [
            {
                role: 'user',
                content: userContent
            }
        ]
    };

    const startTime = Date.now();
    
    try {
        console.log(`🧠 Calling Anthropic Claude API for ${builder}...`);
        
        // Apply rate limiting
        const response = await rateLimiter.execute(async () => {
            return await fetch(`${API_CONFIG.anthropicBaseURL}/v1/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_CONFIG.anthropicApiKey,
                'anthropic-version': '2023-06-01',
                'User-Agent': 'IES-Kitsune/1.0'
            },
            body: JSON.stringify(requestBody)
            });
        });

        // Handle specific Anthropic error codes
        if (response.status === 401) {
            throw new Error('Anthropic API: Unauthorized - Check your API key');
        }
        if (response.status === 402) {
            throw new Error('Anthropic API: Payment required - Check your billing');
        }
        if (response.status === 429) {
            throw new Error('Anthropic API: Rate limit exceeded - Try again later');
        }
        if (response.status === 500) {
            throw new Error('Anthropic API: Server error - Try again later');
        }
        if (response.status === 529) {
            throw new Error('Anthropic API: Overloaded - Try again later');
        }

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Anthropic API error (${response.status}): ${errorData}`);
        }

        const data = await response.json();
        
        // Validate response structure
        if (!data.content || !data.content[0] || !data.content[0].text) {
            throw new Error('Invalid response structure from Anthropic API');
        }

        const content = data.content[0].text;
        const usage = data.usage || {};

        const latency = Date.now() - startTime;
        console.log(`✅ Anthropic API call successful for ${builder}`);
        console.log(`📊 Tokens used: ${usage.output_tokens || 'unknown'}`);

        // Prepare response object
        const result = {
            response: content,
            quality: assessResponseQuality(content),
            confidence: assessResponseConfidence(content),
            provider: 'anthropic',
            model: data.model,
            usage: {
                prompt_tokens: usage.input_tokens || 0,
                completion_tokens: usage.output_tokens || 0,
                total_tokens: (usage.input_tokens || 0) + (usage.output_tokens || 0)
            },
            finishReason: data.stop_reason,
            latency
        };

        // Record metrics
        metricsCollector.recordAPICall('anthropic', data.model, builder, result.usage, latency);
        
        // Cache successful response
        responseCache.set(builder, topic, prompt, result, options);

        return result;

    } catch (error) {
        const latency = Date.now() - startTime;
        console.error(`❌ Anthropic API call failed for ${builder}:`, error.message);
        
        // Record failed metrics
        metricsCollector.recordAPICall('anthropic', options.model || API_CONFIG.anthropicModel, builder, { total_tokens: 0 }, latency, error);
        
        // Re-throw with more context
        if (error.message.includes('fetch')) {
            throw new Error(`Network error calling Anthropic API: ${error.message}`);
        }
        throw error;
    }
}

/**
 * Call Google Gemini API directly
 * @param {string} builder - AI agent role (builder1, builder2, synthesizer, evaluator)
 * @param {string} topic - Problem topic
 * @param {string} prompt - User prompt
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} API response
 */
export async function callGoogle(builder, topic, prompt, options = {}) {
    if (!API_CONFIG.googleApiKey) {
        throw new Error('Google API key not configured. Set GOOGLE_API_KEY in .env file.');
    }

    const systemPrompt = getSystemPrompt(builder);
    const fullContent = `${systemPrompt}\n\nTemat: ${topic}\n\nPrompt: ${prompt}`;

    const requestBody = {
        contents: [
            {
                role: 'user',
                parts: [
                    {
                        text: fullContent
                    }
                ]
            }
        ],
        generationConfig: {
            maxOutputTokens: options.maxTokens || API_CONFIG.googleMaxTokens,
            temperature: options.temperature || 0.7,
            topP: options.topP || 0.8,
            topK: options.topK || 40,
            stopSequences: options.stopSequences || []
        },
        safetySettings: [
            {
                category: 'HARM_CATEGORY_HARASSMENT',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
                category: 'HARM_CATEGORY_HATE_SPEECH',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
                category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
                category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            }
        ]
    };

    try {
        console.log(`🌟 Calling Google Gemini API for ${builder}...`);
        
        const model = options.model || API_CONFIG.googleModel;
        const url = `${API_CONFIG.googleBaseURL}/models/${model}:generateContent?key=${API_CONFIG.googleApiKey}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'IES-Kitsune/1.0'
            },
            body: JSON.stringify(requestBody)
        });

        // Handle specific Google API error codes
        if (response.status === 400) {
            throw new Error('Google API: Bad request - Check your parameters');
        }
        if (response.status === 401) {
            throw new Error('Google API: Unauthorized - Check your API key');
        }
        if (response.status === 403) {
            throw new Error('Google API: Forbidden - Check API is enabled and quota');
        }
        if (response.status === 429) {
            throw new Error('Google API: Rate limit exceeded - Try again later');
        }
        if (response.status === 500) {
            throw new Error('Google API: Server error - Try again later');
        }
        if (response.status === 503) {
            throw new Error('Google API: Service unavailable - Try again later');
        }

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Google API error (${response.status}): ${errorData}`);
        }

        const data = await response.json();
        
        // Handle safety filter blocks
        if (data.candidates && data.candidates[0] && data.candidates[0].finishReason === 'SAFETY') {
            throw new Error('Google API: Content blocked by safety filters');
        }
        
        // Validate response structure
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
            throw new Error('Invalid response structure from Google API');
        }

        const content = data.candidates[0].content.parts[0].text;
        const usage = data.usageMetadata || {};

        console.log(`✅ Google API call successful for ${builder}`);
        console.log(`📊 Tokens used: ${usage.totalTokenCount || 'unknown'}`);

        // Return in format compatible with existing system
        return {
            response: content,
            quality: assessResponseQuality(content),
            confidence: assessResponseConfidence(content),
            provider: 'google',
            model: model,
            usage: {
                prompt_tokens: usage.promptTokenCount || 0,
                completion_tokens: usage.candidatesTokenCount || 0,
                total_tokens: usage.totalTokenCount || 0
            },
            finishReason: data.candidates[0].finishReason
        };

    } catch (error) {
        console.error(`❌ Google API call failed for ${builder}:`, error.message);
        
        // Re-throw with more context
        if (error.message.includes('fetch')) {
            throw new Error(`Network error calling Google API: ${error.message}`);
        }
        throw error;
    }
}

/**
 * Get available AI providers based on configured API keys
 * @returns {Array<string>} Array of available provider names
 */
export function getAvailableProviders() {
    const providers = [];
    
    if (API_CONFIG.openaiApiKey && API_CONFIG.openaiApiKey.startsWith('sk-')) {
        providers.push('openai');
    }
    
    if (API_CONFIG.anthropicApiKey && API_CONFIG.anthropicApiKey.startsWith('sk-ant-')) {
        providers.push('anthropic');
    }
    
    if (API_CONFIG.googleApiKey && API_CONFIG.googleApiKey.length > 10) {
        providers.push('google');
    }
    
    return providers;
}

/**
 * Get the best available provider based on configuration and availability
 * @param {string} preferredProvider - Preferred provider name
 * @returns {string} Best available provider name
 */
export function getBestProvider(preferredProvider = null) {
    const availableProviders = getAvailableProviders();
    
    if (availableProviders.length === 0) {
        return 'mock';
    }
    
    // Use preferred provider if available
    if (preferredProvider && availableProviders.includes(preferredProvider)) {
        return preferredProvider;
    }
    
    // Use configured default provider if available
    if (availableProviders.includes(API_CONFIG.defaultProvider)) {
        return API_CONFIG.defaultProvider;
    }
    
    // Return first available provider
    return availableProviders[0];
}

/**
 * Call AI provider with automatic fallback
 * @param {string} provider - Provider name ('openai', 'anthropic', 'google')
 * @param {string} builder - AI agent role
 * @param {string} topic - Problem topic
 * @param {string} prompt - User prompt
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} API response
 */
export async function callAIProvider(provider, builder, topic, prompt, options = {}) {
    switch (provider) {
        case 'openai':
            return await callOpenAI(builder, topic, prompt, options);
        case 'anthropic':
            return await callAnthropic(builder, topic, prompt, options);
        case 'google':
            return await callGoogle(builder, topic, prompt, options);
        default:
            throw new Error(`Unsupported AI provider: ${provider}`);
    }
}

/**
 * Get system prompt for specific AI builder role
 * @param {string} builder - AI agent role
 * @returns {string} System prompt
 */
function getSystemPrompt(builder) {
    const prompts = {
        builder1: `Jesteś Idea Architect - analizujesz problemy strukturalnie i tworzysz fundamentalne rozwiązania. 
Twoje zadania:
- Przeprowadź dogłębną analizę problemu
- Zidentyfikuj kluczowe komponenty i zależności
- Zaproponuj solidne, strukturalne podejście
- Odpowiadaj konkretnie i analitycznie
- Użyj polskiego języka`,
        
        builder2: `Jesteś Innovation Catalyst - kwestionujesz założenia i proponujesz kreatywne alternatywy.
Twoje zadania:
- Zakwestionuj istniejące założenia
- Zaproponuj innowacyjne, niestandardowe rozwiązania
- Pomyśl "poza schematami"
- Bądź prowokujący i inspirujący
- Użyj polskiego języka`,
        
        synthesizer: `Jesteś Solution Synthesizer - łączysz różne perspektywy w spójne rozwiązania.
Twoje zadania:
- Zintegruj różne podejścia i pomysły
- Znajdź wspólne elementy i synergię
- Stwórz harmonijne, kompleksowe rozwiązanie
- Uwzględnij wszystkie istotne aspekty
- Użyj polskiego języka`,
        
        evaluator: `Jesteś Quality Evaluator - oceniasz wykonalność, ryzyko i wpływ rozwiązań.
Twoje zadania:
- Oceń praktyczność i wykonalność rozwiązań
- Zidentyfikuj potencjalne ryzyska i wyzwania
- Przeanalizuj koszt-korzyść
- Bądź krytyczny ale konstruktywny
- Użyj polskiego języka`
    };
    
    return prompts[builder] || `Jesteś ekspertem AI pomagającym w rozwiązywaniu problemów. Odpowiadaj w języku polskim, bądź konkretny i pomocny.`;
}

/**
 * Assess response quality using heuristics
 * @param {string} content - Response content
 * @returns {number} Quality score (1-10)
 */
function assessResponseQuality(content) {
    if (!content) return 1;
    
    const length = content.length;
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const hasStructure = content.includes('\n') || content.includes('-') || content.includes('1.');
    const hasDetail = length > 100;
    const hasPolish = /[ąćęłńóśźż]/i.test(content);
    
    let quality = 5; // Base quality
    
    // Length factors
    if (length > 200) quality += 0.5;
    if (length > 500) quality += 0.5;
    if (length > 1000) quality += 0.5;
    
    // Structure factors
    if (hasStructure) quality += 1;
    if (sentences > 3) quality += 0.5;
    if (hasDetail) quality += 1;
    
    // Language factors
    if (hasPolish) quality += 0.5;
    
    // Penalty for too short responses
    if (length < 50) quality -= 2;
    
    return Math.max(1, Math.min(10, quality));
}

/**
 * Assess response confidence using heuristics
 * @param {string} content - Response content
 * @returns {number} Confidence score (0-1)
 */
function assessResponseConfidence(content) {
    if (!content) return 0.1;
    
    const certainWords = ['zdecydowanie', 'wyraźnie', 'jednoznacznie', 'pewne', 'definitely', 'clearly'];
    const uncertainWords = ['może', 'prawdopodobnie', 'wydaje się', 'być może', 'possibly', 'perhaps'];
    const questionMarks = (content.match(/\?/g) || []).length;
    
    const certainCount = certainWords.reduce((count, word) => 
        count + (content.toLowerCase().includes(word.toLowerCase()) ? 1 : 0), 0);
    const uncertainCount = uncertainWords.reduce((count, word) => 
        count + (content.toLowerCase().includes(word.toLowerCase()) ? 1 : 0), 0);
    
    let confidence = 0.7; // Base confidence
    
    // Adjust based on language indicators
    confidence += certainCount * 0.1;
    confidence -= uncertainCount * 0.05;
    confidence -= questionMarks * 0.02;
    
    // Adjust based on length (longer responses tend to be more confident)
    if (content.length > 300) confidence += 0.1;
    if (content.length < 100) confidence -= 0.1;
    
    return Math.max(0.1, Math.min(1.0, confidence));
}

/**
 * Main API call function with smart routing and multi-provider fallback
 * @param {string} builder - AI agent role
 * @param {string} topic - Problem topic
 * @param {string} prompt - User prompt
 * @param {Object} circuitBreaker - Circuit breaker instance
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} API response
 */
export async function callAPI(builder, topic, prompt, circuitBreaker, options = {}) {
    if (circuitBreaker.isOpen()) {
        throw new Error('Circuit breaker is open');
    }

    // Check if real AI is enabled
    if (!API_CONFIG.enableRealAI || API_CONFIG.mockMode) {
        console.log(`🎭 Using mock API for ${builder} (real AI disabled)`);
        try {
            const result = await callMockAPI(builder, topic, prompt);
            circuitBreaker.recordSuccess();
            return result;
        } catch (error) {
            circuitBreaker.recordFailure();
            throw error;
        }
    }

    // Get available providers and determine best one
    const availableProviders = getAvailableProviders();
    
    if (availableProviders.length === 0) {
        console.log(`🎭 No AI providers configured, using mock API for ${builder}`);
        try {
            const result = await callMockAPI(builder, topic, prompt);
            circuitBreaker.recordSuccess();
            return result;
        } catch (error) {
            circuitBreaker.recordFailure();
            throw error;
        }
    }

    // Enhanced provider priority with smart OpenAI→Claude fallback
    const preferredProvider = options.provider || getBestProvider();
    let providerOrder;
    
    // If no specific provider preference, prioritize OpenAI→Claude fallback
    if (!options.provider && availableProviders.includes('openai') && availableProviders.includes('anthropic')) {
        providerOrder = ['openai', 'anthropic', ...availableProviders.filter(p => !['openai', 'anthropic'].includes(p))];
        console.log(`🎯 Smart fallback: OpenAI → Claude → Others for ${builder}`);
    } else {
        providerOrder = [preferredProvider, ...availableProviders.filter(p => p !== preferredProvider)];
    }

    console.log(`🔄 Available providers: ${availableProviders.join(', ')}`);
    console.log(`🎯 Provider priority for ${builder}: ${providerOrder.join(' → ')}`);

    let lastError = null;
    let attemptCount = 0;
    
    // Try each provider in order with enhanced fallback logic
    for (const provider of providerOrder) {
        attemptCount++;
        try {
            console.log(`🚀 Attempting ${provider} API for ${builder} (attempt ${attemptCount}/${providerOrder.length})...`);
            
            // Add slight delay between provider attempts to avoid hammering
            if (attemptCount > 1) {
                const delay = Math.min(1000 * (attemptCount - 1), 3000); // Max 3 second delay
                console.log(`⏱️ Waiting ${delay}ms before trying ${provider}...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
            
            const result = await callAIProvider(provider, builder, topic, prompt, options);
            circuitBreaker.recordSuccess();
            
            // Log successful fallback
            if (attemptCount > 1) {
                console.log(`✅ Successful fallback to ${provider} for ${builder} after ${attemptCount - 1} failed attempts`);
                result.fallbackUsed = true;
                result.fallbackProvider = provider;
                result.attemptNumber = attemptCount;
            }
            
            return result;
        } catch (error) {
            lastError = error;
            console.warn(`⚠️  ${provider} API failed for ${builder}: ${error.message}`);
            
            // Enhanced error categorization
            const isAuthError = error.message.includes('Unauthorized') || error.message.includes('API key');
            const isBillingError = error.message.includes('Payment required') || error.message.includes('quota') || error.message.includes('billing');
            const isRateLimitError = error.message.includes('Rate limit exceeded') || error.message.includes('429');
            const isServerError = error.message.includes('Server error') || error.message.includes('Service unavailable');
            
            // Skip provider on permanent errors
            if (isAuthError || isBillingError) {
                console.log(`❌ Skipping ${provider} due to account issue: ${error.message}`);
                continue;
            }
            
            // Special handling for rate limits - might be temporary
            if (isRateLimitError) {
                console.log(`⏱️ ${provider} rate limited, trying next provider...`);
                continue;
            }
            
            // Server errors - try next provider
            if (isServerError) {
                console.log(`🔧 ${provider} server issue, trying next provider...`);
                continue;
            }
            
            // For other errors, continue to next provider
            console.log(`🔄 Network/other error with ${provider}, trying next provider...`);
        }
    }

    // All providers failed, record failure and try mock as last resort
    circuitBreaker.recordFailure();
    console.error(`❌ All AI providers failed for ${builder}`);
    
    try {
        console.log(`🆘 Last resort: falling back to mock API for ${builder}`);
        const result = await callMockAPI(builder, topic, prompt);
        
        // Add warning to response
        result.warning = 'All AI providers failed, using mock response';
        result.fallback = true;
        
        return result;
    } catch (mockError) {
        console.error(`💥 Even mock API failed for ${builder}:`, mockError.message);
        throw new Error(`All API calls failed. Last error: ${lastError?.message || 'Unknown error'}`);
    }
}

/**
 * Advanced API call with provider rotation and retry logic
 * @param {string} builder - AI agent role
 * @param {string} topic - Problem topic
 * @param {string} prompt - User prompt
 * @param {Object} circuitBreaker - Circuit breaker instance
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} API response
 */
export async function callAPIWithRetry(builder, topic, prompt, circuitBreaker, options = {}) {
    const maxRetries = options.maxRetries || 3;
    const retryDelay = options.retryDelay || 1000;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await callAPI(builder, topic, prompt, circuitBreaker, options);
        } catch (error) {
            if (attempt === maxRetries) {
                throw error;
            }
            
            console.log(`🔄 Retry ${attempt}/${maxRetries} for ${builder} in ${retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        }
    }
}

/**
 * Get API status and provider information
 * @returns {Object} API status information
 */
export function getAPIStatus() {
    const availableProviders = getAvailableProviders();
    const bestProvider = getBestProvider();
    
    return {
        realAIEnabled: API_CONFIG.enableRealAI,
        mockMode: API_CONFIG.mockMode,
        availableProviders,
        bestProvider,
        defaultProvider: API_CONFIG.defaultProvider,
        providerConfigs: {
            openai: {
                configured: !!API_CONFIG.openaiApiKey,
                model: API_CONFIG.openaiModel,
                maxTokens: API_CONFIG.openaiMaxTokens
            },
            anthropic: {
                configured: !!API_CONFIG.anthropicApiKey,
                model: API_CONFIG.anthropicModel,
                maxTokens: API_CONFIG.anthropicMaxTokens
            },
            google: {
                configured: !!API_CONFIG.googleApiKey,
                model: API_CONFIG.googleModel,
                maxTokens: API_CONFIG.googleMaxTokens
            }
        }
    };
}

/**
 * Mock API call for fallback or testing
 * @param {string} builder - AI agent role
 * @param {string} topic - Problem topic
 * @param {string} prompt - User prompt
 * @returns {Promise<Object>} Mock response
 */
async function callMockAPI(builder, topic, prompt) {
    const response = await fetch('/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ builder, topic, prompt })
    });
    
    if (response.status === 429) {
        throw new Error('Rate limit exceeded');
    }
    if (!response.ok) {
        throw new Error(`Mock API error: ${response.status}`);
    }
    
    return await response.json();
}
