/**
 * Advanced AI Engine - Enhanced Problem Solving with Dynamic Consensus
 * Implementuje zaawansowane algorytmy do oceny jakości i konsensusu
 */

import { computeTFIDF } from './utils.js';
import { apiCircuitBreaker } from './circuit_breaker.js';
import { callAPI, callAPIWithRetry, getAPIStatus } from './api.js';
import { responseCache } from './cache.js';
import { metricsCollector } from './metrics.js';

export class AdvancedAIEngine {
    constructor(options = {}) {
        this.minConsensusThreshold = options.minConsensus || 0.75;
        this.maxConsensusThreshold = options.maxConsensus || 0.90;
        this.qualityThreshold = options.qualityThreshold || 7.0;
        this.maxIterations = options.maxIterations || 10;
        
        this.roles = {
            architect: {
                name: 'Idea Architect',
                weight: 1.2,
                prompt: 'Analyze the problem structure and create foundational solutions.',
                expertise: ['analysis', 'structure', 'foundations']
            },
            catalyst: {
                name: 'Innovation Catalyst', 
                weight: 1.0,
                prompt: 'Challenge assumptions and propose creative alternatives.',
                expertise: ['creativity', 'alternatives', 'innovation']
            },
            synthesizer: {
                name: 'Solution Synthesizer',
                weight: 1.3,
                prompt: 'Combine insights into coherent, actionable solutions.',
                expertise: ['integration', 'synthesis', 'execution']
            },
            evaluator: {
                name: 'Quality Evaluator',
                weight: 1.1,
                prompt: 'Assess feasibility, risks, and potential impact.',
                expertise: ['evaluation', 'risks', 'feasibility']
            }
        };

        this.sessionState = {
            iteration: 0,
            consensusHistory: [],
            qualityHistory: [],
            breakthroughs: 0,
            stagnationCounter: 0
        };
    }

    /**
     * Główny algorytm rozwiązywania problemów
     */
    async solveProblem(problemStatement, progressCallback = null) {
        console.log(`🚀 Starting problem solving: "${problemStatement}"`);
        
        const session = {
            problem: problemStatement,
            startTime: Date.now(),
            iterations: [],
            finalSolution: null,
            metrics: {
                totalTime: 0,
                avgQuality: 0,
                finalConsensus: 0,
                breakthroughs: 0,
                efficiency: 0
            }
        };

        try {
            // Reset session state
            this.sessionState.iteration = 0;
            this.sessionState.consensusHistory = [];
            this.sessionState.qualityHistory = [];
            this.sessionState.breakthroughs = 0;

            while (this.sessionState.iteration < this.maxIterations) {
                const iteration = await this.runIteration(problemStatement, progressCallback);
                session.iterations.push(iteration);

                // Check for convergence
                if (this.hasConverged(iteration)) {
                    console.log(`✅ Convergence achieved at iteration ${this.sessionState.iteration}`);
                    break;
                }

                // Check for stagnation
                if (this.detectStagnation()) {
                    console.log(`🔄 Stagnation detected, applying breakthrough strategy`);
                    await this.applyBreakthroughStrategy(problemStatement);
                }

                this.sessionState.iteration++;
            }

            // Generate final solution
            session.finalSolution = await this.generateFinalSolution(session.iterations);
            session.metrics = this.calculateMetrics(session);

            console.log(`🎯 Problem solving completed:`, session.metrics);
            return session;

        } catch (error) {
            console.error('❌ Problem solving failed:', error);
            throw error;
        }
    }

