/**
 * Proxy Request/Response Logger
 */

import { Request, Response } from 'express';

export interface ProxyLog {
  timestamp: Date;
  method: string;
  path: string;
  service: string;
  statusCode?: number;
  responseTime?: number;
  error?: string;
}

export const proxyLogger = (serviceName: string) => {
  return (req: Request, res: Response, next: any) => {
    const startTime = Date.now();
    const originalSend = res.send;

    res.send = function (body: any) {
      const responseTime = Date.now() - startTime;
      const log: ProxyLog = {
        timestamp: new Date(),
        method: req.method,
        path: req.path,
        service: serviceName,
        statusCode: res.statusCode,
        responseTime,
      };

      // Log to console (can be replaced with proper logging service)
      console.log(`[API Gateway] ${log.method} ${log.path} -> ${log.service} [${log.statusCode}] ${log.responseTime}ms`);

      // Record for circuit breaker if available
      if ((req as any).circuitBreaker && res.statusCode) {
        const { recordProxyResponse } = require('./circuit-breaker');
        recordProxyResponse(req, res.statusCode);
      }

      return originalSend.call(this, body);
    };

    next();
  };
};

