/**
 * Management and Monitoring API Routes
 * Provides endpoints for system monitoring, metrics, and cache management
 */

import { responseCache } from './cache.js';
import { metricsCollector } from './metrics.js';
import { getAPIStatus, getAvailableProviders } from './api.js';

/**
 * Add management routes to Express app
 * @param {Object} app - Express application instance
 */
export function addManagementRoutes(app) {
    
    // Health check with detailed status
    app.get('/api/health', (req, res) => {
        const apiStatus = getAPIStatus();
        const cacheStats = responseCache.getStats();
        const metricsReport = metricsCollector.getReport();
        const budgetAlerts = metricsCollector.checkBudgetAlerts();
        
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            api: apiStatus,
            cache: cacheStats,
            metrics: {
                session: metricsReport.session,
                alerts: budgetAlerts
            }
        });
    });

    // Detailed metrics report
    app.get('/api/metrics', (req, res) => {
        const report = metricsCollector.getReport();
        const breakdown = metricsCollector.getCostBreakdown();
        const alerts = metricsCollector.checkBudgetAlerts();
        
        res.json({
            ...report,
            costBreakdown: breakdown,
            alerts: alerts,
            timestamp: new Date().toISOString()
        });
    });

    // Export metrics as CSV
    app.get('/api/metrics/export', (req, res) => {
        try {
            const filepath = metricsCollector.exportToCSV();
            res.download(filepath);
        } catch (error) {
            res.status(500).json({ error: 'Failed to export metrics', message: error.message });
        }
    });

    // Cache management
    app.get('/api/cache/stats', (req, res) => {
        res.json(responseCache.getStats());
    });

    app.post('/api/cache/clear', (req, res) => {
        responseCache.clear();
        res.json({ success: true, message: 'Cache cleared' });
    });

    app.post('/api/cache/enable', (req, res) => {
        responseCache.enable();
        res.json({ success: true, message: 'Cache enabled' });
    });

    app.post('/api/cache/disable', (req, res) => {
        responseCache.disable();
        res.json({ success: true, message: 'Cache disabled' });
    });

    // Provider status and testing
    app.get('/api/providers', (req, res) => {
        const status = getAPIStatus();
        res.json(status);
    });

    app.get('/api/providers/available', (req, res) => {
        const providers = getAvailableProviders();
        res.json({ providers, count: providers.length });
    });

    // Test API connectivity
    app.post('/api/test/:provider', async (req, res) => {
        const { provider } = req.params;
        const { callAIProvider } = await import('./api.js');
        
        try {
            const startTime = Date.now();
            const result = await callAIProvider(
                provider, 
                'builder1', 
                'Test', 
                'Say hello in Polish', 
                { maxTokens: 50 }
            );
            const latency = Date.now() - startTime;
            
            res.json({
                success: true,
                provider,
                latency,
                response: result.response.substring(0, 100) + '...',
                usage: result.usage
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                provider,
                error: error.message
            });
        }
    });

    // Budget alerts and limits
    app.get('/api/budget/alerts', (req, res) => {
        const alerts = metricsCollector.checkBudgetAlerts();
        res.json({ alerts, count: alerts.length });
    });

    app.get('/api/budget/projections', (req, res) => {
        const report = metricsCollector.getReport();
        res.json(report.projections);
    });

    // System performance
    app.get('/api/performance', (req, res) => {
        const report = metricsCollector.getReport();
        const cacheStats = responseCache.getStats();
        
        res.json({
            latency: {
                average: report.session.averageLatency,
                providers: Object.fromEntries(
                    Object.entries(report.session.providerStats).map(([provider, stats]) => [
                        provider, 
                        { avgLatency: stats.avgLatency, requests: stats.requests }
                    ])
                )
            },
            cache: {
                hitRatio: cacheStats.hitRatio,
                hitCount: cacheStats.hitCount,
                missCount: cacheStats.missCount
            },
            errors: {
                total: report.session.errors,
                rate: report.session.errorRate
            },
            throughput: {
                requestsPerHour: report.session.requestsPerHour,
                totalRequests: report.session.totalRequests
            }
        });
    });

    // Advanced analytics
    app.get('/api/analytics/providers', (req, res) => {
        const breakdown = metricsCollector.getCostBreakdown();
        const report = metricsCollector.getReport();
        
        const analytics = Object.entries(report.session.providerStats).map(([provider, stats]) => ({
            provider,
            requests: stats.requests,
            tokens: stats.tokens,
            cost: stats.cost,
            avgLatency: stats.avgLatency,
            errors: stats.errors,
            errorRate: stats.requests > 0 ? (stats.errors / stats.requests * 100).toFixed(1) : 0,
            avgCostPerRequest: breakdown[provider]?.avgCostPerRequest || 0,
            percentage: breakdown[provider]?.percentage || 0
        }));
        
        res.json({ providers: analytics, timestamp: new Date().toISOString() });
    });

    app.get('/api/analytics/models', (req, res) => {
        const report = metricsCollector.getReport();
        res.json({ 
            models: report.daily.models, 
            timestamp: new Date().toISOString() 
        });
    });

    app.get('/api/analytics/builders', (req, res) => {
        const report = metricsCollector.getReport();
        res.json({ 
            builders: report.daily.builders, 
            timestamp: new Date().toISOString() 
        });
    });

    // Real-time monitoring endpoint (SSE)
    app.get('/api/monitor/live', (req, res) => {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');

        const sendUpdate = () => {
            const report = metricsCollector.getReport();
            const cacheStats = responseCache.getStats();
            const alerts = metricsCollector.checkBudgetAlerts();
            
            const data = {
                timestamp: new Date().toISOString(),
                session: {
                    totalRequests: report.session.totalRequests,
                    totalCost: report.session.totalCost,
                    averageLatency: report.session.averageLatency,
                    errorRate: report.session.errorRate
                },
                cache: {
                    hitRatio: cacheStats.hitRatio,
                    size: cacheStats.cacheSize
                },
                alerts: alerts.length,
                providers: Object.keys(report.session.providerStats)
            };
            
            res.write(`data: ${JSON.stringify(data)}\\n\\n`);
        };

        // Send initial data
        sendUpdate();
        
        // Send updates every 5 seconds
        const interval = setInterval(sendUpdate, 5000);
        
        // Cleanup on client disconnect
        req.on('close', () => {
            clearInterval(interval);
        });
    });

    // Configuration management
    app.get('/api/config', (req, res) => {
        const config = {
            realAIEnabled: process.env.ENABLE_REAL_AI === 'true',
            mockMode: process.env.MOCK_MODE === 'true',
            defaultProvider: process.env.DEFAULT_AI_PROVIDER || 'openai',
            cacheEnabled: process.env.ENABLE_CACHE !== 'false',
            cacheMaxSize: parseInt(process.env.CACHE_MAX_SIZE) || 1000,
            cacheTTL: parseInt(process.env.CACHE_TTL) || 30 * 60 * 1000,
            dailyCostLimit: parseFloat(process.env.DAILY_COST_LIMIT) || 10,
            sessionCostLimit: parseFloat(process.env.SESSION_COST_LIMIT) || 5
        };
        
        res.json(config);
    });

    // System information
    app.get('/api/system', (req, res) => {
        res.json({
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
            pid: process.pid,
            cwd: process.cwd(),
            versions: process.versions
        });
    });

    console.log('🔧 Management routes initialized');
    console.log('   GET  /api/health - Health check with status');
    console.log('   GET  /api/metrics - Detailed metrics report');
    console.log('   GET  /api/cache/stats - Cache statistics');
    console.log('   GET  /api/providers - Provider status');
    console.log('   GET  /api/monitor/live - Real-time monitoring (SSE)');
}

export default addManagementRoutes;
