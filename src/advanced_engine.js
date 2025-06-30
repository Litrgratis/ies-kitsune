/**
 * Advanced AI Engine - Enhanced Problem Solving with Dynamic Consensus
 * Implementuje zaawansowane algorytmy do oceny jakości i konsensusu
 */

import { computeTFIDF } from './utils.js';
import { apiCircuitBreaker } from './circuit_breaker.js';

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
     * Pobiera wkład od konkretnej roli AI
     */
    async getAIContribution(roleKey, problemStatement, existingContributions) {
        const role = this.roles[roleKey];
        const contextualPrompt = this.buildContextualPrompt(
            role, 
            problemStatement, 
            existingContributions
        );

        try {
            return await apiCircuitBreaker.execute(async () => {
                const response = await fetch('/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        builder: roleKey,
                        topic: problemStatement,
                        prompt: contextualPrompt,
                        temperature: roleKey === 'catalyst' ? 0.8 : 0.6,
                        max_tokens: 300
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();
                return {
                    content: data.response,
                    quality: data.quality || 7.0,
                    confidence: data.confidence || 0.7,
                    timestamp: Date.now()
                };
            });
            
        } catch (error) {
            console.error(`Failed to get AI contribution for ${roleKey}:`, error);
            throw error;
        }
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
