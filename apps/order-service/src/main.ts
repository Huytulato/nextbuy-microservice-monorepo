/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import express from 'express';
import * as path from 'path';
import cors from 'cors'; 
import cookieParser from 'cookie-parser';
import { errorMiddleware } from '@packages/error-handler';
import swaggerUi from 'swagger-ui-express';
import router from './routes/order.route';
import { createOrder } from './controllers/order.controller';
import bodyParser from 'body-parser';
const swaggerDocument = require('../swagger-output.json');

const app = express();

app.use(cors({
  origin: ["http://localhost:3000"],
  allowedHeaders: ['Authorization','Content-Type'],
  credentials: true,
})
);

// Stripe webhook endpoint - MUST be before express.json() middleware
// Path matches API gateway routing: /order/api/create-order
app.post(
  "/order/api/create-order",
  bodyParser.raw({ type: "application/json" }),
  (req, res, next) => {
    (req as any).rawBody = req.body;
    next();
  },
  createOrder 
);

app.use(express.json());
app.use(cookieParser());  

app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.get('/api', (req, res) => {
  res.send({ message: 'Welcome to order-service!' });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.get('/docs-json', (req, res) => {
  res.json(swaggerDocument);
});

// Routes
app.use('/api', router); 

app.use(errorMiddleware);

const port = process.env.PORT || 6004;
const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}/api`);
  console.log(`Swagger UI is running at http://localhost:${port}/api-docs`);
});
server.on('error', console.error);
