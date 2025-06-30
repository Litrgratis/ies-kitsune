import appConfig, { getAvailableProviders } from './config.js';

/**
 * AI Service Provider for integrating with real AI APIs
 * Supports OpenAI, Anthropic (Claude), and Google (Gemini)
 */
export class AIService {
  constructor() {
    this.providers = getAvailableProviders();
    this.currentProvider = appConfig.api.defaultProvider;
    
    // Fallback to first available provider if default not available
    if (!this.providers.includes(this.currentProvider) && this.providers.length > 0) {
      this.currentProvider = this.providers[0];
    }
  }

  /**
   * Call OpenAI API
   */
  async callOpenAI(messages, options = {}) {
    if (!appConfig.openai.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch(`${appConfig.openai.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${appConfig.openai.apiKey}`
      },
      body: JSON.stringify({
        model: options.model || appConfig.openai.model,
        messages,
        max_tokens: options.maxTokens || appConfig.openai.maxTokens,
        temperature: options.temperature || 0.7,
        ...options
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${error}`);
    }

    return await response.json();
  }

  /**
   * Call Anthropic (Claude) API
   */
  async callAnthropic(messages, options = {}) {
    if (!appConfig.anthropic.apiKey) {
      throw new Error('Anthropic API key not configured');
    }

    // Convert OpenAI format to Anthropic format
    const systemMessage = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');

    const response = await fetch(`${appConfig.anthropic.baseURL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': appConfig.anthropic.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: options.model || appConfig.anthropic.model,
        max_tokens: options.maxTokens || appConfig.anthropic.maxTokens,
        temperature: options.temperature || 0.7,
        system: systemMessage?.content || '',
        messages: userMessages,
        ...options
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${error}`);
    }

    const result = await response.json();
    
    // Convert Anthropic format to OpenAI format for consistency
    return {
      choices: [{
        message: {
          role: 'assistant',
          content: result.content[0]?.text || ''
        },
        finish_reason: result.stop_reason
      }],
      usage: result.usage
    };
  }

  /**
   * Call Google (Gemini) API
   */
  async callGoogle(messages, options = {}) {
    if (!appConfig.google.apiKey) {
      throw new Error('Google API key not configured');
    }

    // Convert messages to Gemini format
    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : msg.role,
      parts: [{ text: msg.content }]
    }));

    const response = await fetch(
      `${appConfig.google.baseURL}/models/${options.model || appConfig.google.model}:generateContent?key=${appConfig.google.apiKey}`, 
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            maxOutputTokens: options.maxTokens || appConfig.google.maxTokens,
            temperature: options.temperature || 0.7,
            ...options.generationConfig
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google API error (${response.status}): ${error}`);
    }

    const result = await response.json();
    
    // Convert Google format to OpenAI format for consistency
    return {
      choices: [{
        message: {
          role: 'assistant',
          content: result.candidates?.[0]?.content?.parts?.[0]?.text || ''
        },
        finish_reason: result.candidates?.[0]?.finishReason
      }],
      usage: result.usageMetadata
    };
  }

  /**
   * Generate AI response using available provider
   */
  async generateResponse(builder, topic, prompt, options = {}) {
    const messages = [
      {
        role: 'system',
        content: this.getSystemPrompt(builder)
      },
      {
        role: 'user',
        content: `Temat: ${topic}\n\nPrompt: ${prompt}`
      }
    ];

    try {
      let response;
      
      switch (this.currentProvider) {
        case 'openai':
          response = await this.callOpenAI(messages, options);
          break;
        case 'anthropic':
          response = await this.callAnthropic(messages, options);
          break;
        case 'google':
          response = await this.callGoogle(messages, options);
          break;
        default:
          throw new Error(`Unsupported AI provider: ${this.currentProvider}`);
      }

      const content = response.choices?.[0]?.message?.content || '';
      
      return {
        response: content,
        quality: this.assessQuality(content),
        confidence: this.assessConfidence(content),
        provider: this.currentProvider,
        usage: response.usage
      };
      
    } catch (error) {
      console.error(`Error with ${this.currentProvider}:`, error.message);
      
      // Try fallback to next available provider
      const nextProvider = this.getNextProvider();
      if (nextProvider && nextProvider !== this.currentProvider) {
        console.log(`Falling back to ${nextProvider}`);
        this.currentProvider = nextProvider;
        return this.generateResponse(builder, topic, prompt, options);
      }
      
      throw error;
    }
  }

  /**
   * Get system prompt for specific builder role
   */
  getSystemPrompt(builder) {
    const prompts = {
      builder1: "Jesteś Idea Architect - analizujesz problemy strukturalnie i tworzysz fundamentalne rozwiązania. Odpowiadaj konkretnie i analitycznie.",
      builder2: "Jesteś Innovation Catalyst - kwestionujesz założenia i proponujesz kreatywne alternatywy. Bądź innowacyjny i prowokujący.",
      synthesizer: "Jesteś Solution Synthesizer - łączysz różne perspektywy w spójne rozwiązania. Integruj i harmonizuj różne podejścia.",
      evaluator: "Jesteś Quality Evaluator - oceniasz wykonalność, ryzyko i wpływ rozwiązań. Bądź krytyczny i praktyczny."
    };
    
    return prompts[builder] || "Jesteś ekspertem AI pomagającym w rozwiązywaniu problemów.";
  }

  /**
   * Assess response quality (simple heuristic)
   */
  assessQuality(content) {
    if (!content) return 1;
    
    const length = content.length;
    const hasStructure = content.includes('.') || content.includes(',');
    const hasDetail = length > 100;
    
    let quality = 5; // Base quality
    if (hasStructure) quality += 1;
    if (hasDetail) quality += 1;
    if (length > 200) quality += 0.5;
    if (length > 500) quality += 0.5;
    
    return Math.min(quality, 10);
  }

  /**
   * Assess response confidence (simple heuristic)
   */
  assessConfidence(content) {
    if (!content) return 0.1;
    
    const certainWords = ['definitely', 'certainly', 'clearly', 'obviously', 'zdecydowanie', 'wyraźnie'];
    const uncertainWords = ['maybe', 'perhaps', 'possibly', 'might', 'może', 'prawdopodobnie'];
    
    const certainCount = certainWords.reduce((count, word) => 
      count + (content.toLowerCase().includes(word) ? 1 : 0), 0);
    const uncertainCount = uncertainWords.reduce((count, word) => 
      count + (content.toLowerCase().includes(word) ? 1 : 0), 0);
    
    let confidence = 0.7; // Base confidence
    confidence += certainCount * 0.1;
    confidence -= uncertainCount * 0.05;
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
   * Get next available provider for fallback
   */
  getNextProvider() {
    const currentIndex = this.providers.indexOf(this.currentProvider);
    const nextIndex = (currentIndex + 1) % this.providers.length;
    return this.providers[nextIndex];
  }

  /**
   * Get current provider status
   */
  getStatus() {
    return {
      currentProvider: this.currentProvider,
      availableProviders: this.providers,
      isConfigured: this.providers.length > 0
    };
  }
}

export default AIService;