    /**
     * Uruchamia pojedynczą iterację z wszystkimi rolami AI
     */
    async runIteration(problemStatement, progressCallback) {
        const iteration = {
            number: this.sessionState.iteration + 1,
            timestamp: Date.now(),
            contributions: {},
            metrics: {
                quality: 0,
                consensus: 0,
                diversity: 0,
                novelty: 0
            }
        };

        console.log(`🔄 Running iteration ${iteration.number}`);
        
        const roleKeys = Object.keys(this.roles);
        
        for (let i = 0; i < roleKeys.length; i++) {
            const roleKey = roleKeys[i];
            const role = this.roles[roleKey];
            
            if (progressCallback) {
                progressCallback({
                    stage: role.name,
                    progress: ((i + 1) / roleKeys.length) * 100,
                    iteration: iteration.number
                });
            }

            try {
                const contribution = await this.getAIContribution(
                    roleKey, 
                    problemStatement, 
                    iteration.contributions
                );
                
                iteration.contributions[roleKey] = contribution;
                
                // Simulate processing delay
                await this.delay(500 + Math.random() * 1000);
                
            } catch (error) {
                console.warn(`⚠️ Failed to get contribution from ${roleKey}:`, error);
                iteration.contributions[roleKey] = {
                    content: `Fallback response for ${role.name}`,
                    quality: 5.0,
                    confidence: 0.5
                };
            }
        }

        // Calculate iteration metrics
        iteration.metrics = await this.calculateIterationMetrics(iteration);
        
        // Update session state
        this.sessionState.consensusHistory.push(iteration.metrics.consensus);
        this.sessionState.qualityHistory.push(iteration.metrics.quality);

        return iteration;
    }

    /**
     * Pobiera wkład od konkretnej roli AI z użyciem prawdziwego API
     */
    async getAIContribution(roleKey, problemStatement, existingContributions) {
        const role = this.roles[roleKey];
        const contextualPrompt = this.buildContextualPrompt(
            role, 
            problemStatement, 
            existingContributions
        );

        const startTime = Date.now();
        const builderMapping = {
            'architect': 'builder1',
            'catalyst': 'builder2', 
            'synthesizer': 'synthesizer',
            'evaluator': 'evaluator'
        };
        
        const builderName = builderMapping[roleKey] || roleKey;
        
        try {
            console.log(`🎯 Getting AI contribution from ${role.name} (${builderName})...`);
            
            // Check API status first
            const apiStatus = getAPIStatus();
            if (!apiStatus.realAIEnabled && !apiStatus.mockMode) {
                throw new Error('No AI services available - both real AI and mock mode disabled');
            }
            
            // Prepare API call options
            const options = {
                temperature: this.getTemperatureForRole(roleKey),
                maxTokens: this.getMaxTokensForRole(roleKey),
                model: this.getModelForRole(roleKey),
                retryDelay: 1000,
                maxRetries: 2
            };
            
            console.log(`📋 Using options for ${roleKey}:`, options);
            
            // Use circuit breaker with real API call
            const result = await apiCircuitBreaker.execute(async () => {
                return await callAPIWithRetry(
                    builderName,
                    problemStatement,
                    contextualPrompt,
                    apiCircuitBreaker,
                    options
                );
            });
            
            const latency = Date.now() - startTime;
            console.log(`✅ Got contribution from ${role.name} in ${latency}ms`);
            
            // Validate and process the result
            const processedResult = this.processAIResult(result, roleKey, latency);
            
            // Record successful contribution metrics
            this.recordContributionMetrics(roleKey, processedResult, latency, null);
            
            return processedResult;
            
        } catch (error) {
            const latency = Date.now() - startTime;
            console.error(`❌ Failed to get AI contribution from ${role.name}:`, error.message);
            
            // Record error metrics
            this.recordContributionMetrics(roleKey, null, latency, error);
            
            // Try fallback strategies
            return await this.handleContributionError(roleKey, problemStatement, contextualPrompt, error);
        }
    }
    
    /**
     * Przetwarza wynik z API AI
     */
    processAIResult(result, roleKey, latency) {
        if (!result || !result.response) {
            throw new Error(`Invalid AI response structure for ${roleKey}`);
        }
        
        // Validate response quality
        const content = result.response.trim();
        if (content.length < 20) {
            console.warn(`⚠️ Short response from ${roleKey}: ${content.length} characters`);
        }
        
        // Apply role-specific quality adjustments
        const adjustedQuality = this.adjustQualityForRole(result.quality || 7.0, roleKey);
        const adjustedConfidence = this.adjustConfidenceForRole(result.confidence || 0.7, roleKey);
        
        return {
            content: content,
            quality: adjustedQuality,
            confidence: adjustedConfidence,
            timestamp: Date.now(),
            latency: latency,
            provider: result.provider || 'unknown',
            model: result.model || 'unknown',
            usage: result.usage || {},
            cached: result.cached || false,
            fallback: result.fallback || false
        };
    }
    
