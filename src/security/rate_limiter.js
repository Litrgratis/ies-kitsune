import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible';
import { auditLogger } from './audit_logger.js';
import appConfig from '../config.js';

/**
 * Enterprise Rate Limiting Module
 * Provides advanced rate limiting with multiple strategies and audit logging
 */

class EnterpriseRateLimiter {
  constructor(options = {}) {
    this.options = {
      // Default rate limiting options
      windowMs: options.windowMs || appConfig.rateLimit.windowMs || 900000, // 15 minutes
      maxRequests: options.maxRequests || appConfig.rateLimit.maxRequests || 100,
      skipSuccessfulRequests: options.skipSuccessfulRequests || false,
      skipFailedRequests: options.skipFailedRequests || false,
      
      // Redis configuration for distributed rate limiting
      redis: options.redis || null,
      
      // Custom key generators
      keyGenerator: options.keyGenerator || this.defaultKeyGenerator,
      
      // Custom handlers
      onLimitReached: options.onLimitReached || this.defaultOnLimitReached,
      
      // Rate limiting strategies
      strategies: options.strategies || {
        global: { windowMs: 900000, maxRequests: 1000 }, // Global limit
        perIP: { windowMs: 900000, maxRequests: 100 },   // Per IP limit
        perUser: { windowMs: 900000, maxRequests: 200 }, // Per user limit
        perEndpoint: { windowMs: 60000, maxRequests: 50 }, // Per endpoint limit
        burst: { windowMs: 60000, maxRequests: 20 }      // Burst protection
      }
    };

    this.limiters = {};
    this.initializeLimiters();
  }

  /**
   * Initialize rate limiters for different strategies
   */
  initializeLimiters() {
    for (const [strategyName, config] of Object.entries(this.options.strategies)) {
      if (this.options.redis) {
        this.limiters[strategyName] = new RateLimiterRedis({
          storeClient: this.options.redis,
          keyPrefix: `rl_${strategyName}`,
          points: config.maxRequests,
          duration: Math.floor(config.windowMs / 1000),
          execEvenly: true,
          blockDuration: config.blockDuration || Math.floor(config.windowMs / 1000)
        });
      } else {
        this.limiters[strategyName] = new RateLimiterMemory({
          keyPrefix: `rl_${strategyName}`,
          points: config.maxRequests,
          duration: Math.floor(config.windowMs / 1000),
          execEvenly: true,
          blockDuration: config.blockDuration || Math.floor(config.windowMs / 1000)
        });
      }
    }
  }

  /**
   * Default key generator for rate limiting
   */
  defaultKeyGenerator(req, strategy) {
    switch (strategy) {
      case 'global':
        return 'global';
      case 'perIP':
        return req.ip || req.connection.remoteAddress;
      case 'perUser':
        return req.user?.id || req.session?.userId || req.ip;
      case 'perEndpoint':
        return `${req.method}:${req.route?.path || req.path}`;
      case 'burst':
        return `burst:${req.ip}`;
      default:
        return req.ip;
    }
  }

