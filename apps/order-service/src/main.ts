/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import express from 'express';
import * as path from 'path';
import cors from 'cors'; 
import cookieParser from 'cookie-parser';
import { errorMiddleware } from '@packages/error-handler';
import router from './routes/order.route';
import { createOrder } from './controllers/order.controller';
import bodyParser from 'body-parser';

const app = express();

app.use(cors({
  origin: ["http://localhost:3000"],
  allowedHeaders: ['Authorization','Content-Type'],
  credentials: true,
})
);

app.post(
  "/api/create-order",
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

// Routes
app.use('/api', router); 

app.use(errorMiddleware);

const port = process.env.PORT || 6004;
const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}/api`);
});
server.on('error', console.error);