    /**
     * Obsługuje błędy w uzyskiwaniu wkładu AI
     */
    async handleContributionError(roleKey, problemStatement, contextualPrompt, originalError) {
        const role = this.roles[roleKey];
        console.log(`🔄 Attempting error recovery for ${role.name}...`);
        
        // Strategy 1: Try with simplified prompt
        try {
            console.log(`📝 Trying simplified prompt for ${roleKey}...`);
            const simplifiedPrompt = this.createSimplifiedPrompt(role, problemStatement);
            
            const result = await callAPI(
                roleKey,
                problemStatement,
                simplifiedPrompt,
                apiCircuitBreaker,
                { 
                    temperature: 0.5, 
                    maxTokens: 200,
                    provider: 'mock' // Force mock for fallback
                }
            );
            
            if (result && result.response) {
                console.log(`✅ Fallback successful for ${roleKey} with simplified prompt`);
                return this.processAIResult({
                    ...result,
                    fallback: true,
                    fallbackStrategy: 'simplified_prompt'
                }, roleKey, 0);
            }
        } catch (fallbackError) {
            console.warn(`⚠️ Simplified prompt fallback failed for ${roleKey}:`, fallbackError.message);
        }
        
        // Strategy 2: Use cached response if available
        try {
            console.log(`💾 Checking cache for similar ${roleKey} contribution...`);
            const cachedResult = responseCache.get(roleKey, problemStatement, contextualPrompt);
            if (cachedResult && cachedResult.response) {
                console.log(`✅ Using cached response for ${roleKey}`);
                return {
                    ...cachedResult,
                    fallback: true,
                    fallbackStrategy: 'cached_response',
                    timestamp: Date.now()
                };
            }
        } catch (cacheError) {
            console.warn(`⚠️ Cache fallback failed for ${roleKey}:`, cacheError.message);
        }
        
        // Strategy 3: Generate rule-based response
        console.log(`🤖 Generating rule-based fallback for ${roleKey}...`);
        const fallbackContent = this.generateRuleBasedResponse(roleKey, problemStatement);
        
        return {
            content: fallbackContent,
            quality: 4.0, // Lower quality for fallback
            confidence: 0.3,
            timestamp: Date.now(),
            latency: 0,
            provider: 'fallback',
            model: 'rule-based',
            usage: { total_tokens: 0 },
            cached: false,
            fallback: true,
            fallbackStrategy: 'rule_based',
            originalError: originalError.message
        };
    }
    
    /**
     * Generuje odpowiedź opartą na regułach jako ostatnią deską ratunku
     */
    generateRuleBasedResponse(roleKey, problemStatement) {
        const templates = {
            architect: `W odniesieniu do problemu "${problemStatement}", kluczowe jest przeprowadzenie systematycznej analizy strukturalnej. Należy zidentyfikować główne komponenty problemu, ich wzajemne zależności oraz potencjalne punkty interwencji. Rekomendowane jest podejście etapowe z jasno określonymi milestone'ami.`,
            
            catalyst: `Problem "${problemStatement}" wymaga kreatywnego podejścia. Warto rozważyć alternatywne perspektywy i zakwestionować podstawowe założenia. Sugeruję eksplorację niestandardowych rozwiązań, wykorzystanie analogii z innych dziedzin oraz aplikację metod design thinking.`,
            
            synthesizer: `Na podstawie analizy problemu "${problemStatement}", optymalne rozwiązanie powinno integrować różne podejścia w spójną całość. Kluczowe jest znalezienie równowagi między praktycznością a innowacyjnością, uwzględniając zarówno ograniczenia jak i możliwości.`,
            
            evaluator: `Oceniając rozwiązania dla "${problemStatement}", należy wziąć pod uwagę wykonalność, koszty implementacji, potencjalne ryzyka oraz oczekiwane korzyści. Rekomendowana jest analiza SWOT oraz opracowanie planu zarządzania ryzykiem.`
        };
        
        return templates[roleKey] || `Analiza problemu "${problemStatement}" wymaga dalszego badania i konsultacji z ekspertami w tej dziedzinie.`;
    }
    
    /**
     * Tworzy uproszczony prompt dla strategii fallback
     */
    createSimplifiedPrompt(role, problemStatement) {
        return `${role.prompt}\n\nProblem: ${problemStatement}\n\nProvide a brief analysis focusing on ${role.expertise[0]}.`;
    }
    
