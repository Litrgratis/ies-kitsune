import express from 'express';
import { auditLogger } from './audit_logger.js';
import { rateLimiter } from './rate_limiter.js';
import { createValidationMiddleware } from './input_validator.js';

/**
 * Security Management API Routes
 * Provides endpoints for security monitoring, audit reporting, and administration
 */

const router = express.Router();

/**
 * Security middleware for admin routes
 */
function requireAdmin(req, res, next) {
  // For now, implement basic admin check
  // In production, implement proper authentication
  const adminKey = req.get('X-Admin-Key');
  const expectedKey = process.env.ADMIN_API_KEY || 'admin-key-change-me';
  
  if (!adminKey || adminKey !== expectedKey) {
    auditLogger.logSecurity({
      action: 'unauthorized_admin_access_attempt',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
      providedKey: adminKey ? '[REDACTED]' : null
    });
    
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Admin access required',
      timestamp: new Date().toISOString()
    });
  }
  
  next();
}

/**
 * Get audit logs
 * GET /security/audit/logs
 */
router.get('/audit/logs', requireAdmin, createValidationMiddleware('queryParams', 'query'), async (req, res) => {
  try {
    const { page, limit, sort } = req.query;
    const query = req.query.search || '';
    const category = req.query.category || 'all';
    
    const results = await auditLogger.searchLogs(query, category, limit);
    
    // Paginate results
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedResults = results.slice(startIndex, endIndex);
    
    auditLogger.logAccess({
      action: 'audit_logs_accessed',
      userId: req.user?.id || 'admin',
      ipAddress: req.ip,
      query,
      category,
      resultCount: results.length
    });
    
    res.json({
      success: true,
      data: {
        logs: paginatedResults,
        pagination: {
          page,
          limit,
          total: results.length,
          totalPages: Math.ceil(results.length / limit)
        },
        metadata: {
          query,
          category,
          timestamp: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    auditLogger.logError({
      action: 'audit_logs_access_error',
      error: error.message,
      stack: error.stack,
      userId: req.user?.id || 'admin',
      ipAddress: req.ip
    });
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve audit logs',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Generate audit report
 * POST /security/audit/report
 */
router.post('/audit/report', requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, categories } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'startDate and endDate are required',
        timestamp: new Date().toISOString()
      });
    }
    
    const report = await auditLogger.generateAuditReport(
      startDate,
      endDate,
      categories || ['security', 'access', 'validation']
    );
    
    auditLogger.logAccess({
      action: 'audit_report_generated',
      userId: req.user?.id || 'admin',
      ipAddress: req.ip,
      reportPeriod: { startDate, endDate },
      categories: categories || ['security', 'access', 'validation'],
      eventCount: report.events.length
    });
    
    res.json({
      success: true,
      data: report,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    auditLogger.logError({
      action: 'audit_report_generation_error',
      error: error.message,
      stack: error.stack,
      userId: req.user?.id || 'admin',
      ipAddress: req.ip
    });
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate audit report',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get rate limit statistics
 * GET /security/rate-limit/stats
 */
router.get('/rate-limit/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await rateLimiter.getStatistics();
    
    auditLogger.logAccess({
      action: 'rate_limit_stats_accessed',
      userId: req.user?.id || 'admin',
      ipAddress: req.ip
    });
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    auditLogger.logError({
      action: 'rate_limit_stats_error',
      error: error.message,
      stack: error.stack,
      userId: req.user?.id || 'admin',
      ipAddress: req.ip
    });
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve rate limit statistics',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get rate limit status for a specific key
 * GET /security/rate-limit/status/:strategy/:key
 */
router.get('/rate-limit/status/:strategy/:key', requireAdmin, async (req, res) => {
  try {
    const { strategy, key } = req.params;
    
    const status = await rateLimiter.getRateLimitStatus(key, strategy);
    
    auditLogger.logAccess({
      action: 'rate_limit_status_checked',
      userId: req.user?.id || 'admin',
      ipAddress: req.ip,
      strategy,
      key
    });
    
    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    auditLogger.logError({
      action: 'rate_limit_status_error',
      error: error.message,
      stack: error.stack,
      userId: req.user?.id || 'admin',
      ipAddress: req.ip,
      strategy: req.params.strategy,
      key: req.params.key
    });
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get rate limit status',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Reset rate limit for a specific key
 * DELETE /security/rate-limit/:strategy/:key
 */
router.delete('/rate-limit/:strategy/:key', requireAdmin, async (req, res) => {
  try {
    const { strategy, key } = req.params;
    
    await rateLimiter.resetRateLimit(key, strategy);
    
    auditLogger.logSecurity({
      action: 'rate_limit_reset_by_admin',
      userId: req.user?.id || 'admin',
      ipAddress: req.ip,
      strategy,
      key,
      reason: req.body.reason || 'Admin reset'
    });
    
    res.json({
      success: true,
      message: `Rate limit reset for ${strategy}:${key}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    auditLogger.logError({
      action: 'rate_limit_reset_error',
      error: error.message,
      stack: error.stack,
      userId: req.user?.id || 'admin',
      ipAddress: req.ip,
      strategy: req.params.strategy,
      key: req.params.key
    });
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to reset rate limit',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Block a specific key
 * POST /security/rate-limit/block
 */
router.post('/rate-limit/block', requireAdmin, async (req, res) => {
  try {
    const { strategy, key, duration, reason } = req.body;
    
    if (!strategy || !key) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'strategy and key are required',
        timestamp: new Date().toISOString()
      });
    }
    
    const durationMs = duration || 3600000; // 1 hour default
    
    await rateLimiter.blockKey(key, strategy, durationMs);
    
    auditLogger.logSecurity({
      action: 'key_blocked_by_admin',
      userId: req.user?.id || 'admin',
      ipAddress: req.ip,
      strategy,
      key,
      duration: durationMs,
      reason: reason || 'Admin block'
    });
    
    res.json({
      success: true,
      message: `Key ${key} blocked for ${strategy} strategy`,
      duration: durationMs,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    auditLogger.logError({
      action: 'key_block_error',
      error: error.message,
      stack: error.stack,
      userId: req.user?.id || 'admin',
      ipAddress: req.ip,
      requestBody: req.body
    });
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to block key',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get security metrics dashboard
 * GET /security/dashboard
 */
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    const timeRange = req.query.range || '24h';
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
      case '1h':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
    
    const [securityReport, accessReport, validationReport] = await Promise.all([
      auditLogger.generateAuditReport(startDate.toISOString(), now.toISOString(), ['security']),
      auditLogger.generateAuditReport(startDate.toISOString(), now.toISOString(), ['access']),
      auditLogger.generateAuditReport(startDate.toISOString(), now.toISOString(), ['validation'])
    ]);
    
    const rateLimitStats = await rateLimiter.getStatistics();
    
    const dashboard = {
      timeRange,
      period: {
        start: startDate.toISOString(),
        end: now.toISOString()
      },
      summary: {
        security: securityReport.summary.security || { totalEvents: 0, uniqueIPs: 0, errorCount: 0 },
        access: accessReport.summary.access || { totalEvents: 0, uniqueIPs: 0, errorCount: 0 },
        validation: validationReport.summary.validation || { totalEvents: 0, uniqueIPs: 0, errorCount: 0 }
      },
      rateLimitStats,
      recentSecurityEvents: securityReport.events.slice(-10),
      topIPs: this.getTopIPs([...securityReport.events, ...accessReport.events]),
      timestamp: new Date().toISOString()
    };
    
    auditLogger.logAccess({
      action: 'security_dashboard_accessed',
      userId: req.user?.id || 'admin',
      ipAddress: req.ip,
      timeRange
    });
    
    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    auditLogger.logError({
      action: 'security_dashboard_error',
      error: error.message,
      stack: error.stack,
      userId: req.user?.id || 'admin',
      ipAddress: req.ip
    });
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to load security dashboard',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Helper function to get top IPs by request count
 */
function getTopIPs(events, limit = 10) {
  const ipCounts = {};
  
  events.forEach(event => {
    if (event.ipAddress) {
      ipCounts[event.ipAddress] = (ipCounts[event.ipAddress] || 0) + 1;
    }
  });
  
  return Object.entries(ipCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, limit)
    .map(([ip, count]) => ({ ip, count }));
}

/**
 * Test security endpoint (for monitoring)
 * GET /security/health
 */
router.get('/health', async (req, res) => {
  try {
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      components: {
        auditLogger: 'operational',
        rateLimiter: 'operational',
        inputValidator: 'operational'
      }
    };
    
    // Test audit logger
    try {
      await auditLogger.logSystem({
        action: 'health_check',
        component: 'audit_logger'
      });
    } catch (error) {
      healthCheck.components.auditLogger = 'degraded';
      healthCheck.status = 'degraded';
    }
    
    // Test rate limiter
    try {
      await rateLimiter.getStatistics();
    } catch (error) {
      healthCheck.components.rateLimiter = 'degraded';
      healthCheck.status = 'degraded';
    }
    
    res.json(healthCheck);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