  /**
   * Default handler when rate limit is reached
   */
  async defaultOnLimitReached(req, res, strategy, rateLimitInfo) {
    await auditLogger.logRateLimit({
      strategy,
      key: this.options.keyGenerator(req, strategy),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id || 'anonymous',
      endpoint: `${req.method} ${req.path}`,
      rateLimitInfo,
      timestamp: new Date().toISOString()
    });

    const resetTime = new Date(Date.now() + rateLimitInfo.msBeforeNext);
    
    res.set({
      'Retry-After': Math.round(rateLimitInfo.msBeforeNext / 1000) || 1,
      'X-RateLimit-Limit': rateLimitInfo.totalHits,
      'X-RateLimit-Remaining': Math.max(0, rateLimitInfo.remainingPoints || 0),
      'X-RateLimit-Reset': resetTime.toISOString()
    });

    return res.status(429).json({
      error: 'Too Many Requests',
      message: `Rate limit exceeded for ${strategy} strategy`,
      retryAfter: Math.round(rateLimitInfo.msBeforeNext / 1000),
      resetTime: resetTime.toISOString(),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Check rate limits for multiple strategies
   */
  async checkRateLimit(req, res, strategies = ['perIP', 'global']) {
    const results = {};
    
    for (const strategy of strategies) {
      const limiter = this.limiters[strategy];
      if (!limiter) {
        console.warn(`Rate limiter strategy '${strategy}' not found`);
        continue;
      }

      try {
        const key = this.options.keyGenerator(req, strategy);
        const rateLimitInfo = await limiter.consume(key);
        
        results[strategy] = {
          success: true,
          rateLimitInfo,
          key
        };

        // Set rate limit headers
        res.set({
          [`X-RateLimit-${strategy}-Limit`]: this.options.strategies[strategy].maxRequests,
          [`X-RateLimit-${strategy}-Remaining`]: Math.max(0, rateLimitInfo.remainingPoints || 0),
          [`X-RateLimit-${strategy}-Reset`]: new Date(Date.now() + rateLimitInfo.msBeforeNext).toISOString()
        });

      } catch (rateLimitInfo) {
        results[strategy] = {
          success: false,
          rateLimitInfo,
          key: this.options.keyGenerator(req, strategy)
        };

        // Rate limit exceeded for this strategy
        await this.options.onLimitReached(req, res, strategy, rateLimitInfo);
        return { allowed: false, strategy, rateLimitInfo };
      }
    }

    return { allowed: true, results };
  }

  /**
   * Create middleware for specific strategies
   */
  createMiddleware(strategies = ['perIP', 'global'], options = {}) {
    return async (req, res, next) => {
      try {
        const result = await this.checkRateLimit(req, res, strategies);
        
        if (!result.allowed) {
          return; // Response already sent by onLimitReached
        }

        // Log successful rate limit check
        if (options.logSuccess) {
          await auditLogger.logAccess({
            action: 'rate_limit_check_passed',
            strategies,
            ipAddress: req.ip,
            userId: req.user?.id || 'anonymous',
            endpoint: `${req.method} ${req.path}`,
            results: result.results
          });
        }

        next();
      } catch (error) {
        console.error('Rate limiting error:', error);
        await auditLogger.logError({
          action: 'rate_limit_error',
          error: error.message,
          stack: error.stack,
          ipAddress: req.ip,
          endpoint: `${req.method} ${req.path}`
        });
        
        // Continue without rate limiting in case of error
        next();
      }
    };
  }

  /**
   * Get rate limit status for a key
   */
  async getRateLimitStatus(key, strategy = 'perIP') {
    const limiter = this.limiters[strategy];
    if (!limiter) {
      throw new Error(`Rate limiter strategy '${strategy}' not found`);
    }

    try {
      const rateLimitInfo = await limiter.get(key);
      return {
        strategy,
        key,
        totalHits: rateLimitInfo?.totalHits || 0,
        remainingPoints: rateLimitInfo?.remainingPoints || this.options.strategies[strategy].maxRequests,
        msBeforeNext: rateLimitInfo?.msBeforeNext || 0,
        isBlocked: (rateLimitInfo?.remainingPoints || 1) <= 0
      };
    } catch (error) {
      console.error('Error getting rate limit status:', error);
      throw error;
    }
  }

  /**
   * Reset rate limit for a key
   */
  async resetRateLimit(key, strategy = 'perIP') {
    const limiter = this.limiters[strategy];
    if (!limiter) {
      throw new Error(`Rate limiter strategy '${strategy}' not found`);
    }

    try {
      await limiter.delete(key);
      
      await auditLogger.logSystem({
        action: 'rate_limit_reset',
        strategy,
        key,
        timestamp: new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      console.error('Error resetting rate limit:', error);
      throw error;
    }
  }

  /**
   * Block a specific key
   */
  async blockKey(key, strategy = 'perIP', durationMs = 3600000) { // 1 hour default
    const limiter = this.limiters[strategy];
    if (!limiter) {
      throw new Error(`Rate limiter strategy '${strategy}' not found`);
    }

    try {
      await limiter.block(key, Math.floor(durationMs / 1000));
      
      await auditLogger.logSecurity({
        action: 'key_blocked',
        strategy,
        key,
        duration: durationMs,
        timestamp: new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      console.error('Error blocking key:', error);
      throw error;
    }
  }

  /**
   * Get statistics for all strategies
   */
  async getStatistics() {
    const stats = {};
    
    for (const [strategyName, limiter] of Object.entries(this.limiters)) {
      try {
        // This would require custom implementation based on the storage backend
        stats[strategyName] = {
          strategy: strategyName,
          config: this.options.strategies[strategyName],
          // Additional stats would depend on the rate limiter implementation
        };
      } catch (error) {
        console.error(`Error getting stats for ${strategyName}:`, error);
        stats[strategyName] = { error: error.message };
      }
    }
    
    return stats;
  }
}

// Predefined rate limiting configurations
export const rateLimitConfigs = {
  // Standard API rate limiting
  api: {
    strategies: ['perIP', 'global'],
    perIP: { windowMs: 900000, maxRequests: 100 },
    global: { windowMs: 900000, maxRequests: 10000 }
  },

  // Strict rate limiting for authentication endpoints
  auth: {
    strategies: ['perIP', 'burst'],
    perIP: { windowMs: 900000, maxRequests: 10 },
    burst: { windowMs: 60000, maxRequests: 3 }
  },

  // File upload rate limiting
  upload: {
    strategies: ['perIP', 'perUser'],
    perIP: { windowMs: 3600000, maxRequests: 20 },
    perUser: { windowMs: 3600000, maxRequests: 50 }
  },

  // Public endpoint rate limiting
  public: {
    strategies: ['perIP'],
    perIP: { windowMs: 300000, maxRequests: 200 }
  }
};

// Create rate limiter instances
export const rateLimiter = new EnterpriseRateLimiter();

// Middleware shortcuts
export const apiRateLimit = rateLimiter.createMiddleware(['perIP', 'global']);
export const authRateLimit = rateLimiter.createMiddleware(['perIP', 'burst']);
export const uploadRateLimit = rateLimiter.createMiddleware(['perIP', 'perUser']);
export const publicRateLimit = rateLimiter.createMiddleware(['perIP']);

export default EnterpriseRateLimiter;
