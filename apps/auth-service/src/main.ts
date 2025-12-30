import express from 'express'; // main framework for building web applications in Node.js
import { addErrorHandling, createHealthCheckRouter } from '@packages/middleware';
import router from './routes/auth.router'; // import the router for authentication routes, defines the API endpoints
import swaggerUi from 'swagger-ui-express'; // middleware for serving Swagger UI, which provides a web interface for API documentation
import cors from 'cors';
import cookieParser from 'cookie-parser';
const swaggerDocument = require('../swagger-output.json'); 

// start app is server Express
const app = express();

// Manual middleware configuration to fix 400 error
app.use(cors({
  origin: ["http://localhost:3000"],
  allowedHeaders: ['Authorization','Content-Type'],
  credentials: true,
}));
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use(cookieParser());

// Health checks
const healthRouter = createHealthCheckRouter('auth-service', '1.0.0');
app.use('/', healthRouter);

// Route test
app.get('/', (req, res) => {
    res.send({ 'message': 'Welcome to nextbuy API'});
}); // test route to check if the server is running when type `http://localhost:6001/` in the browser

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument)); // serve Swagger UI at /api-docs
app.get("/docs-json", (req, res) => {
    res.json(swaggerDocument);
}); 

// Routes 
app.use("/api", router); // use the authentication router for all routes starting with /api

addErrorHandling(app);

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

