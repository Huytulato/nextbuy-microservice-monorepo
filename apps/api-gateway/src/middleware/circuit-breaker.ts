/**
 * Circuit Breaker Middleware
 * Prevents cascading failures by stopping requests to unhealthy services
 */

import { Request, Response, NextFunction } from 'express';
import { serviceRegistry } from '../services/service-registry';

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failures: number;
  lastFailureTime?: Date;
  successCount: number;
}

class CircuitBreaker {
  private breakers: Map<string, CircuitBreakerState> = new Map();
  private readonly failureThreshold = 5;
  private readonly timeout = 60000; // 1 minute
  private readonly halfOpenMaxSuccess = 3;

  getState(serviceName: string): CircuitBreakerState {
    if (!this.breakers.has(serviceName)) {
      this.breakers.set(serviceName, {
        state: 'closed',
        failures: 0,
        successCount: 0,
      });
    }
    return this.breakers.get(serviceName)!;
  }

  recordSuccess(serviceName: string) {
    const breaker = this.getState(serviceName);
    
    if (breaker.state === 'half-open') {
      breaker.successCount++;
      if (breaker.successCount >= this.halfOpenMaxSuccess) {
        breaker.state = 'closed';
        breaker.failures = 0;
        breaker.successCount = 0;
      }
    } else if (breaker.state === 'closed') {
      breaker.failures = 0;
    }
  }

  recordFailure(serviceName: string) {
    const breaker = this.getState(serviceName);
    breaker.failures++;
    breaker.lastFailureTime = new Date();

    if (breaker.failures >= this.failureThreshold) {
      breaker.state = 'open';
      breaker.successCount = 0;
    }
  }

  canAttempt(serviceName: string): boolean {
    const breaker = this.getState(serviceName);

    if (breaker.state === 'closed') {
      return true;
    }

    if (breaker.state === 'open') {
      // Check if timeout has passed
      if (breaker.lastFailureTime) {
        const timeSinceLastFailure = Date.now() - breaker.lastFailureTime.getTime();
        if (timeSinceLastFailure >= this.timeout) {
          breaker.state = 'half-open';
          breaker.successCount = 0;
          return true;
        }
      }
      return false;
    }

    // half-open state - allow attempts
    return true;
  }

  getStatus(serviceName: string) {
    return this.getState(serviceName);
  }
}

const circuitBreaker = new CircuitBreaker();

/**
 * Circuit breaker middleware for proxy routes
 */
export const circuitBreakerMiddleware = (serviceName: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Check service health
    const isHealthy = await serviceRegistry.checkServiceHealth(serviceName);
    
    if (!isHealthy) {
      circuitBreaker.recordFailure(serviceName);
    }

    // Check circuit breaker state
    if (!circuitBreaker.canAttempt(serviceName)) {
      return res.status(503).json({
        success: false,
        error: 'Service temporarily unavailable',
        service: serviceName,
        message: 'The service is currently experiencing issues. Please try again later.',
      });
    }

    // Attach circuit breaker to request for later use
    (req as any).circuitBreaker = circuitBreaker;
    (req as any).serviceName = serviceName;

    next();
  };
};

/**
 * Record proxy response for circuit breaker
 */
export const recordProxyResponse = (req: Request, statusCode: number) => {
  const serviceName = (req as any).serviceName;
  if (!serviceName) return;

  const circuitBreaker = (req as any).circuitBreaker;
  if (!circuitBreaker) return;

  if (statusCode >= 200 && statusCode < 300) {
    circuitBreaker.recordSuccess(serviceName);
  } else if (statusCode >= 500) {
    circuitBreaker.recordFailure(serviceName);
  }
};

export { circuitBreaker };

