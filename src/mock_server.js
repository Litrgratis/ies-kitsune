import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import promClient from 'prom-client';
import appConfig, { validateConfig } from './config.js';

// Security imports
import { auditMiddleware } from './security/audit_logger.js';
import { apiRateLimit, authRateLimit } from './security/rate_limiter.js';
import { createValidationMiddleware, validateSecurityHeaders } from './security/input_validator.js';
import securityRoutes from './security/security_routes.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Prometheus metrics setup
const register = promClient.register;
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestsTotal = new promClient.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code']
});

const httpRequestDuration = new promClient.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.5, 1, 2, 5]
});

const sseConnectionsTotal = new promClient.Gauge({
    name: 'sse_connections_total',
    help: 'Total number of active SSE connections'
});

const aiRequestsTotal = new promClient.Counter({
    name: 'ai_requests_total',
    help: 'Total number of AI API requests',
    labelNames: ['builder']
});

const aiResponseTime = new promClient.Histogram({
    name: 'ai_response_time_seconds',
    help: 'AI API response time in seconds',
    labelNames: ['builder'],
    buckets: [0.5, 1, 2, 5, 10]
});

// Prometheus middleware
const metricsMiddleware = (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const route = req.route ? req.route.path : req.path;
        
        httpRequestsTotal.inc({
            method: req.method,
            route: route,
            status_code: res.statusCode
        });
        
        httpRequestDuration.observe({
            method: req.method,
            route: route,
            status_code: res.statusCode
        }, duration);
    });
    
    next();
};

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files

// Enterprise security middleware
app.use(validateSecurityHeaders);
app.use(auditMiddleware);

// Prometheus metrics middleware
app.use(metricsMiddleware);

// Mount security routes
app.use('/api/security', apiRateLimit, securityRoutes);
app.get('/api/sse/updates', (req, res) => {
    // Track SSE connection
    sseConnectionsTotal.inc();
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    const stages = [
        { stage: 'Idea Architect', progress: 25, builder: 'builder1' },
        { stage: 'Innovation Catalyst', progress: 50, builder: 'builder2' },
        { stage: 'Solution Synthesizer', progress: 75, builder: 'synthesizer' },
        { stage: 'Evaluator', progress: 100, builder: 'evaluator' }
    ];
    let stageIndex = 0;
    const interval = setInterval(() => {
        if (res.finished || stageIndex >= stages.length) {
            clearInterval(interval);
            return;
        }
        res.write(`data: ${JSON.stringify({
            type: 'evolution_progress',
            payload: { ...stages[stageIndex], estimatedTime: 10 - stageIndex * 2 }
        })}\n\n`);
        stageIndex++;
        if (stageIndex >= stages.length) {
            res.write(`data: ${JSON.stringify({
                type: 'consensus_update',
                payload: { quality: 8.8, consensus: 0.86, version: 1.1 }
            })}\n\n`);
            clearInterval(interval);
        }
    }, 2000);
    const timeout = setTimeout(() => clearInterval(interval), 60000);
    req.on('close', () => {
        clearInterval(interval);
        clearTimeout(timeout);
        // Decrease SSE connection count
        sseConnectionsTotal.dec();
    });
});

// Mock AI API endpoint with security
app.post('/v1/chat/completions', apiRateLimit, createValidationMiddleware('chatCompletion'), (req, res) => {
    const { builder, topic, prompt } = req.body;
    const startTime = Date.now();
    
    // Track AI request
    aiRequestsTotal.inc({ builder: builder || 'unknown' });
    
    // Simulate API delay
    setTimeout(() => {
        const responses = {
            builder1: `Analiza: ${topic} wymaga wieloaspektowego podejścia z uwzględnieniem czynników technicznych i społecznych.`,
            builder2: `Wyzwanie: Czy rozważano alternatywne rozwiązania dla ${topic}? Proponuję dodanie mechanizmu gamifikacji.`,
            synthesizer: `Synteza: Łącząc wszystkie propozycje dla ${topic}, optymalnym rozwiązaniem jest hybrydowe podejście.`
        };
        
        const response = {
            response: responses[builder] || `Mock response for ${builder}: ${prompt}`,
            quality: Math.random() * 2 + 7, // 7-9
            confidence: Math.random() * 0.3 + 0.7 // 0.7-1.0
        };
        
        // Track AI response time
        const responseTime = (Date.now() - startTime) / 1000;
        aiResponseTime.observe({ builder: builder || 'unknown' }, responseTime);
        
        res.json(response);
    }, Math.random() * 1000 + 500); // 0.5-1.5s delay
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (error) {
        res.status(500).end(error.message);
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: process.uptime(),
        metrics: {
            httpRequests: httpRequestsTotal._values,
            sseConnections: sseConnectionsTotal.hashMap,
            aiRequests: aiRequestsTotal._values
        }
    });
});

validateConfig();

// Add management and monitoring routes
import { addManagementRoutes } from './management_routes.js';
addManagementRoutes(app);

// Start server
app.listen(PORT, () => {
    console.log(`🦊 IES/Kitsune Server running on http://localhost:${PORT}`);
    console.log(`📊 SSE endpoint: http://localhost:${PORT}/api/sse/updates`);
    console.log(`🤖 AI API: http://localhost:${PORT}/v1/chat/completions`);
    console.log(`💚 Health check: http://localhost:${PORT}/health`);
    console.log(`📈 Metrics endpoint: http://localhost:${PORT}/metrics`);
    console.log(`🔍 Prometheus scraping available at /metrics`);
});
