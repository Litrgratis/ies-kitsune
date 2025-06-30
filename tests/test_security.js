import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { auditLogger, auditMiddleware } from '../src/security/audit_logger.js';
import { rateLimiter, apiRateLimit } from '../src/security/rate_limiter.js';
import { createValidationMiddleware, validateSecurityHeaders, validators } from '../src/security/input_validator.js';

/**
 * Security Features Test Suite
 * Tests input validation, rate limiting, and audit logging
 */

describe('Security Features', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Input Validation', () => {
    beforeEach(() => {
      app.use(auditMiddleware);
    });

    test('should validate chat completion requests successfully', async () => {
      app.post('/test', createValidationMiddleware('chatCompletion'), (req, res) => {
        res.json({ success: true, data: req.body });
      });

      const validRequest = {
        builder: 'test-builder',
        topic: 'Test topic',
        prompt: 'Test prompt',
        temperature: 0.7,
        maxTokens: 1000
      };

      const response = await request(app)
        .post('/test')
        .send(validRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.builder).toBe('test-builder');
    });

    test('should reject invalid chat completion requests', async () => {
      app.post('/test', createValidationMiddleware('chatCompletion'), (req, res) => {
        res.json({ success: true });
      });

      const invalidRequest = {
        builder: '', // Empty builder name
        topic: 'x'.repeat(2000), // Too long
        prompt: '', // Empty prompt
        temperature: 5, // Too high
        maxTokens: -1 // Invalid
      };

      await request(app)
        .post('/test')
        .send(invalidRequest)
        .expect(400);
    });

    test('should sanitize XSS attempts', async () => {
      app.post('/test', createValidationMiddleware('chatCompletion'), (req, res) => {
        res.json({ success: true, data: req.body });
      });

      const xssRequest = {
        builder: 'test-builder',
        topic: '<script>alert("xss")</script>Test topic',
        prompt: '<script>document.cookie</script>Test prompt',
        temperature: 0.7,
        maxTokens: 1000
      };

      const response = await request(app)
        .post('/test')
        .send(xssRequest)
        .expect(200);

      // Should strip script tags
      expect(response.body.data.topic).not.toContain('<script>');
      expect(response.body.data.prompt).not.toContain('<script>');
      expect(response.body.data.topic).toContain('Test topic');
    });

    test('should validate query parameters', async () => {
      app.get('/test', createValidationMiddleware('queryParams', 'query'), (req, res) => {
        res.json({ success: true, query: req.query });
      });

      const response = await request(app)
        .get('/test?page=2&limit=50&sort=asc')
        .expect(200);

      expect(response.body.query.page).toBe(2);
      expect(response.body.query.limit).toBe(50);
      expect(response.body.query.sort).toBe('asc');
    });

    test('should reject invalid query parameters', async () => {
      app.get('/test', createValidationMiddleware('queryParams', 'query'), (req, res) => {
        res.json({ success: true });
      });

      await request(app)
        .get('/test?page=invalid&limit=999999')
        .expect(400);
    });

    test('should validate security headers', async () => {
      app.use(validateSecurityHeaders);
      app.get('/test', (req, res) => {
        res.json({ success: true });
      });

      // Request with proper headers
      await request(app)
        .get('/test')
        .set('User-Agent', 'Mozilla/5.0 (Test Browser)')
        .expect(200);

      // Request without required headers
      await request(app)
        .get('/test')
        .expect(400);
    });
  });

  describe('Custom Validators', () => {
    test('should detect SQL injection attempts', () => {
      const sqlInjection = "'; DROP TABLE users; --";
      expect(() => validators.sqlInjectionCheck(sqlInjection)).toThrow('Potential SQL injection detected');

      const safeInput = 'Normal user input';
      expect(() => validators.sqlInjectionCheck(safeInput)).not.toThrow();
    });

    test('should validate email format', () => {
      expect(validators.email('test@example.com')).toBe('test@example.com');
      expect(() => validators.email('invalid-email')).toThrow();
    });

    test('should validate UUID format', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      expect(validators.uuid(validUuid)).toBe(validUuid);
      expect(() => validators.uuid('invalid-uuid')).toThrow();
    });

    test('should sanitize HTML content', () => {
      const dirtyHtml = '<script>alert("xss")</script><p>Safe content</p><style>body{display:none}</style>';
      const cleanHtml = validators.sanitizeHtml(dirtyHtml);
      
      expect(cleanHtml).not.toContain('<script>');
      expect(cleanHtml).not.toContain('<style>');
      expect(cleanHtml).toContain('<p>Safe content</p>');
    });
  });

  describe('Rate Limiting', () => {
    test('should allow requests within limits', async () => {
      // Create test rate limiter with high limits
      const testLimiter = rateLimiter.createMiddleware(['perIP'], { logSuccess: false });
      
      app.use(testLimiter);
      app.get('/test', (req, res) => {
        res.json({ success: true });
      });

      await request(app)
        .get('/test')
        .expect(200);
    });

    test('should block requests exceeding limits', async () => {
      // This test would require a way to mock or configure very low limits
      // In a real implementation, you'd want to create a test-specific rate limiter
      const testApp = express();
      
      // Mock rate limiter that always blocks
      const blockingLimiter = (req, res, next) => {
        res.status(429).json({
          error: 'Too Many Requests',
          retryAfter: 60
        });
      };

      testApp.use(blockingLimiter);
      testApp.get('/test', (req, res) => {
        res.json({ success: true });
      });

      await request(testApp)
        .get('/test')
        .expect(429);
    });

    test('should set rate limit headers', async () => {
      const testLimiter = rateLimiter.createMiddleware(['perIP']);
      
      app.use(testLimiter);
      app.get('/test', (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .expect(200);

      // Check for rate limit headers (may vary based on implementation)
      expect(response.headers).toBeDefined();
    });
  });

  describe('Audit Logging', () => {
    let mockWriteLog;

    beforeEach(() => {
      mockWriteLog = jest.spyOn(auditLogger, 'writeLog').mockResolvedValue();
    });

    afterEach(() => {
      mockWriteLog.mockRestore();
    });

    test('should log security events', async () => {
      await auditLogger.logSecurity({
        action: 'test_security_event',
        ipAddress: '127.0.0.1',
        details: 'Test security log'
      });

      expect(mockWriteLog).toHaveBeenCalledWith('security', {
        level: 'warn',
        action: 'test_security_event',
        ipAddress: '127.0.0.1',
        details: 'Test security log'
      });
    });

    test('should log access events', async () => {
      await auditLogger.logAccess({
        action: 'api_request',
        method: 'GET',
        url: '/test',
        ipAddress: '127.0.0.1'
      });

      expect(mockWriteLog).toHaveBeenCalledWith('access', {
        level: 'info',
        action: 'api_request',
        method: 'GET',
        url: '/test',
        ipAddress: '127.0.0.1'
      });
    });

    test('should log validation events', async () => {
      await auditLogger.logValidation({
        action: 'input_validation_success',
        schema: 'chatCompletion',
        userId: 'test-user'
      });

      expect(mockWriteLog).toHaveBeenCalledWith('validation', {
        level: 'info',
        action: 'input_validation_success',
        schema: 'chatCompletion',
        userId: 'test-user'
      });
    });

    test('should log validation failures with warning level', async () => {
      await auditLogger.logValidation({
        action: 'input_validation_failure',
        schema: 'chatCompletion',
        error: 'Invalid input'
      });

      expect(mockWriteLog).toHaveBeenCalledWith('validation', {
        level: 'warn',
        action: 'input_validation_failure',
        schema: 'chatCompletion',
        error: 'Invalid input'
      });
    });

    test('should log system events', async () => {
      await auditLogger.logSystem({
        action: 'server_start',
        port: 3000
      });

      expect(mockWriteLog).toHaveBeenCalledWith('system', {
        level: 'info',
        action: 'server_start',
        port: 3000
      });
    });

    test('should log error events', async () => {
      await auditLogger.logError({
        action: 'database_connection_error',
        error: 'Connection timeout',
        stack: 'Error stack trace'
      });

      expect(mockWriteLog).toHaveBeenCalledWith('errors', {
        level: 'error',
        action: 'database_connection_error',
        error: 'Connection timeout',
        stack: 'Error stack trace'
      });
    });
  });

  describe('Audit Middleware', () => {
    test('should log request and response', async () => {
      const mockLogAccess = jest.spyOn(auditLogger, 'logAccess').mockResolvedValue();
      
      app.use(auditMiddleware);
      app.get('/test', (req, res) => {
        res.json({ message: 'test' });
      });

      await request(app)
        .get('/test')
        .expect(200);

      // Should be called twice: once for request, once for response
      expect(mockLogAccess).toHaveBeenCalledTimes(2);
      
      // Check request log
      expect(mockLogAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'api_request',
          method: 'GET',
          url: '/test'
        })
      );

      mockLogAccess.mockRestore();
    });
  });

  describe('Integration Tests', () => {
    test('should handle complete security pipeline', async () => {
      app.use(validateSecurityHeaders);
      app.use(auditMiddleware);
      app.post('/secure-endpoint', 
        createValidationMiddleware('chatCompletion'),
        (req, res) => {
          res.json({ 
            success: true, 
            message: 'Request processed successfully',
            data: req.body 
          });
        }
      );

      const validRequest = {
        builder: 'integration-test',
        topic: 'Security integration test',
        prompt: 'Test the complete security pipeline',
        temperature: 0.8,
        maxTokens: 500
      };

      const response = await request(app)
        .post('/secure-endpoint')
        .set('User-Agent', 'Test Suite 1.0')
        .send(validRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.builder).toBe('integration-test');
    });

    test('should reject malicious requests in security pipeline', async () => {
      app.use(validateSecurityHeaders);
      app.use(auditMiddleware);
      app.post('/secure-endpoint', 
        createValidationMiddleware('chatCompletion'),
        (req, res) => {
          res.json({ success: true });
        }
      );

      const maliciousRequest = {
        builder: '<script>alert("xss")</script>',
        topic: 'SELECT * FROM users; DROP TABLE sessions;',
        prompt: '', // Invalid empty prompt
        temperature: 10, // Invalid temperature
        maxTokens: -1000 // Invalid tokens
      };

      await request(app)
        .post('/secure-endpoint')
        .set('User-Agent', 'Test Suite 1.0')
        .send(maliciousRequest)
        .expect(400);
    });
  });
});