    /**
     * Rejestruje metryki wkładu
     */
    recordContributionMetrics(roleKey, result, latency, error) {
        try {
            const metrics = {
                role: roleKey,
                latency: latency,
                success: !error,
                error: error?.message,
                quality: result?.quality || 0,
                confidence: result?.confidence || 0,
                provider: result?.provider || 'unknown',
                fallback: result?.fallback || false,
                timestamp: Date.now()
            };
            
            // Could integrate with metrics collector here
            console.log(`📊 Contribution metrics for ${roleKey}:`, metrics);
        } catch (metricsError) {
            console.warn(`⚠️ Failed to record metrics for ${roleKey}:`, metricsError.message);
        }
    }
    
    /**
     * Pobiera temperaturę odpowiednią dla roli
     */
    getTemperatureForRole(roleKey) {
        const temperatures = {
            architect: 0.4,    // Structured, analytical
            catalyst: 0.8,     // Creative, innovative  
            synthesizer: 0.6,  // Balanced integration
            evaluator: 0.3     // Precise, critical
        };
        return temperatures[roleKey] || 0.6;
    }
    
    /**
     * Pobiera maksymalną liczbę tokenów dla roli
     */
    getMaxTokensForRole(roleKey) {
        const tokenLimits = {
            architect: 400,     // Detailed analysis
            catalyst: 350,      // Creative ideas
            synthesizer: 450,   // Comprehensive synthesis
            evaluator: 300      // Focused evaluation
        };
        return tokenLimits[roleKey] || 350;
    }
    
    /**
     * Pobiera preferowany model dla roli
     */
    getModelForRole(roleKey) {
        // Could implement role-specific model preferences
        // For now, use default from config
        return null; // Will use default from API config
    }
    
    /**
     * Dostosowuje jakość dla konkretnej roli
     */
    adjustQualityForRole(quality, roleKey) {
        const adjustments = {
            architect: 1.1,     // Boost analytical responses
            catalyst: 0.9,      // Creative responses may be less structured
            synthesizer: 1.2,   // Integration is highly valued
            evaluator: 1.0      // Neutral evaluation
        };
        
        const adjusted = quality * (adjustments[roleKey] || 1.0);
        return Math.min(10, Math.max(1, adjusted));
    }
    
    /**
     * Dostosowuje pewność dla konkretnej roli
     */
    adjustConfidenceForRole(confidence, roleKey) {
        const adjustments = {
            architect: 1.0,     // Neutral
            catalyst: 0.9,      // Creative ideas less certain
            synthesizer: 1.1,   // Integration builds confidence
            evaluator: 1.0      // Neutral evaluation
        };
        
        const adjusted = confidence * (adjustments[roleKey] || 1.0);
        return Math.min(1.0, Math.max(0.1, adjusted));
    }

    /**
     * Buduje kontekstowy prompt dla danej roli
     */
    buildContextualPrompt(role, problemStatement, existingContributions) {
        let prompt = `${role.prompt}\n\nProblem: ${problemStatement}\n`;

        if (Object.keys(existingContributions).length > 0) {
            prompt += '\nExisting contributions:\n';
            Object.entries(existingContributions).forEach(([key, contrib]) => {
                prompt += `- ${this.roles[key]?.name}: ${contrib.content}\n`;
            });
        }

        prompt += `\nProvide your analysis focusing on: ${role.expertise.join(', ')}.`;
        return prompt;
    }

    /**
     * Oblicza metryki dla iteracji
     */
    async calculateIterationMetrics(iteration) {
        const contributions = Object.values(iteration.contributions);
        const contents = contributions.map(c => c.content);
        
        // Quality: weighted average of individual qualities
        const totalWeight = Object.keys(iteration.contributions)
            .reduce((sum, key) => sum + (this.roles[key]?.weight || 1), 0);
        
        const quality = Object.entries(iteration.contributions)
            .reduce((sum, [key, contrib]) => {
                const weight = this.roles[key]?.weight || 1;
                return sum + (contrib.quality * weight);
            }, 0) / totalWeight;

        // Consensus: TF-IDF similarity
        const consensus = contents.length > 1 ? computeTFIDF(contents) : 1.0;

        // Diversity: inverse of consensus (more diversity = less consensus)
        const diversity = 1 - consensus;

        // Novelty: compare with previous iterations
        const novelty = this.calculateNovelty(contents);

        return {
            quality: Math.min(10, Math.max(0, quality)),
            consensus: Math.min(1, Math.max(0, consensus)),
            diversity: Math.min(1, Math.max(0, diversity)),
            novelty: Math.min(1, Math.max(0, novelty))
        };
    }

