// Configuration constants for TF-IDF analysis
const TFIDF_CONFIG = {
    SYNONYMS: {
        "carbon tax": ["carbon pricing", "emission tax"],
        "gamification": ["point system", "reward scheme"]
    },
    STOPWORDS: [
        "emission", "carbon", "co2", "reduce", "climate", 
        "environmental", "system", "solution", "approach", 
        "method", "strategy", "implementation"
    ],
    WEIGHTS: {
        "carbon tax": 2.0, 
        "renewable energy": 1.8, 
        "gamification": 1.5, 
        "AI monitoring": 1.8
    },
    MIN_WORD_LENGTH: 2
};

/**
 * Validates input for TF-IDF computation
 * @param {Array} texts - Array of text strings to analyze
 * @throws {Error} If input is invalid
 */
function validateTFIDFInput(texts) {
    if (!Array.isArray(texts)) {
        throw new Error('Input must be an array of texts');
    }
    if (texts.length === 0) {
        throw new Error('Input array cannot be empty');
    }
    if (texts.some(text => typeof text !== 'string')) {
        throw new Error('All elements must be strings');
    }
}

/**
 * Processes text by applying synonym replacement and cleaning
 * @param {string} text - Text to process
 * @returns {Array} Array of filtered words
 */
function preprocessText(text) {
    let processedText = text;
    
    // Apply synonym replacement
    Object.keys(TFIDF_CONFIG.SYNONYMS).forEach(key => {
        TFIDF_CONFIG.SYNONYMS[key].forEach(synonym => {
            if (synonym.split(' ').length > 1) {
                const regex = new RegExp(`\\b${synonym}\\b`, 'gi');
                processedText = processedText.replace(regex, `${key} (${synonym})`);
            }
        });
    });
    
    // Clean and tokenize text
    return processedText
        .toLowerCase()
        .replace(/[.,!?]/g, '')
        .split(/\s+/)
        .filter(word => 
            word.length > TFIDF_CONFIG.MIN_WORD_LENGTH && 
            !TFIDF_CONFIG.STOPWORDS.includes(word)
        );
}

/**
 * Calculates term frequency for a document
 * @param {Array} words - Array of words in the document
 * @returns {Object} Term frequency object
 */
function calculateTermFrequency(words) {
    if (words.length === 0) return {};
    
    const frequency = {};
    words.forEach(word => {
        frequency[word] = (frequency[word] || 0) + 1;
    });
    
    // Apply weights and normalize by document length
    Object.keys(frequency).forEach(word => {
        const weight = TFIDF_CONFIG.WEIGHTS[word] || 1.0;
        frequency[word] = (frequency[word] / words.length) * weight;
    });
    
    return frequency;
}

/**
 * Calculates document frequency for all terms
 * @param {Array} processedTexts - Array of processed text arrays
 * @returns {Object} Document frequency object
 */
function calculateDocumentFrequency(processedTexts) {
    const documentFreq = {};
    
    processedTexts.forEach(words => {
        const uniqueWords = new Set(words);
        uniqueWords.forEach(word => {
            documentFreq[word] = (documentFreq[word] || 0) + 1;
        });
    });
    
    return documentFreq;
}

/**
 * Calculates cosine similarity between two TF-IDF vectors
 * @param {Object} vector1 - First TF-IDF vector
 * @param {Object} vector2 - Second TF-IDF vector
 * @returns {number} Cosine similarity score (0-1)
 */
function calculateCosineSimilarity(vector1, vector2) {
    const allKeys = new Set([...Object.keys(vector1), ...Object.keys(vector2)]);
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    allKeys.forEach(key => {
        const val1 = vector1[key] || 0;
        const val2 = vector2[key] || 0;
        
        dotProduct += val1 * val2;
        norm1 += val1 ** 2;
        norm2 += val2 ** 2;
    });
    
    const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
    return denominator > 0 ? dotProduct / denominator : 0;
}

/**
 * Computes average TF-IDF similarity score for a collection of texts
 * @param {Array} texts - Array of text strings to analyze
 * @returns {number} Average similarity score between all text pairs
 * @throws {Error} If input validation fails
 */
export function computeTFIDF(texts) {
    try {
        // Validate input
        validateTFIDFInput(texts);
        
        // Handle single text case
        if (texts.length === 1) {
            return 0;
        }
        
        // Preprocess all texts
        const processedTexts = texts.map(preprocessText);
        
        // Calculate term frequencies
        const termFrequencies = processedTexts.map(calculateTermFrequency);
        
        // Calculate document frequencies
        const documentFreq = calculateDocumentFrequency(processedTexts);
        
        // Calculate TF-IDF vectors
        const tfidfVectors = termFrequencies.map(termFreq => {
            const vector = {};
            Object.keys(termFreq).forEach(word => {
                const idf = Math.log(texts.length / (documentFreq[word] || 1));
                vector[word] = termFreq[word] * idf;
            });
            return vector;
        });
        
        // Calculate average similarity between all pairs
        let totalSimilarity = 0;
        let pairCount = 0;
        
        for (let i = 0; i < tfidfVectors.length; i++) {
            for (let j = i + 1; j < tfidfVectors.length; j++) {
                totalSimilarity += calculateCosineSimilarity(tfidfVectors[i], tfidfVectors[j]);
                pairCount++;
            }
        }
        
        return pairCount > 0 ? totalSimilarity / pairCount : 0;
        
    } catch (error) {
        console.error('Error in TF-IDF computation:', error.message);
        throw error;
    }
}

/**
 * Utility function to get TF-IDF configuration (for testing or customization)
 * @returns {Object} Current TF-IDF configuration
 */
export function getTFIDFConfig() {
    return { ...TFIDF_CONFIG };
}

/**
 * Utility function to update TF-IDF configuration
 * @param {Object} newConfig - Partial configuration to merge
 */
export function updateTFIDFConfig(newConfig) {
    if (newConfig.SYNONYMS) {
        Object.assign(TFIDF_CONFIG.SYNONYMS, newConfig.SYNONYMS);
    }
    if (newConfig.STOPWORDS) {
        TFIDF_CONFIG.STOPWORDS = [...new Set([...TFIDF_CONFIG.STOPWORDS, ...newConfig.STOPWORDS])];
    }
    if (newConfig.WEIGHTS) {
        Object.assign(TFIDF_CONFIG.WEIGHTS, newConfig.WEIGHTS);
    }
    if (typeof newConfig.MIN_WORD_LENGTH === 'number') {
        TFIDF_CONFIG.MIN_WORD_LENGTH = newConfig.MIN_WORD_LENGTH;
    }
}
