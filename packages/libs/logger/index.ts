/**
 * Structured Logging Utility
 * Provides consistent logging across all services
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  context?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
    name?: string;
  };
  requestId?: string;
  userId?: string;
}

class Logger {
  private serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  private formatLog(level: LogLevel, message: string, context?: Record<string, any>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      message,
      ...(context && { context }),
    };
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>) {
    const logEntry = this.formatLog(level, message, context);
    
    // In production, this should send to a logging service (e.g., Winston, Pino, CloudWatch)
    // For now, we'll use console with structured format
    const logMethod = level === LogLevel.ERROR ? console.error : 
                     level === LogLevel.WARN ? console.warn :
                     level === LogLevel.DEBUG ? console.debug : 
                     console.log;

    logMethod(JSON.stringify(logEntry));
  }

  debug(message: string, context?: Record<string, any>) {
    if (process.env.LOG_LEVEL === 'debug') {
      this.log(LogLevel.DEBUG, message, context);
    }
  }

  info(message: string, context?: Record<string, any>) {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, any>) {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error | any, context?: Record<string, any>) {
    const errorContext = {
      ...context,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : error,
    };
    this.log(LogLevel.ERROR, message, errorContext);
  }

  /**
   * Log HTTP request
   */
  request(req: any, res: any, responseTime: number) {
    this.info('HTTP Request', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.id || req.headers['x-request-id'],
    });
  }
}

/**
 * Create logger instance for a service
 */
export const createLogger = (serviceName: string): Logger => {
  return new Logger(serviceName);
};

/**
 * Request ID middleware
 */
export const requestIdMiddleware = (req: any, res: any, next: any) => {
  req.id = req.headers['x-request-id'] || 
           req.headers['x-request-id'] || 
           `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  res.setHeader('X-Request-ID', req.id);
  next();
};

