export function computeTFIDF(texts) {
    const SYNONYMS = {
        "carbon tax": ["carbon pricing", "emission tax"],
        "gamification": ["point system", "reward scheme"]
    };
    const stopwords = ["emission", "carbon", "co2", "reduce", "climate", "environmental", "system", "solution", "approach", "method", "strategy", "implementation"];
    const weights = { "carbon tax": 2.0, "renewable energy": 1.8, "gamification": 1.5, "AI monitoring": 1.8 };
    texts = texts.map(text => {
        Object.keys(SYNONYMS).forEach(key => {
            SYNONYMS[key].forEach(syn => {
                if (syn.split(' ').length > 1) {
                    text = text.replace(new RegExp(`\\b${syn}\\b`, 'gi'), `${key} (${syn})`);
                }
            });
        });
        return text.toLowerCase().replace(/[.,!?]/g, '').split(/\s+/).filter(word => word.length > 2 && !stopwords.includes(word));
    });
    const termFreq = texts.map(words => {
        const freq = {};
        words.forEach(word => {
            freq[word] = (freq[word] || 0) + 1;
        });
        Object.keys(freq).forEach(word => {
            freq[word] = (freq[word] / words.length) * (weights[word] || 1.0);
        });
        return freq;
    });
    const docFreq = {};
    texts.forEach(words => {
        new Set(words).forEach(word => {
            docFreq[word] = (docFreq[word] || 0) + 1;
        });
    });
    const tfidf = termFreq.map(freq => {
        const vector = {};
        Object.keys(freq).forEach(word => {
            vector[word] = freq[word] * Math.log(texts.length / (docFreq[word] || 1));
        });
        return vector;
    });
    const similarity = (v1, v2) => {
        const keys = new Set([...Object.keys(v1), ...Object.keys(v2)]);
        let dot = 0, norm1 = 0, norm2 = 0;
        keys.forEach(key => {
            dot += (v1[key] || 0) * (v2[key] || 0);
            norm1 += (v1[key] || 0) ** 2;
            norm2 += (v2[key] || 0) ** 2;
        });
        return dot / (Math.sqrt(norm1) * Math.sqrt(norm2) || 1);
    };
    let totalSimilarity = 0, pairs = 0;
    for (let i = 0; i < tfidf.length; i++) {
        for (let j = i + 1; j < tfidf.length; j++) {
            totalSimilarity += similarity(tfidf[i], tfidf[j]);
            pairs++;
        }
    }
    return pairs ? totalSimilarity / pairs : 0;
}