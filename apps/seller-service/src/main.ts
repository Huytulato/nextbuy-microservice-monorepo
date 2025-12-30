import express from 'express';
import { configureExpressApp, addErrorHandling, createHealthCheckRouter } from '@packages/middleware';
import swaggerUi from 'swagger-ui-express';
import router from './routes/seller.route';
const swaggerDocument = require('../swagger-output.json');

const app = express();

configureExpressApp(app, { jsonLimit: "5mb", urlencodedLimit: "5mb" });

// Health checks
const healthRouter = createHealthCheckRouter('seller-service', '1.0.0');
app.use('/', healthRouter);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.get('/docs-json', (req, res) => {
  res.json(swaggerDocument);
});

app.use("/api", router);

addErrorHandling(app);

const port = process.env.PORT || 6003;
const server = app.listen(port, () => {
  console.log(`Seller service is running at http://localhost:${port}/api`);
  console.log(`Swagger UI is running at http://localhost:${port}/api-docs`);
});
server.on('error', console.error);
