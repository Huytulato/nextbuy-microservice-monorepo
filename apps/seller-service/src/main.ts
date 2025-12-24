import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { errorMiddleware } from '@packages/error-handler';
import router from './routes/seller.route';

const app = express();

app.use(cors({
  origin: ["http://localhost:3000"],
  allowedHeaders: ['Authorization','Content-Type'],
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

app.use("/api", router);

app.use(errorMiddleware);

const port = process.env.PORT || 6003;
const server = app.listen(port, () => {
  console.log(`Seller service is running at http://localhost:${port}/api`);
});
server.on('error', console.error);
