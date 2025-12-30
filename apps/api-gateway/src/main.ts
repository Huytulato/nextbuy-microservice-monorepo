import express from 'express';
import proxy from 'express-http-proxy';
import morgan from 'morgan';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { configureExpressApp, addErrorHandling, createHealthCheckRouter } from '@packages/middleware';
import { serviceRegistry } from './services/service-registry';
import { circuitBreakerMiddleware } from './middleware/circuit-breaker';
import { proxyLogger } from './middleware/proxy-logger';
import initializeSizeConfig from './libs/initiallizeSizeConfig';

const app = express();

// Configure Express with common middleware
configureExpressApp(app, {
  jsonLimit: '100mb',
  urlencodedLimit: '100mb',
});

// Apply rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: (req: any) => (req.user ? 1000 : 100),
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: true,
  keyGenerator: (req, res) => ipKeyGenerator(req.ip ?? ''),
});

app.use(limiter);

// Health checks
const healthRouter = createHealthCheckRouter('api-gateway', '1.0.0');
app.use('/', healthRouter);

// Gateway health endpoint
app.get('/gateway-health', (req, res) => {
  res.json({
    message: 'API Gateway is running',
    services: serviceRegistry.getServiceHealthStatus(),
  });
});

// Service health status endpoint
app.get('/gateway/services/health', async (req, res) => {
  const healthStatus = await serviceRegistry.checkAllServicesHealth();
  res.json({
    timestamp: new Date().toISOString(),
    services: healthStatus,
  });
});

// Proxy configuration helper
const createProxy = (serviceName: string, path: string) => {
  const service = serviceRegistry.getService(serviceName);
  if (!service) {
    throw new Error(`Service ${serviceName} not found in registry`);
  }

  return proxy(service.baseUrl, {
    proxyReqPathResolver: (req) => {
      let resolvedPath = req.url.replace(path, '');
      // Ensure path always starts with / (important for root path '/')
      if (!resolvedPath.startsWith('/')) {
        resolvedPath = '/' + resolvedPath;
      }
      return resolvedPath;
    },
    timeout: service.timeout || 5000,
    proxyErrorHandler: (err, res, next) => {
      console.error(`[API Gateway] Proxy error for ${serviceName}:`, err.message);
      res.status(503).json({
        success: false,
        error: 'Service unavailable',
        service: serviceName,
        message: 'The requested service is temporarily unavailable',
      });
    },
  });
};

// Service routes with circuit breaker and logging
app.use(
  '/admin',
  circuitBreakerMiddleware('admin-service'),
  proxyLogger('admin-service'),
  createProxy('admin-service', '/admin')
);

app.use(
  '/order',
  circuitBreakerMiddleware('order-service'),
  proxyLogger('order-service'),
  createProxy('order-service', '/order')
);

app.use(
  '/seller',
  circuitBreakerMiddleware('seller-service'),
  proxyLogger('seller-service'),
  createProxy('seller-service', '/seller')
);

app.use(
  '/product',
  circuitBreakerMiddleware('product-service'),
  proxyLogger('product-service'),
  createProxy('product-service', '/product')
);

app.use(
  '/payment',
  circuitBreakerMiddleware('payment-service'),
  proxyLogger('payment-service'),
  createProxy('payment-service', '/payment')
);

app.use(
  '/shop',
  circuitBreakerMiddleware('seller-service'),
  proxyLogger('seller-service'),
  createProxy('seller-service', '/shop')
);

app.use(
  '/',
  circuitBreakerMiddleware('auth-service'),
  proxyLogger('auth-service'),
  createProxy('auth-service', '/')
);

// Error handling
addErrorHandling(app);

// Start server
const port = process.env.PORT || 8080;
const server = app.listen(port, () => {
  console.log(`API Gateway listening at http://localhost:${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
  
  try {
    initializeSizeConfig();
  } catch (error) {
    console.error('Failed to initialize size configuration on server start:', error);
  }

  // Initial health check of all services
  setTimeout(async () => {
    console.log('Checking service health...');
    await serviceRegistry.checkAllServicesHealth();
  }, 5000);
});

server.on('error', console.error);
