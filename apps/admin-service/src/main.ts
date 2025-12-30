import express from 'express';
import { configureExpressApp, addErrorHandling, createHealthCheckRouter } from '@packages/middleware';
import swaggerUi from 'swagger-ui-express';
import router from './routes/admin.route';
const swaggerDocument = require('../swagger-output.json');

const app = express();

configureExpressApp(app);

// Health checks
const healthRouter = createHealthCheckRouter('admin-service', '1.0.0');
app.use('/', healthRouter);

app.get('/', (req, res) => {
  res.send({ message: 'Welcome to admin-service!' });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.get('/docs-json', (req, res) => {
  res.json(swaggerDocument);
});

// routes 
app.use("/api", router);

addErrorHandling(app);

const port = process.env.PORT || 6005;
const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}/api`);
  console.log(`Swagger UI is running at http://localhost:${port}/api-docs`);
});
server.on('error', console.error);
