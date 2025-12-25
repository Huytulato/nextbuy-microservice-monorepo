import express from 'express';
import cookieParser from 'cookie-parser';
import { errorMiddleware } from '@packages/error-handler';
import swaggerUi from 'swagger-ui-express';
import router from './routes/admin.route';
const swaggerDocument = require('../swagger-output.json');

const app = express();
app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => {
  res.send({ message: 'Welcome to admin-service!' });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.get('/docs-json', (req, res) => {
  res.json(swaggerDocument);
});

// routes 
app.use("/api", router);

app.use(errorMiddleware)

const port = process.env.PORT || 6005;
const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}/api`);
  console.log(`Swagger UI is running at http://localhost:${port}/api-docs`);
});
server.on('error', console.error);
