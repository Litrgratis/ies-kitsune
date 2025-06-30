const EmbeddingSimilarity = require('./EmbeddingSimilarity');

/**
 * Example: Migration from TF-IDF to Embedding-based similarity
 */

// Configuration for different providers
const configs = {
    // OpenAI (requires API key)
    openai: {
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY, // Set your API key
        model: 'text-embedding-ada-002'
    },
    
    // Hugging Face (free tier available)
    huggingface: {
        provider: 'huggingface',
        apiKey: process.env.HUGGINGFACE_API_KEY,
        model: 'sentence-transformers/all-MiniLM-L6-v2'
    },
    
    // Local embedding server (free, self-hosted)
    local: {
        provider: 'local',
        baseUrl: 'http://localhost:8080',
        model: 'all-MiniLM-L6-v2'
    }
};

async function demonstrateBasicUsage() {
    console.log('\n=== Basic Embedding Similarity Demo ===\n');
    
    // Initialize with OpenAI (change to 'huggingface' or 'local' as needed)
    const similarity = new EmbeddingSimilarity(configs.openai);
    
    const text1 = "The cat sat on the mat";
    const text2 = "A feline rested on the rug";
    const text3 = "Machine learning is fascinating";
    
    try {
        // Calculate similarity between two texts
        const score1 = await similarity.calculateSimilarity(text1, text2);
        const score2 = await similarity.calculateSimilarity(text1, text3);
        
        console.log(`Similarity between "${text1}" and "${text2}": ${score1.toFixed(3)}`);
        console.log(`Similarity between "${text1}" and "${text3}": ${score2.toFixed(3)}`);
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

async function demonstrateTextSearch() {
    console.log('\n=== Text Search Demo ===\n');
    
    const similarity = new EmbeddingSimilarity(configs.openai);
    
    const documents = [
        "JavaScript is a programming language for web development",
        "Python is great for data science and machine learning",
        "React is a JavaScript library for building user interfaces",
        "Node.js allows JavaScript to run on the server side",
        "Machine learning algorithms can predict future trends",
        "Web development involves HTML, CSS, and JavaScript",
        "Data visualization helps understand complex datasets"
    ];
    
    const query = "frontend web programming";
    
    try {
        const results = await similarity.findMostSimilar(query, documents, 3);
        
        console.log(`Query: "${query}"\n`);
        console.log('Top 3 most similar documents:');
        results.forEach((result, index) => {
            console.log(`${index + 1}. ${result.text}`);
            console.log(`   Similarity: ${result.similarity.toFixed(3)}\n`);
        });
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

async function compareBatchProcessing() {
    console.log('\n=== Batch Processing Demo ===\n');
    
    const similarity = new EmbeddingSimilarity(configs.openai);
    
    const sourceTexts = [
        "Natural language processing",
        "Computer vision algorithms"
    ];
    
    const targetTexts = [
        "Text analysis and understanding",
        "Image recognition technology", 
        "Speech recognition systems",
        "Pattern recognition in images"
    ];
    
    try {
        const similarityMatrix = await similarity.batchSimilarity(sourceTexts, targetTexts);
        
        console.log('Similarity Matrix:');
        console.log('Sources vs Targets\n');
        
        sourceTexts.forEach((source, i) => {
            console.log(`"${source}":`);
            targetTexts.forEach((target, j) => {
                console.log(`  vs "${target}": ${similarityMatrix[i][j].toFixed(3)}`);
            });
            console.log();
        });
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Migration helper class for replacing TF-IDF
class MigratedTextSimilarity {
    constructor(provider = 'openai') {
        this.embeddingSimilarity = new EmbeddingSimilarity(configs[provider]);
    }
    
    // Old TF-IDF method signature (now using embeddings)
    async calculateSimilarity(text1, text2) {
        return await this.embeddingSimilarity.calculateSimilarity(text1, text2);
    }
    
    // Old TF-IDF method signature for document search
    async findSimilarDocuments(query, documents, maxResults = 5) {
        return await this.embeddingSimilarity.findMostSimilar(query, documents, maxResults);
    }
    
    // Performance comparison method
    async compareWithTFIDF(text1, text2) {
        const embeddingScore = await this.embeddingSimilarity.calculateSimilarity(text1, text2);
        
        // Simulated TF-IDF score (replace with your actual TF-IDF implementation)
        const tfidfScore = this.simulatedTFIDFSimilarity(text1, text2);
        
        return {
            embedding: embeddingScore,
            tfidf: tfidfScore,
            difference: Math.abs(embeddingScore - tfidfScore)
        };
    }
    
    // Simulated TF-IDF for comparison (replace with your actual implementation)
    simulatedTFIDFSimilarity(text1, text2) {
        const words1 = text1.toLowerCase().split(/\W+/).filter(w => w.length > 0);
        const words2 = text2.toLowerCase().split(/\W+/).filter(w => w.length > 0);
        
        const intersection = words1.filter(word => words2.includes(word));
        const union = [...new Set([...words1, ...words2])];
        
        return intersection.length / union.length; // Jaccard similarity
    }
}

async function demonstrateMigration() {
    console.log('\n=== Migration from TF-IDF Demo ===\n');
    
    const migrated = new MigratedTextSimilarity('openai');
    
    const pairs = [
        ["The quick brown fox", "A fast brown fox"],
        ["Machine learning models", "AI algorithms and models"],
        ["Web development tools", "Frontend programming frameworks"]
    ];
    
    try {
        for (const [text1, text2] of pairs) {
            const comparison = await migrated.compareWithTFIDF(text1, text2);
            
            console.log(`"${text1}" vs "${text2}"`);
            console.log(`  Embedding similarity: ${comparison.embedding.toFixed(3)}`);
            console.log(`  TF-IDF similarity:    ${comparison.tfidf.toFixed(3)}`);
            console.log(`  Difference:           ${comparison.difference.toFixed(3)}\n`);
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Local embedding server setup example
function setupLocalEmbeddingServer() {
    console.log('\n=== Local Embedding Server Setup ===\n');
    console.log('To run a local embedding server, you can use:');
    console.log('1. Ollama with embedding models:');
    console.log('   ollama pull nomic-embed-text');
    console.log('   ollama serve');
    console.log('');
    console.log('2. HuggingFace Transformers with FastAPI:');
    console.log('   pip install transformers sentence-transformers fastapi uvicorn');
    console.log('   # Then create a simple FastAPI server');
    console.log('');
    console.log('3. Sentence Transformers directly:');
    console.log('   pip install sentence-transformers');
    console.log('   # Use their REST API or create your own');
}

// Run demonstrations
async function runAll() {
    try {
        await demonstrateBasicUsage();
        await demonstrateTextSearch();
        await compareBatchProcessing();
        await demonstrateMigration();
        setupLocalEmbeddingServer();
        
    } catch (error) {
        console.error('Demo error:', error.message);
        console.log('\nNote: Make sure to set your API keys in environment variables:');
        console.log('- OPENAI_API_KEY for OpenAI');
        console.log('- HUGGINGFACE_API_KEY for Hugging Face');
        console.log('- Or use the local provider option');
    }
}

// Export for use in other modules
module.exports = {
    EmbeddingSimilarity,
    MigratedTextSimilarity,
    configs,
    runAll
};

// Run if called directly
if (require.main === module) {
    runAll();
}
