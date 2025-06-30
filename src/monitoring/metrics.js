import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

// Collect default Node.js metrics (CPU, memory, event loop, etc.)
collectDefaultMetrics({ register });

/**
 * Prometheus Metrics for API Performance Monitoring
 */

// HTTP Request Duration Histogram
export const httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10] // Response time buckets in seconds
});

// HTTP Request Counter
export const httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code']
});

// Active Connections Gauge
export const activeConnections = new Gauge({
    name: 'active_connections',
    help: 'Number of active connections'
});

// API Errors Counter
export const apiErrors = new Counter({
    name: 'api_errors_total',
    help: 'Total number of API errors',
    labelNames: ['method', 'route', 'error_type']
});

// Database Query Duration
export const dbQueryDuration = new Histogram({
    name: 'db_query_duration_seconds',
    help: 'Duration of database queries in seconds',
    labelNames: ['query_type', 'table'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

// Database Connection Pool Metrics
export const dbConnectionsActive = new Gauge({
    name: 'db_connections_active',
    help: 'Number of active database connections'
});

export const dbConnectionsIdle = new Gauge({
    name: 'db_connections_idle',
    help: 'Number of idle database connections'
});

// Session Metrics
export const sessionsActive = new Gauge({
    name: 'sessions_active',
    help: 'Number of active user sessions'
});

export const sessionsCreated = new Counter({
    name: 'sessions_created_total',
    help: 'Total number of sessions created'
});

// AI API Metrics
export const aiRequestDuration = new Histogram({
    name: 'ai_request_duration_seconds',
    help: 'Duration of AI API requests in seconds',
    labelNames: ['builder_type', 'model'],
    buckets: [0.5, 1, 2, 5, 10, 15, 30]
});

export const aiRequestsTotal = new Counter({
    name: 'ai_requests_total',
    help: 'Total number of AI API requests',
    labelNames: ['builder_type', 'model', 'status']
});

// SSE Connection Metrics
export const sseConnections = new Gauge({
    name: 'sse_connections_active',
    help: 'Number of active SSE connections'
});

export const sseMessagesSent = new Counter({
    name: 'sse_messages_sent_total',
    help: 'Total number of SSE messages sent',
    labelNames: ['message_type']
});

// Memory Usage Custom Metric
export const memoryUsage = new Gauge({
    name: 'memory_usage_bytes',
    help: 'Memory usage in bytes',
    labelNames: ['type']
});

// Update memory metrics periodically
setInterval(() => {
    const usage = process.memoryUsage();
    memoryUsage.set({ type: 'rss' }, usage.rss);
    memoryUsage.set({ type: 'heapUsed' }, usage.heapUsed);
    memoryUsage.set({ type: 'heapTotal' }, usage.heapTotal);
    memoryUsage.set({ type: 'external' }, usage.external);
}, 10000); // Update every 10 seconds

/**
 * Express middleware to track HTTP request metrics
 */
export function metricsMiddleware(req, res, next) {
    const startTime = Date.now();
    
    // Increment active connections
    activeConnections.inc();
    
    // Track request start
    const end = httpRequestDuration.startTimer({
        method: req.method,
        route: req.route?.path || req.path
    });
    
    // Override res.end to capture metrics
    const originalEnd = res.end;
    res.end = function(...args) {
        const duration = (Date.now() - startTime) / 1000;
        const route = req.route?.path || req.path;
        
        // Record request duration
        httpRequestDuration
            .labels(req.method, route, res.statusCode.toString())
            .observe(duration);
        
        // Count total requests
        httpRequestsTotal
            .labels(req.method, route, res.statusCode.toString())
            .inc();
        
        // Count errors (4xx and 5xx status codes)
        if (res.statusCode >= 400) {
            const errorType = res.statusCode >= 500 ? 'server_error' : 'client_error';
            apiErrors
                .labels(req.method, route, errorType)
                .inc();
        }
        
        // Decrement active connections
        activeConnections.dec();
        
        // End the timer
        end();
        
        // Call original end method
        originalEnd.apply(this, args);
    };
    
    next();
}

/**
 * Database query metrics wrapper
 */
export function trackDbQuery(queryType, table, queryFunction) {
    return async (...args) => {
        const end = dbQueryDuration.startTimer({ query_type: queryType, table });
        
        try {
            const result = await queryFunction(...args);
            end();
            return result;
        } catch (error) {
            end();
            apiErrors.labels('database', table, 'db_error').inc();
            throw error;
        }
    };
}

/**
 * AI request metrics wrapper
 */
export function trackAiRequest(builderType, model, requestFunction) {
    return async (...args) => {
        const end = aiRequestDuration.startTimer({ builder_type: builderType, model });
        
        try {
            const result = await requestFunction(...args);
            aiRequestsTotal.labels(builderType, model, 'success').inc();
            end();
            return result;
        } catch (error) {
            aiRequestsTotal.labels(builderType, model, 'error').inc();
            end();
            throw error;
        }
    };
}

// Export the registry for metrics endpoint
export { register };
