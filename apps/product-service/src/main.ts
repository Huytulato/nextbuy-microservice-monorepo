import express from 'express';
import './jobs/product-crone.job';
import swaggerUi from 'swagger-ui-express';
import router from './routes/product.routes';
import { configureExpressApp, addErrorHandling, createHealthCheckRouter } from '@packages/middleware';
const swaggerDocument = require('../swagger-output.json');

// Start app as Express server
const app = express();

// Configure Express with common middleware
configureExpressApp(app, {
  jsonLimit: '50mb',
  urlencodedLimit: '50mb',
});

// Health checks
const healthRouter = createHealthCheckRouter('product-service', '1.0.0');
app.use('/', healthRouter);

// Route test
app.get('/', (req, res) => {
  res.send({ message: 'Product Service is running successfully' });
});

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.get('/docs-json', (req, res) => {
  res.json(swaggerDocument);
});

// Routes
app.use('/api', router);

// Error handling
addErrorHandling(app);

// Start server
const port = process.env.PORT || 6002;
const server = app.listen(port, () => {
    console.log(`Product service is running at http://localhost:${port}/api`);
    console.log(`Swagger UI is running at http://localhost:${port}/api-docs`);
})

// Handle server error
server.on("error", (err) => {
    console.log("Server Error", err);
})

