/**
 * EmbeddingSimilarity - A class for computing text similarity using AI embeddings
 */
class EmbeddingSimilarity {
    /**
     * Creates a new EmbeddingSimilarity instance
     * @param {object} config - Configuration object
     * @param {string} config.provider - Embedding provider ('openai', 'huggingface', 'cohere', 'local')
     * @param {string} config.apiKey - API key for the provider
     * @param {string} config.model - Model name (e.g., 'text-embedding-ada-002')
     * @param {string} config.baseUrl - Base URL for API calls
     */
    constructor(config = {}) {
        this.provider = config.provider || 'openai';
        this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
        this.model = config.model || this._getDefaultModel();
        this.baseUrl = config.baseUrl || this._getDefaultBaseUrl();
        this.cache = new Map(); // Cache for embeddings
        this.maxCacheSize = config.maxCacheSize || 1000;
    }

    /**
     * Get default model for the provider
     * @private
     * @returns {string} Default model name
     */
    _getDefaultModel() {
        const defaultModels = {
            'openai': 'text-embedding-ada-002',
            'huggingface': 'sentence-transformers/all-MiniLM-L6-v2',
            'cohere': 'embed-english-v2.0',
            'local': 'all-MiniLM-L6-v2'
        };
        return defaultModels[this.provider] || 'text-embedding-ada-002';
    }

    /**
     * Get default base URL for the provider
     * @private
     * @returns {string} Default base URL
     */
    _getDefaultBaseUrl() {
        const defaultUrls = {
            'openai': 'https://api.openai.com/v1',
            'huggingface': 'https://api-inference.huggingface.co',
            'cohere': 'https://api.cohere.ai/v1',
            'local': 'http://localhost:8080'
        };
        return defaultUrls[this.provider] || 'https://api.openai.com/v1';
    }