    /**
     * Sprawdza czy nastąpiła konwergencja
     */
    hasConverged(iteration) {
        const { quality, consensus } = iteration.metrics;
        
        // Dynamic consensus threshold based on quality
        const dynamicThreshold = this.minConsensusThreshold + 
            (this.maxConsensusThreshold - this.minConsensusThreshold) * 
            Math.min(1, quality / 10);

        return quality >= this.qualityThreshold && 
               consensus >= dynamicThreshold;
    }

    /**
     * Wykrywa stagnację w procesie
     */
    detectStagnation() {
        if (this.sessionState.consensusHistory.length < 3) return false;

        const recent = this.sessionState.consensusHistory.slice(-3);
        const variance = this.calculateVariance(recent);
        
        // Stagnation if variance is very low (little change)
        return variance < 0.001;
    }

    /**
     * Stosuje strategię przełamania stagnacji
     */
    async applyBreakthroughStrategy(problemStatement) {
        console.log('🎯 Applying breakthrough strategy...');
        
        // Add random perturbation to catalyst role
        const originalWeight = this.roles.catalyst.weight;
        this.roles.catalyst.weight *= 1.5; // Boost creativity
        
        // Add entropy to problem statement
        const perturbedProblem = `${problemStatement} [Consider unconventional approaches and challenge standard assumptions]`;
        
        this.sessionState.breakthroughs++;
        
        // Reset after one iteration
        setTimeout(() => {
            this.roles.catalyst.weight = originalWeight;
        }, 2000);
    }

    /**
     * Generuje finalne rozwiązanie
     */
    async generateFinalSolution(iterations) {
        const bestIteration = iterations.reduce((best, current) => 
            current.metrics.quality > best.metrics.quality ? current : best
        );

        const allContributions = iterations.flatMap(iter => 
            Object.values(iter.contributions).map(c => c.content)
        );

        return {
            primary: bestIteration.contributions.synthesizer?.content || 'No primary solution generated',
            supporting: {
                analysis: bestIteration.contributions.architect?.content,
                alternatives: bestIteration.contributions.catalyst?.content,
                evaluation: bestIteration.contributions.evaluator?.content
            },
            confidence: bestIteration.metrics.quality / 10,
            consensus: bestIteration.metrics.consensus,
            iterationsUsed: iterations.length,
            timestamp: Date.now()
        };
    }

    /**
     * Oblicza finalne metryki sesji
     */
    calculateMetrics(session) {
        const qualities = session.iterations.map(i => i.metrics.quality);
        const consensuses = session.iterations.map(i => i.metrics.consensus);
        
        return {
            totalTime: Date.now() - session.startTime,
            avgQuality: qualities.reduce((a, b) => a + b, 0) / qualities.length,
            finalConsensus: consensuses[consensuses.length - 1] || 0,
            breakthroughs: this.sessionState.breakthroughs,
            efficiency: qualities.length / this.maxIterations,
            convergenceRate: this.sessionState.iteration / this.maxIterations
        };
    }

    // Utility functions
    calculateNovelty(contents) {
        // Simple novelty calculation based on unique word ratio
        const allWords = contents.join(' ').toLowerCase().split(/\s+/);
        const uniqueWords = new Set(allWords);
        return uniqueWords.size / allWords.length;
    }

    calculateVariance(numbers) {
        const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
        const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
        return squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Public API for monitoring
    getSessionState() {
        return { ...this.sessionState };
    }

    resetSession() {
        this.sessionState = {
            iteration: 0,
            consensusHistory: [],
            qualityHistory: [],
            breakthroughs: 0,
            stagnationCounter: 0
        };
    }
}

// Export singleton instance
export const aiEngine = new AdvancedAIEngine({
    minConsensus: 0.75,
    maxConsensus: 0.90,
    qualityThreshold: 7.5,
    maxIterations: 8
});
