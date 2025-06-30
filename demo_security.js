#!/usr/bin/env node

/**
 * Security Features Demonstration
 * Shows input validation, rate limiting, and audit logging in action
 */

import express from 'express';
import { auditLogger, auditMiddleware } from './src/security/audit_logger.js';
import { apiRateLimit } from './src/security/rate_limiter.js';
import { createValidationMiddleware, validateSecurityHeaders } from './src/security/input_validator.js';
import securityRoutes from './src/security/security_routes.js';

const app = express();
const PORT = 3001; // Use different port to avoid conflicts

// Middleware setup
app.use(express.json());
app.use(validateSecurityHeaders);
app.use(auditMiddleware);

// Security routes
app.use('/api/security', apiRateLimit, securityRoutes);

// Demo endpoint with full security
app.post('/api/demo/secure-chat', 
  apiRateLimit,
  createValidationMiddleware('chatCompletion'),
  async (req, res) => {
    try {
      // Log the successful request
      await auditLogger.logAccess({
        action: 'secure_chat_request',
        userId: 'demo-user',
        ipAddress: req.ip,
        data: {
          builder: req.body.builder,
          topic: req.body.topic.substring(0, 50) + '...'
        }
      });

      // Simulate processing
      const response = {
        success: true,
        message: 'Secure chat request processed successfully',
        data: {
          builder: req.body.builder,
          topic: req.body.topic,
          response: `AI response for ${req.body.builder}: ${req.body.prompt}`,
          security: {
            validated: true,
            sanitized: true,
            logged: true
          }
        },
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      await auditLogger.logError({
        action: 'secure_chat_error',
        error: error.message,
        stack: error.stack,
        ipAddress: req.ip
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to process secure chat request',
        timestamp: new Date().toISOString()
      });
    }
  }
);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    features: {
      inputValidation: 'enabled',
      rateLimiting: 'enabled',
      auditLogging: 'enabled'
    },
    timestamp: new Date().toISOString()
  });
});

// Demo endpoint that will fail validation
app.post('/api/demo/insecure-test', 
  createValidationMiddleware('chatCompletion'),
  (req, res) => {
    res.json({ message: 'This should not be reached if validation fails' });
  }
);

// Start server
const server = app.listen(PORT, () => {
  console.log('🔒 Security Demo Server Running');
  console.log(`🌐 Server: http://localhost:${PORT}`);
  console.log(`🩺 Health: http://localhost:${PORT}/health`);
  console.log(`🔐 Security Admin: http://localhost:${PORT}/api/security/health`);
  console.log('');
  console.log('📋 Demo Commands:');
  console.log('');
  console.log('1. Test Valid Request:');
  console.log(`curl -X POST http://localhost:${PORT}/api/demo/secure-chat \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -H "User-Agent: Demo-Client/1.0" \\`);
  console.log(`  -d '{`);
  console.log(`    "builder": "demo-builder",`);
  console.log(`    "topic": "Test security features",`);
  console.log(`    "prompt": "How does enterprise security work?",`);
  console.log(`    "temperature": 0.7,`);
  console.log(`    "maxTokens": 1000`);
  console.log(`  }'`);
  console.log('');
  console.log('2. Test Invalid Request (will fail validation):');
  console.log(`curl -X POST http://localhost:${PORT}/api/demo/insecure-test \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -H "User-Agent: Demo-Client/1.0" \\`);
  console.log(`  -d '{`);
  console.log(`    "builder": "",`);
  console.log(`    "topic": "<script>alert('xss')</script>",`);
  console.log(`    "prompt": "",`);
  console.log(`    "temperature": 10,`);
  console.log(`    "maxTokens": -1`);
  console.log(`  }'`);
  console.log('');
  console.log('3. Test Rate Limiting (make multiple requests rapidly)');
  console.log('');
  console.log('4. Check Security Health:');
  console.log(`curl http://localhost:${PORT}/api/security/health`);
  console.log('');
  console.log('Press Ctrl+C to stop the demo server');
});

// Log server start
await auditLogger.logSystem({
  action: 'demo_server_start',
  port: PORT,
  features: ['input_validation', 'rate_limiting', 'audit_logging']
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down demo server...');
  
  await auditLogger.logSystem({
    action: 'demo_server_shutdown',
    reason: 'SIGTERM'
  });
  
  server.close(() => {
    console.log('✅ Demo server shut down gracefully');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down demo server...');
  
  await auditLogger.logSystem({
    action: 'demo_server_shutdown',
    reason: 'SIGINT'
  });
  
  server.close(() => {
    console.log('✅ Demo server shut down gracefully');
    process.exit(0);
  });
});
