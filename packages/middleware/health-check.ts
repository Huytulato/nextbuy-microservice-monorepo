import { Request, Response, Router } from 'express';
import prisma from '@packages/libs/prisma';

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  service: string;
  version?: string;
  uptime: number;
  checks: {
    database?: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
    };
    [key: string]: any;
  };
}

/**
 * Create health check router
 */
export const createHealthCheckRouter = (serviceName: string, version?: string) => {
  const router = Router();
  const startTime = Date.now();

  /**
   * Basic health check
   * GET /health
   */
  router.get('/health', async (req: Request, res: Response) => {
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    
    const response: HealthCheckResponse = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: serviceName,
      version,
      uptime,
      checks: {},
    };

    return res.status(200).json(response);
  });

  /**
   * Readiness probe - checks if service is ready to accept traffic
   * GET /health/ready
   */
  router.get('/health/ready', async (req: Request, res: Response) => {
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    const checks: HealthCheckResponse['checks'] = {};
    let isReady = true;

    // Check database connection (optional - only if prisma is available)
    try {
      // Check if prisma is available
      if (prisma && typeof prisma.$connect === 'function') {
        const dbStartTime = Date.now();
        // For MongoDB, test connection with a simple count query
        // Try users first, fallback to products if users doesn't exist
        try {
          await prisma.users.count();
        } catch {
          // If users model doesn't exist, try products
          try {
            await prisma.products.count();
          } catch {
            // If both fail, connection is unhealthy
            throw new Error('Database connection failed');
          }
        }
        const dbResponseTime = Date.now() - dbStartTime;
        
        checks.database = {
          status: 'healthy',
          responseTime: dbResponseTime,
        };
      }
    } catch (error: any) {
      checks.database = {
        status: 'unhealthy',
      };
      isReady = false;
    }

    const response: HealthCheckResponse = {
      status: isReady ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      service: serviceName,
      version,
      uptime,
      checks,
    };

    return res.status(isReady ? 200 : 503).json(response);
  });

  /**
   * Liveness probe - checks if service is alive
   * GET /health/live
   */
  router.get('/health/live', async (req: Request, res: Response) => {
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    
    const response: HealthCheckResponse = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: serviceName,
      version,
      uptime,
      checks: {},
    };

    return res.status(200).json(response);
  });

  return router;
};

/**
 * Simple health check endpoint (for quick checks)
 */
export const simpleHealthCheck = (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
};

