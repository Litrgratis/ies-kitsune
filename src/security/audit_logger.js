import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Enterprise Audit Logger
 * Provides comprehensive audit logging for security events, user actions, and system events
 */

class AuditLogger {
  constructor(options = {}) {
    this.logsDir = options.logsDir || path.join(__dirname, '../../logs');
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB
    this.maxFiles = options.maxFiles || 10;
    this.logLevel = options.logLevel || 'info';
    
    this.logFiles = {
      security: 'security-audit.log',
      access: 'access-audit.log',
      validation: 'validation-audit.log',
      system: 'system-audit.log',
      errors: 'error-audit.log'
    };

    this.initializeLogsDirectory();
  }

  async initializeLogsDirectory() {
    try {
      await fs.mkdir(this.logsDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create logs directory:', error);
    }
  }

  /**
   * Write log entry to specified log file
   */
  async writeLog(category, entry) {
    try {
      const logFile = path.join(this.logsDir, this.logFiles[category]);
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: entry.level || 'info',
        category,
        ...entry
      };

      const logLine = JSON.stringify(logEntry) + '\n';

      // Check file size and rotate if necessary
      await this.rotateLogIfNeeded(logFile);
      
      await fs.appendFile(logFile, logLine);
      
      // Also log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[${category.toUpperCase()}]`, logEntry);
      }
    } catch (error) {
      console.error(`Failed to write audit log for ${category}:`, error);
    }
  }

  /**
   * Rotate log file if it exceeds maximum size
   */
  async rotateLogIfNeeded(logFile) {
    try {
      const stats = await fs.stat(logFile);
      if (stats.size >= this.maxFileSize) {
        await this.rotateLogFile(logFile);
      }
    } catch (error) {
      // File doesn't exist yet, no need to rotate
      if (error.code !== 'ENOENT') {
        console.error('Error checking log file size:', error);
      }
    }
  }

  /**
   * Rotate log file by renaming and creating new one
   */
  async rotateLogFile(logFile) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rotatedFile = `${logFile}.${timestamp}`;
      
      await fs.rename(logFile, rotatedFile);
      
      // Clean up old rotated files
      await this.cleanupOldLogs(path.dirname(logFile), path.basename(logFile));
    } catch (error) {
      console.error('Error rotating log file:', error);
    }
  }

  /**
   * Clean up old rotated log files
   */
  async cleanupOldLogs(directory, baseFileName) {
    try {
      const files = await fs.readdir(directory);
      const logFiles = files
        .filter(file => file.startsWith(baseFileName) && file !== baseFileName)
        .map(file => ({
          name: file,
          path: path.join(directory, file),
          stat: null
        }));

      // Get file stats
      for (const file of logFiles) {
        try {
          file.stat = await fs.stat(file.path);
        } catch (error) {
          console.error(`Error getting stats for ${file.name}:`, error);
        }
      }

      // Sort by modification time (newest first)
      logFiles.sort((a, b) => {
        if (!a.stat || !b.stat) return 0;
        return b.stat.mtime - a.stat.mtime;
      });

      // Remove old files if we have more than maxFiles
      if (logFiles.length > this.maxFiles) {
        const filesToDelete = logFiles.slice(this.maxFiles);
        for (const file of filesToDelete) {
          try {
            await fs.unlink(file.path);
          } catch (error) {
            console.error(`Error deleting old log file ${file.name}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up old logs:', error);
    }
  }

  /**
   * Log security-related events
   */
  async logSecurity(entry) {
    await this.writeLog('security', {
      level: 'warn',
      ...entry
    });
  }

  /**
   * Log access attempts and API usage
   */
  async logAccess(entry) {
    await this.writeLog('access', {
      level: 'info',
      ...entry
    });
  }

  /**
   * Log input validation events
   */
  async logValidation(entry) {
    await this.writeLog('validation', {
      level: entry.action.includes('failure') ? 'warn' : 'info',
      ...entry
    });
  }

  /**
   * Log system events
   */
  async logSystem(entry) {
    await this.writeLog('system', {
      level: 'info',
      ...entry
    });
  }

  /**
   * Log error events
   */
  async logError(entry) {
    await this.writeLog('errors', {
      level: 'error',
      ...entry
    });
  }

  /**
   * Log rate limiting events
   */
  async logRateLimit(entry) {
    await this.writeLog('security', {
      level: 'warn',
      action: 'rate_limit_exceeded',
      ...entry
    });
  }

  /**
   * Log authentication events
   */
  async logAuth(entry) {
    await this.writeLog('security', {
      level: entry.action.includes('failure') ? 'warn' : 'info',
      ...entry
    });
  }

  /**
   * Log data access events (for compliance)
   */
  async logDataAccess(entry) {
    await this.writeLog('access', {
      level: 'info',
      action: 'data_access',
      ...entry
    });
  }

  /**
   * Generate audit report for a specific time range
   */
  async generateAuditReport(startDate, endDate, categories = ['security', 'access']) {
    const report = {
      period: { start: startDate, end: endDate },
      categories,
      summary: {},
      events: []
    };

    try {
      for (const category of categories) {
        const logFile = path.join(this.logsDir, this.logFiles[category]);
        try {
          const content = await fs.readFile(logFile, 'utf8');
          const lines = content.trim().split('\n').filter(line => line);
          
          const categoryEvents = [];
          for (const line of lines) {
            try {
              const event = JSON.parse(line);
              const eventDate = new Date(event.timestamp);
              
              if (eventDate >= new Date(startDate) && eventDate <= new Date(endDate)) {
                categoryEvents.push(event);
              }
            } catch (parseError) {
              console.error('Error parsing log line:', parseError);
            }
          }
          
          report.events.push(...categoryEvents);
          report.summary[category] = {
            totalEvents: categoryEvents.length,
            uniqueIPs: [...new Set(categoryEvents.map(e => e.ipAddress).filter(Boolean))].length,
            errorCount: categoryEvents.filter(e => e.level === 'error' || e.level === 'warn').length
          };
        } catch (error) {
          if (error.code !== 'ENOENT') {
            console.error(`Error reading log file for ${category}:`, error);
          }
          report.summary[category] = { totalEvents: 0, uniqueIPs: 0, errorCount: 0 };
        }
      }

      // Sort events by timestamp
      report.events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      return report;
    } catch (error) {
      console.error('Error generating audit report:', error);
      throw error;
    }
  }

  /**
   * Search audit logs
   */
  async searchLogs(query, category = 'all', limit = 100) {
    const results = [];
    const categories = category === 'all' ? Object.keys(this.logFiles) : [category];

    try {
      for (const cat of categories) {
        const logFile = path.join(this.logsDir, this.logFiles[cat]);
        try {
          const content = await fs.readFile(logFile, 'utf8');
          const lines = content.trim().split('\n').filter(line => line);
          
          for (const line of lines) {
            try {
              const event = JSON.parse(line);
              
              // Simple text search across event fields
              const eventString = JSON.stringify(event).toLowerCase();
              if (eventString.includes(query.toLowerCase())) {
                results.push({ category: cat, event });
                
                if (results.length >= limit) {
                  break;
                }
              }
            } catch (parseError) {
              console.error('Error parsing log line:', parseError);
            }
          }
          
          if (results.length >= limit) {
            break;
          }
        } catch (error) {
          if (error.code !== 'ENOENT') {
            console.error(`Error reading log file for ${cat}:`, error);
          }
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error searching logs:', error);
      throw error;
    }
  }
}

// Create singleton instance
export const auditLogger = new AuditLogger();

// Middleware to log all requests
export function auditMiddleware(req, res, next) {
  const startTime = Date.now();
  
  // Log the request
  auditLogger.logAccess({
    action: 'api_request',
    method: req.method,
    url: req.url,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id || 'anonymous',
    sessionId: req.sessionID || req.get('X-Session-ID'),
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length'),
    referer: req.get('Referer')
  });

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(body) {
    const responseTime = Date.now() - startTime;
    
    auditLogger.logAccess({
      action: 'api_response',
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime,
      ipAddress: req.ip,
      userId: req.user?.id || 'anonymous',
      sessionId: req.sessionID || req.get('X-Session-ID'),
      responseSize: JSON.stringify(body).length
    });

    return originalJson.call(this, body);
  };

  next();
}

export default AuditLogger;