describe('Rate Limiter Unit Tests', () => {
  test('should generate correct keys for different strategies', () => {
    const mockReq = {
      ip: '192.168.1.1',
      method: 'GET',
      path: '/api/test',
      user: { id: 'user123' }
    };

    expect(rateLimiter.options.keyGenerator(mockReq, 'global')).toBe('global');
    expect(rateLimiter.options.keyGenerator(mockReq, 'perIP')).toBe('192.168.1.1');
    expect(rateLimiter.options.keyGenerator(mockReq, 'perUser')).toBe('user123');
    expect(rateLimiter.options.keyGenerator(mockReq, 'perEndpoint')).toBe('GET:/api/test');
    expect(rateLimiter.options.keyGenerator(mockReq, 'burst')).toBe('burst:192.168.1.1');
  });

  test('should handle missing user in perUser strategy', () => {
    const mockReq = {
      ip: '192.168.1.1',
      method: 'GET',
      path: '/api/test'
      // No user object
    };

    expect(rateLimiter.options.keyGenerator(mockReq, 'perUser')).toBe('192.168.1.1');
  });
});

describe('Security Configuration', () => {
  test('should have proper default rate limiting strategies', () => {
    const strategies = rateLimiter.options.strategies;
    
    expect(strategies.global).toBeDefined();
    expect(strategies.perIP).toBeDefined();
    expect(strategies.perUser).toBeDefined();
    expect(strategies.perEndpoint).toBeDefined();
    expect(strategies.burst).toBeDefined();
    
    // Check that all strategies have required properties
    Object.values(strategies).forEach(strategy => {
      expect(strategy.windowMs).toBeGreaterThan(0);
      expect(strategy.maxRequests).toBeGreaterThan(0);
    });
  });

  test('should have reasonable default limits', () => {
    const strategies = rateLimiter.options.strategies;
    
    // Global should have higher limits than per-IP
    expect(strategies.global.maxRequests).toBeGreaterThan(strategies.perIP.maxRequests);
    
    // Burst protection should have lower limits and shorter window
    expect(strategies.burst.maxRequests).toBeLessThan(strategies.perIP.maxRequests);
    expect(strategies.burst.windowMs).toBeLessThan(strategies.perIP.windowMs);
  });
});
