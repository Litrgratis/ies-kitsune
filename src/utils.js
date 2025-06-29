export function computeTFIDF(texts) {
    const SYNONYMS = {
        "carbon tax": ["carbon pricing", "emission tax"],
        "gamification": ["point system", "reward scheme"]
    };
    const stopwords = ["emission", "carbon", "co2", "reduce", "climate", "environmental", "system", "solution", "approach", "method", "strategy", "implementation"];
    const weights = { "carbon tax": 2.0, "renewable energy": 1.8, "gamification": 1.5, "AI monitoring": 1.8 };
    // Reszta funkcji computeTFIDF z <xaiArtifact>...
}