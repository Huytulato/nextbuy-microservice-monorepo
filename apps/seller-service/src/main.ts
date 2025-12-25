import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { errorMiddleware } from '@packages/error-handler';
import swaggerUi from 'swagger-ui-express';
import router from './routes/seller.route';
const swaggerDocument = require('../swagger-output.json');

const app = express();

app.use(cors({
  origin: ["http://localhost:3000"],
  allowedHeaders: ['Authorization','Content-Type'],
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.get('/docs-json', (req, res) => {
  res.json(swaggerDocument);
});

app.use("/api", router);

app.use(errorMiddleware);

const port = process.env.PORT || 6003;
const server = app.listen(port, () => {
  console.log(`Seller service is running at http://localhost:${port}/api`);
  console.log(`Swagger UI is running at http://localhost:${port}/api-docs`);
});
server.on('error', console.error);
