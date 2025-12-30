/**
 * Payment Service - Main Entry Point
 */

import express from 'express';
import * as path from 'path';
import swaggerUi from 'swagger-ui-express';
import router from './routes/payment.route';
import { paymentController } from './controllers/payment.controller';
import bodyParser from 'body-parser';
import { configureExpressApp, addErrorHandling, createHealthCheckRouter } from '@packages/middleware';
const swaggerDocument = require('../swagger-output.json');

const app = express();

// Stripe webhook endpoint - MUST be before express.json() middleware
// Raw body is required for Stripe signature verification
app.post(
  '/payment/api/webhook/stripe',
  bodyParser.raw({ type: 'application/json' }),
  (req, res, next) => {
    (req as any).rawBody = req.body;
    next();
  },
  paymentController.handleStripeWebhook
);

// Configure global middleware (includes cors, json, cookie-parser, morgan)
configureExpressApp(app);

// Health checks
const healthRouter = createHealthCheckRouter('payment-service', '1.0.0');
app.use('/', healthRouter);

app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.get('/api', (req, res) => {
  res.send({ message: 'Welcome to payment-service!' });
});

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.get('/docs-json', (req, res) => {
  res.json(swaggerDocument);
});

// API Routes
app.use('/api', router);

// Error handling
addErrorHandling(app);

const port = process.env.PORT || 6007;
const server = app.listen(port, () => {
  console.log(`🚀 Payment Service listening at http://localhost:${port}/api`);
  console.log(`📚 Swagger UI is running at http://localhost:${port}/api-docs`);
});
server.on('error', console.error);
