import express from 'express';
import cors from 'cors';
import { errorMiddleware } from '@packages/error-handler'
import cookieParser from 'cookie-parser';
import router from './routes/auth.router';
import swaggerUi from 'swagger-ui-express';
const swaggerDocument = require('./swagger-output.json');

// start app is server Express
const app = express();

// allow frontend to call this API
app.use(cors({
  origin: ["http://localhost:3000"],
  allowedHeaders: ['Authorization','Content-Type'],
  credentials: true,
})
);

// Route test
app.get('/', (req, res) => {
    res.send({ 'message': 'Welcome to nextbuy API'});
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.get("/docs-json", (req, res) => {
    res.json(swaggerDocument);
});

app.use(express.json());
app.use(cookieParser());

// Routes 
app.use("/api", router);

app.use(errorMiddleware);

// Start server
const port = process.env.PORT || 6001;
const server = app.listen(port, () => {
    console.log(`Auth service is running at http://localhost:${port}/api`);
    console.log(`Swagger UI is running at http://localhost:${port}/docs`);
})

// Handle server error
server.on("error", (err) => {
    console.log("Server Error", err);
})

