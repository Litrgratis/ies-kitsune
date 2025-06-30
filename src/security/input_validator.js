import { z } from 'zod';
import xss from 'xss';
import { auditLogger } from './audit_logger.js';

/**
 * Enterprise Input Validation Module
 * Provides comprehensive validation for all user inputs
 */

// Schema definitions for different input types
const schemas = {
  // Chat completion request validation
  chatCompletion: z.object({
    builder: z.string()
      .min(1, 'Builder name is required')
      .max(50, 'Builder name too long')
      .regex(/^[a-zA-Z0-9_-]+$/, 'Builder name contains invalid characters'),
    
    topic: z.string()
      .min(1, 'Topic is required')
      .max(1000, 'Topic too long')
      .transform((val) => xss(val, { 
        whiteList: {}, // No HTML allowed
        stripIgnoreTag: true,
        stripIgnoreTagBody: ['script']
      })),
    
    prompt: z.string()
      .min(1, 'Prompt is required')
      .max(5000, 'Prompt too long')
      .transform((val) => xss(val, {
        whiteList: {},
        stripIgnoreTag: true,
        stripIgnoreTagBody: ['script']
      })),
    
    temperature: z.number()
      .min(0, 'Temperature must be >= 0')
      .max(2, 'Temperature must be <= 2')
      .optional()
      .default(0.7),
    
    maxTokens: z.number()
      .min(1, 'Max tokens must be >= 1')
      .max(4000, 'Max tokens must be <= 4000')
      .optional()
      .default(1000)
  }),

  // Session management validation
  session: z.object({
    sessionId: z.string()
      .uuid('Invalid session ID format'),
    
    userId: z.string()
      .min(1, 'User ID is required')
      .max(100, 'User ID too long')
      .regex(/^[a-zA-Z0-9_@.-]+$/, 'User ID contains invalid characters'),
    
    metadata: z.object({
      userAgent: z.string().max(500).optional(),
      ipAddress: z.string().ip().optional(),
      timestamp: z.string().datetime().optional()
    }).optional()
  }),

  // Query parameters validation
  queryParams: z.object({
    page: z.string()
      .regex(/^\d+$/, 'Page must be a number')
      .transform((val) => parseInt(val))
      .refine((val) => val >= 1 && val <= 1000, 'Page must be between 1 and 1000')
      .optional()
      .default(1),
    
    limit: z.string()
      .regex(/^\d+$/, 'Limit must be a number')
      .transform((val) => parseInt(val))
      .refine((val) => val >= 1 && val <= 100, 'Limit must be between 1 and 100')
      .optional()
      .default(10),
    
    sort: z.enum(['asc', 'desc', 'created_at', 'updated_at'])
      .optional()
      .default('desc')
  }),

  // File upload validation
  fileUpload: z.object({
    filename: z.string()
      .min(1, 'Filename is required')
      .max(255, 'Filename too long')
      .regex(/^[a-zA-Z0-9._-]+$/, 'Filename contains invalid characters'),
    
    mimeType: z.enum([
      'application/json',
      'text/plain',
      'text/csv',
      'application/pdf'
    ], 'Unsupported file type'),
    
    size: z.number()
      .min(1, 'File cannot be empty')
      .max(10 * 1024 * 1024, 'File size cannot exceed 10MB')
  })
};

/**
 * Validation middleware factory
 */
export function createValidationMiddleware(schemaName, target = 'body') {
  return (req, res, next) => {
    try {
      const schema = schemas[schemaName];
      if (!schema) {
        throw new Error(`Unknown validation schema: ${schemaName}`);
      }

      let dataToValidate;
      switch (target) {
        case 'body':
          dataToValidate = req.body;
          break;
        case 'query':
          dataToValidate = req.query;
          break;
        case 'params':
          dataToValidate = req.params;
          break;
        default:
          throw new Error(`Unknown validation target: ${target}`);
      }

      const result = schema.parse(dataToValidate);
      
      // Replace the original data with validated/sanitized data
      if (target === 'body') {
        req.body = result;
      } else if (target === 'query') {
        req.query = result;
      } else if (target === 'params') {
        req.params = result;
      }

      // Log successful validation
      auditLogger.logValidation({
        action: 'input_validation_success',
        schema: schemaName,
        target,
        userId: req.user?.id || 'anonymous',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });

      next();
    } catch (error) {
      // Log validation failure
      auditLogger.logValidation({
        action: 'input_validation_failure',
        schema: schemaName,
        target,
        error: error.message,
        userId: req.user?.id || 'anonymous',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
        rejectedData: JSON.stringify(req[target])
      });

      res.status(400).json({
        error: 'Validation failed',
        details: error.errors || error.message,
        timestamp: new Date().toISOString()
      });
    }
  };
}

/**
 * Custom validation functions
 */
export const validators = {
  /**
   * Validate and sanitize SQL-like inputs
   */
  sqlInjectionCheck: (input) => {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
      /(--|\#|\/\*|\*\/)/g,
      /(\bOR\b.*=.*|AND.*=.*)/gi,
      /('|(\\x27)|(\\x2D\\x2D))/g
    ];

    for (const pattern of sqlPatterns) {
      if (pattern.test(input)) {
        throw new Error('Potential SQL injection detected');
      }
    }
    return input;
  },

  /**
   * Validate email format
   */
  email: (email) => {
    const emailSchema = z.string().email('Invalid email format');
    return emailSchema.parse(email);
  },

  /**
   * Validate UUID format
   */
  uuid: (uuid) => {
    const uuidSchema = z.string().uuid('Invalid UUID format');
    return uuidSchema.parse(uuid);
  },

  /**
   * Sanitize HTML content
   */
  sanitizeHtml: (html) => {
    return xss(html, {
      whiteList: {
        p: [],
        br: [],
        strong: [],
        em: [],
        u: [],
        ol: [],
        ul: [],
        li: []
      },
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script', 'style']
    });
  }
};

/**
 * Security headers validation
 */
export function validateSecurityHeaders(req, res, next) {
  const requiredHeaders = ['user-agent'];
  const suspiciousPatterns = [
    /bot|crawler|spider/i,
    /curl|wget|postman/i,
    /automated|script/i
  ];

  // Check for required headers
  for (const header of requiredHeaders) {
    if (!req.get(header)) {
      auditLogger.logSecurity({
        action: 'missing_required_header',
        header,
        ipAddress: req.ip,
        timestamp: new Date().toISOString()
      });
      
      return res.status(400).json({
        error: 'Required headers missing',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Check for suspicious user agents
  const userAgent = req.get('user-agent');
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(userAgent)) {
      auditLogger.logSecurity({
        action: 'suspicious_user_agent',
        userAgent,
        ipAddress: req.ip,
        timestamp: new Date().toISOString()
      });
      break;
    }
  }

  next();
}

export default {
  createValidationMiddleware,
  validators,
  validateSecurityHeaders,
  schemas
};
