/**
 * Cost Tracking and Performance Monitoring System
 * Tracks API usage, costs, and performance metrics
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MetricsCollector {
    constructor() {
        this.metrics = {
            session: {
                startTime: Date.now(),
                totalRequests: 0,
                totalTokens: 0,
                totalCost: 0,
                averageLatency: 0,
                errors: 0,
                providerStats: {}
            },
            daily: this.loadDailyMetrics(),
            costs: this.loadCostDatabase()
        };

        // Auto-save every 5 minutes
        this.saveInterval = setInterval(() => this.save(), 5 * 60 * 1000);
    }

    /**
     * Cost database for different providers and models
     */
    loadCostDatabase() {
        return {
            openai: {
                'gpt-4': { input: 0.03, output: 0.06 }, // per 1K tokens
                'gpt-4-turbo': { input: 0.01, output: 0.03 },
                'gpt-3.5-turbo': { input: 0.0015, output: 0.002 }
            },
            anthropic: {
                'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
                'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 },
                'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 }
            },
            google: {
                'gemini-pro': { input: 0.0005, output: 0.0015 },
                'gemini-pro-vision': { input: 0.0005, output: 0.0015 }
            }
        };
    }

    /**
     * Load daily metrics from file
     */
    loadDailyMetrics() {
        const today = new Date().toISOString().split('T')[0];
        const metricsPath = path.join(__dirname, '..', 'data', 'metrics');
        
        try {
            if (!fs.existsSync(metricsPath)) {
                fs.mkdirSync(metricsPath, { recursive: true });
            }
            
            const dailyFile = path.join(metricsPath, `${today}.json`);
            if (fs.existsSync(dailyFile)) {
                return JSON.parse(fs.readFileSync(dailyFile, 'utf8'));
            }
        } catch (error) {
            console.warn('Could not load daily metrics:', error.message);
        }

        return {
            date: today,
            requests: 0,
            tokens: 0,
            cost: 0,
            errors: 0,
            providers: {},
            models: {},
            builders: {}
        };
    }

    /**
     * Record API call metrics
     */
    recordAPICall(provider, model, builder, usage, latency, error = null) {
        const now = Date.now();
        const cost = this.calculateCost(provider, model, usage);

        // Session metrics
        this.metrics.session.totalRequests++;
        this.metrics.session.totalTokens += usage.total_tokens || 0;
        this.metrics.session.totalCost += cost;
        
        // Calculate running average latency
        const totalLatency = this.metrics.session.averageLatency * (this.metrics.session.totalRequests - 1) + latency;
        this.metrics.session.averageLatency = totalLatency / this.metrics.session.totalRequests;

        if (error) {
            this.metrics.session.errors++;
        }

        // Provider stats
        if (!this.metrics.session.providerStats[provider]) {
            this.metrics.session.providerStats[provider] = {
                requests: 0,
                tokens: 0,
                cost: 0,
                errors: 0,
                avgLatency: 0
            };
        }

        const providerStats = this.metrics.session.providerStats[provider];
        providerStats.requests++;
        providerStats.tokens += usage.total_tokens || 0;
        providerStats.cost += cost;
        if (error) providerStats.errors++;
        
        // Update average latency for provider
        const totalProviderLatency = providerStats.avgLatency * (providerStats.requests - 1) + latency;
        providerStats.avgLatency = totalProviderLatency / providerStats.requests;

        // Daily metrics
        this.metrics.daily.requests++;
        this.metrics.daily.tokens += usage.total_tokens || 0;
        this.metrics.daily.cost += cost;
        if (error) this.metrics.daily.errors++;

        // Provider breakdown
        if (!this.metrics.daily.providers[provider]) {
            this.metrics.daily.providers[provider] = { requests: 0, tokens: 0, cost: 0 };
        }
        this.metrics.daily.providers[provider].requests++;
        this.metrics.daily.providers[provider].tokens += usage.total_tokens || 0;
        this.metrics.daily.providers[provider].cost += cost;

        // Model breakdown
        if (!this.metrics.daily.models[model]) {
            this.metrics.daily.models[model] = { requests: 0, tokens: 0, cost: 0 };
        }
        this.metrics.daily.models[model].requests++;
        this.metrics.daily.models[model].tokens += usage.total_tokens || 0;
        this.metrics.daily.models[model].cost += cost;

        // Builder breakdown
        if (!this.metrics.daily.builders[builder]) {
            this.metrics.daily.builders[builder] = { requests: 0, tokens: 0, cost: 0 };
        }
        this.metrics.daily.builders[builder].requests++;
        this.metrics.daily.builders[builder].tokens += usage.total_tokens || 0;
        this.metrics.daily.builders[builder].cost += cost;

        console.log(`📊 API Call: ${provider}/${model} | Cost: $${cost.toFixed(4)} | Latency: ${latency}ms`);
    }

    /**
     * Calculate cost for API call
     */
    calculateCost(provider, model, usage) {
        const costs = this.costs[provider]?.[model];
        if (!costs || !usage) return 0;

        const inputCost = (usage.prompt_tokens || 0) / 1000 * costs.input;
        const outputCost = (usage.completion_tokens || 0) / 1000 * costs.output;
        
        return inputCost + outputCost;
    }

    /**
     * Get comprehensive metrics report
     */
    getReport() {
        const sessionDuration = Date.now() - this.metrics.session.startTime;
        const hoursRunning = sessionDuration / (1000 * 60 * 60);

        return {
            session: {
                ...this.metrics.session,
                duration: sessionDuration,
                hoursRunning: hoursRunning.toFixed(2),
                requestsPerHour: hoursRunning > 0 ? (this.metrics.session.totalRequests / hoursRunning).toFixed(1) : 0,
                costPerRequest: this.metrics.session.totalRequests > 0 ? 
                    (this.metrics.session.totalCost / this.metrics.session.totalRequests).toFixed(4) : 0,
                errorRate: this.metrics.session.totalRequests > 0 ? 
                    (this.metrics.session.errors / this.metrics.session.totalRequests * 100).toFixed(1) : 0
            },
            daily: this.metrics.daily,
            projections: this.getProjections()
        };
    }

    /**
     * Get cost and usage projections
     */
    getProjections() {
        const sessionDuration = Date.now() - this.metrics.session.startTime;
        const hoursRunning = sessionDuration / (1000 * 60 * 60);
        
        if (hoursRunning < 0.1) return { insufficient_data: true };

        const hourlyRate = this.metrics.session.totalCost / hoursRunning;
        const dailyProjection = hourlyRate * 24;
        const monthlyProjection = dailyProjection * 30;

        return {
            hourly: {
                cost: hourlyRate.toFixed(4),
                requests: (this.metrics.session.totalRequests / hoursRunning).toFixed(1),
                tokens: (this.metrics.session.totalTokens / hoursRunning).toFixed(0)
            },
            daily: {
                cost: dailyProjection.toFixed(2),
                requests: (this.metrics.session.totalRequests / hoursRunning * 24).toFixed(0),
                tokens: (this.metrics.session.totalTokens / hoursRunning * 24).toFixed(0)
            },
            monthly: {
                cost: monthlyProjection.toFixed(2),
                requests: (this.metrics.session.totalRequests / hoursRunning * 24 * 30).toFixed(0),
                tokens: (this.metrics.session.totalTokens / hoursRunning * 24 * 30).toFixed(0)
            }
        };
    }

    /**
     * Get cost breakdown by provider
     */
    getCostBreakdown() {
        const breakdown = {};
        const total = this.metrics.session.totalCost;

        for (const [provider, stats] of Object.entries(this.metrics.session.providerStats)) {
            breakdown[provider] = {
                cost: stats.cost,
                percentage: total > 0 ? (stats.cost / total * 100).toFixed(1) : 0,
                requests: stats.requests,
                avgCostPerRequest: stats.requests > 0 ? (stats.cost / stats.requests).toFixed(4) : 0
            };
        }

        return breakdown;
    }

    /**
     * Check if costs are approaching limits
     */
    checkBudgetAlerts() {
        const alerts = [];
        const dailyCost = this.metrics.daily.cost;
        const sessionCost = this.metrics.session.totalCost;

        const dailyLimit = parseFloat(process.env.DAILY_COST_LIMIT) || 10;
        const sessionLimit = parseFloat(process.env.SESSION_COST_LIMIT) || 5;

        if (dailyCost > dailyLimit * 0.8) {
            alerts.push({
                type: 'daily_budget',
                severity: dailyCost > dailyLimit ? 'critical' : 'warning',
                message: `Daily cost: $${dailyCost.toFixed(2)} (limit: $${dailyLimit})`
            });
        }

        if (sessionCost > sessionLimit * 0.8) {
            alerts.push({
                type: 'session_budget',
                severity: sessionCost > sessionLimit ? 'critical' : 'warning',
                message: `Session cost: $${sessionCost.toFixed(2)} (limit: $${sessionLimit})`
            });
        }

        return alerts;
    }

    /**
     * Save metrics to file
     */
    save() {
        const today = new Date().toISOString().split('T')[0];
        const metricsPath = path.join(__dirname, '..', 'data', 'metrics');
        
        try {
            if (!fs.existsSync(metricsPath)) {
                fs.mkdirSync(metricsPath, { recursive: true });
            }
            
            const dailyFile = path.join(metricsPath, `${today}.json`);
            fs.writeFileSync(dailyFile, JSON.stringify(this.metrics.daily, null, 2));
        } catch (error) {
            console.warn('Could not save metrics:', error.message);
        }
    }

    /**
     * Export metrics to CSV
     */
    exportToCSV() {
        const csv = [
            'Date,Provider,Model,Builder,Requests,Tokens,Cost,Errors',
            ...Object.entries(this.metrics.daily.providers).map(([provider, stats]) =>
                `${this.metrics.daily.date},${provider},mixed,mixed,${stats.requests},${stats.tokens},${stats.cost.toFixed(4)},0`
            )
        ].join('\n');

        const exportPath = path.join(__dirname, '..', 'data', 'exports');
        if (!fs.existsSync(exportPath)) {
            fs.mkdirSync(exportPath, { recursive: true });
        }

        const filename = `metrics_${new Date().toISOString().split('T')[0]}.csv`;
        const filepath = path.join(exportPath, filename);
        fs.writeFileSync(filepath, csv);
        
        return filepath;
    }

    /**
     * Cleanup on shutdown
     */
    destroy() {
        if (this.saveInterval) {
            clearInterval(this.saveInterval);
        }
        this.save();
    }
}

// Global metrics instance
export const metricsCollector = new MetricsCollector();

export default MetricsCollector;
