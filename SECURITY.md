# IES/Kitsune Security Features

This document describes the enterprise security features implemented in IES/Kitsune.

## Overview

The security implementation includes three main components:
- **Input Validation**: Comprehensive data validation and sanitization
- **Rate Limiting**: Multi-strategy rate limiting with audit logging
- **Audit Logging**: Structured logging for security events and compliance

## Features

### 1. Input Validation (`src/security/input_validator.js`)

Provides comprehensive validation for all user inputs using Zod schemas and XSS protection.

#### Key Features:
- **Schema-based validation** for different input types
- **XSS protection** using sanitization
- **SQL injection detection**
- **Security header validation**
- **Audit logging** for all validation attempts

#### Usage:
```javascript
import { createValidationMiddleware } from './security/input_validator.js';

// Validate chat completion requests
app.post('/api/chat', createValidationMiddleware('chatCompletion'), (req, res) => {
  // req.body is now validated and sanitized
});
```

#### Validation Schemas:
- `chatCompletion`: AI chat requests
- `session`: Session management
- `queryParams`: URL query parameters
- `fileUpload`: File upload validation

### 2. Rate Limiting (`src/security/rate_limiter.js`)

Advanced rate limiting with multiple strategies and distributed support.

#### Rate Limiting Strategies:
- **Per IP**: Limits requests per IP address
- **Per User**: Limits requests per authenticated user
- **Per Endpoint**: Limits requests per API endpoint
- **Global**: Overall system limits
- **Burst Protection**: Prevents rapid successive requests

#### Configuration Examples:
```javascript
// Standard API rate limiting
export const apiRateLimit = rateLimiter.createMiddleware(['perIP', 'global']);

// Strict auth endpoint limiting
export const authRateLimit = rateLimiter.createMiddleware(['perIP', 'burst']);
```

#### Rate Limit Headers:
The system automatically adds rate limit headers to responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in window
- `X-RateLimit-Reset`: When the rate limit resets
- `Retry-After`: Seconds to wait before retrying (when limited)

### 3. Audit Logging (`src/security/audit_logger.js`)

Comprehensive audit logging system with structured JSON logs and automatic rotation.

#### Log Categories:
- **Security**: Authentication failures, suspicious activity
- **Access**: API requests, data access
- **Validation**: Input validation events
- **System**: System events, health checks
- **Errors**: Application errors

#### Features:
- **Automatic log rotation** when files exceed size limits
- **Structured JSON logging** for easy parsing
- **Search functionality** across all log categories
- **Audit report generation** for compliance
- **Configurable retention policies**

#### Log File Locations:
- `logs/security-audit.log`: Security events
- `logs/access-audit.log`: Access logs
- `logs/validation-audit.log`: Validation events
- `logs/system-audit.log`: System events
- `logs/error-audit.log`: Error logs

## Security API Endpoints

### Authentication
All admin endpoints require the `X-Admin-Key` header with a valid admin key.

### Available Endpoints:

#### Get Audit Logs
```
GET /api/security/audit/logs?search=query&category=security&page=1&limit=10
```

#### Generate Audit Report
```
POST /api/security/audit/report
{
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-01-31T23:59:59Z",
  "categories": ["security", "access"]
}
```

#### Rate Limit Management
```
GET /api/security/rate-limit/stats
GET /api/security/rate-limit/status/:strategy/:key
DELETE /api/security/rate-limit/:strategy/:key
POST /api/security/rate-limit/block
```

#### Security Dashboard
```
GET /api/security/dashboard?range=24h
```

#### Health Check
```
GET /api/security/health
```

## Configuration

### Environment Variables

```bash
# Security
SESSION_SECRET=your-secure-session-secret
ADMIN_API_KEY=your-admin-api-key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000    # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100    # Max requests per window

# Audit Logging
LOG_LEVEL=info
LOG_DIR=./logs
MAX_LOG_FILE_SIZE=10485760     # 10MB
MAX_LOG_FILES=10
AUDIT_RETENTION_DAYS=90

# Redis (optional for distributed rate limiting)
REDIS_URL=redis://localhost:6379
```

### Rate Limiting Configuration

Default rate limiting strategies can be customized in `src/security/rate_limiter.js`:

```javascript
const strategies = {
  global: { windowMs: 900000, maxRequests: 1000 },
  perIP: { windowMs: 900000, maxRequests: 100 },
  perUser: { windowMs: 900000, maxRequests: 200 },
  perEndpoint: { windowMs: 60000, maxRequests: 50 },
  burst: { windowMs: 60000, maxRequests: 20 }
};
```

## Security Best Practices

### 1. Environment Configuration
- Change default admin API key in production
- Use strong session secrets
- Enable HTTPS in production
- Configure proper CORS origins

### 2. Rate Limiting
- Adjust rate limits based on your traffic patterns
- Use Redis for distributed deployments
- Monitor rate limit metrics regularly

### 3. Audit Logging
- Regularly review security logs
- Set up automated alerting for suspicious events
- Implement log backup and archiving
- Ensure compliance with data retention policies

### 4. Input Validation
- Regularly update validation schemas
- Monitor validation failure patterns
- Implement additional custom validators as needed

## Monitoring and Alerting

### Key Metrics to Monitor:
- Rate limit violations per IP/user
- Input validation failures
- Authentication failures
- Unusual access patterns
- Error rates and types

### Log Analysis:
```bash
# Search for failed authentication attempts
grep "unauthorized_admin_access_attempt" logs/security-audit.log

# Find rate limit violations
grep "rate_limit_exceeded" logs/security-audit.log

# Check validation failures
grep "input_validation_failure" logs/validation-audit.log
```

## Compliance

The audit logging system supports various compliance requirements:

- **GDPR**: User data access logging
- **SOX**: Financial data access tracking
- **HIPAA**: Healthcare data access auditing
- **PCI DSS**: Payment data security logging

## Troubleshooting

### Common Issues:

1. **Rate Limit False Positives**
   - Check if shared IP addresses are causing issues
   - Adjust rate limits for your use case
   - Consider implementing user-based limits

2. **Log Storage Issues**
   - Ensure sufficient disk space for logs
   - Configure log rotation properly
   - Implement log archiving strategy

3. **Validation Errors**
   - Review validation schemas for correctness
   - Check for schema version mismatches
   - Monitor validation failure patterns

### Support

For security-related issues or questions:
1. Check the audit logs for detailed error information
2. Review the security dashboard for patterns
3. Consult this documentation for configuration options