    /**
     * Generate embedding for a single text
     * @param {string} text - Text to embed
     * @returns {Promise<number[]>} Embedding vector
     */
    async getEmbedding(text) {
        if (!text || typeof text !== 'string') {
            throw new Error('Text must be a non-empty string');
        }

        const cleanText = text.trim();
        if (cleanText.length === 0) {
            throw new Error('Text cannot be empty after trimming');
        }

        // Check cache first
        const cacheKey = `${this.provider}:${this.model}:${cleanText}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            let embedding;
            switch (this.provider) {
                case 'openai':
                    embedding = await this._getOpenAIEmbedding(cleanText);
                    break;
                case 'huggingface':
                    embedding = await this._getHuggingFaceEmbedding(cleanText);
                    break;
                case 'cohere':
                    embedding = await this._getCohereEmbedding(cleanText);
                    break;
                case 'local':
                    embedding = await this._getLocalEmbedding(cleanText);
                    break;
                default:
                    throw new Error(`Unsupported provider: ${this.provider}`);
            }

            // Cache the result
            this._addToCache(cacheKey, embedding);
            return embedding;

        } catch (error) {
            throw new Error(`Failed to get embedding: ${error.message}`);
        }
    }

    /**
     * Generate embeddings for multiple texts
     * @param {string[]} texts - Array of texts to embed
     * @returns {Promise<number[][]>} Array of embedding vectors
     */
    async getEmbeddings(texts) {
        if (!Array.isArray(texts)) {
            throw new Error('Texts must be an array');
        }

        const embeddings = await Promise.all(
            texts.map(text => this.getEmbedding(text))
        );
        return embeddings;
    }

    /**
     * Calculate cosine similarity between two embeddings
     * @param {number[]} embedding1 - First embedding vector
     * @param {number[]} embedding2 - Second embedding vector
     * @returns {number} Cosine similarity (-1 to 1)
     */
    cosineSimilarity(embedding1, embedding2) {
        if (!Array.isArray(embedding1) || !Array.isArray(embedding2)) {
            throw new Error('Embeddings must be arrays');
        }
        if (embedding1.length !== embedding2.length) {
            throw new Error('Embeddings must have the same length');
        }

        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;

        for (let i = 0; i < embedding1.length; i++) {
            dotProduct += embedding1[i] * embedding2[i];
            norm1 += embedding1[i] * embedding1[i];
            norm2 += embedding2[i] * embedding2[i];
        }

        const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
        return magnitude === 0 ? 0 : dotProduct / magnitude;
    }

    /**
     * Calculate similarity between two texts
     * @param {string} text1 - First text
     * @param {string} text2 - Second text
     * @returns {Promise<number>} Similarity score (0 to 1)
     */
    async calculateSimilarity(text1, text2) {
        const [embedding1, embedding2] = await Promise.all([
            this.getEmbedding(text1),
            this.getEmbedding(text2)
        ]);

        const similarity = this.cosineSimilarity(embedding1, embedding2);
        // Convert from [-1, 1] to [0, 1] range
        return (similarity + 1) / 2;
    }

    /**
     * Find most similar texts from a collection
     * @param {string} queryText - Text to find similarities for
     * @param {string[]} textCollection - Collection of texts to search
     * @param {number} topK - Number of top results to return
     * @returns {Promise<Array>} Array of {text, similarity, index} objects
     */
    async findMostSimilar(queryText, textCollection, topK = 5) {
        if (!Array.isArray(textCollection)) {
            throw new Error('Text collection must be an array');
        }

        const queryEmbedding = await this.getEmbedding(queryText);
        const collectionEmbeddings = await this.getEmbeddings(textCollection);

        const similarities = collectionEmbeddings.map((embedding, index) => ({
            text: textCollection[index],
            similarity: (this.cosineSimilarity(queryEmbedding, embedding) + 1) / 2,
            index
        }));

        // Sort by similarity (descending) and return top K
        return similarities
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, topK);
    }

    /**
     * OpenAI embedding implementation
     * @private
     */
    async _getOpenAIEmbedding(text) {
        const response = await fetch(`${this.baseUrl}/embeddings`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                input: text,
                model: this.model
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.data[0].embedding;
    }

    /**
     * Hugging Face embedding implementation
     * @private
     */
    async _getHuggingFaceEmbedding(text) {
        const response = await fetch(`${this.baseUrl}/models/${this.model}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inputs: text,
                options: { wait_for_model: true }
            })
        });

        if (!response.ok) {
            throw new Error(`Hugging Face API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return Array.isArray(data) ? data : data.embeddings || data[0];
    }

    /**
     * Cohere embedding implementation
     * @private
     */
    async _getCohereEmbedding(text) {
        const response = await fetch(`${this.baseUrl}/embed`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                texts: [text],
                model: this.model
            })
        });

        if (!response.ok) {
            throw new Error(`Cohere API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.embeddings[0];
    }

    /**
     * Local embedding implementation (assuming a local embedding server)
     * @private
     */
    async _getLocalEmbedding(text) {
        const response = await fetch(`${this.baseUrl}/embeddings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                model: this.model
            })
        });

        if (!response.ok) {
            throw new Error(`Local API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.embedding || data.embeddings || data;
    }

    /**
     * Add embedding to cache with size management
     * @private
     */
    _addToCache(key, embedding) {
        if (this.cache.size >= this.maxCacheSize) {
            // Remove oldest entry (FIFO)
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, embedding);
    }

    /**
     * Clear the embedding cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     * @returns {object} Cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxCacheSize,
            hitRate: this.cacheHits / (this.cacheHits + this.cacheMisses) || 0
        };
    }

    /**
     * Batch similarity calculation for efficiency
     * @param {string[]} texts1 - First set of texts
     * @param {string[]} texts2 - Second set of texts
     * @returns {Promise<number[][]>} Matrix of similarity scores
     */
    async batchSimilarity(texts1, texts2) {
        const [embeddings1, embeddings2] = await Promise.all([
            this.getEmbeddings(texts1),
            this.getEmbeddings(texts2)
        ]);

        const similarityMatrix = [];
        for (let i = 0; i < embeddings1.length; i++) {
            const row = [];
            for (let j = 0; j < embeddings2.length; j++) {
                const similarity = this.cosineSimilarity(embeddings1[i], embeddings2[j]);
                row.push((similarity + 1) / 2); // Convert to 0-1 range
            }
            similarityMatrix.push(row);
        }

        return similarityMatrix;
    }
}

module.exports = EmbeddingSimilarity;
