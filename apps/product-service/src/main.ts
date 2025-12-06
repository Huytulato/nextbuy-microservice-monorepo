import express from 'express'; // main framework for building web applications in Node.js
import "./jobs/product-crone.job"
import cors from 'cors'; // middleware for enabling CORS (Cross-Origin Resource Sharing)
import { errorMiddleware } from '@packages/error-handler/error-middleware' // custom error handling middleware
import cookieParser from 'cookie-parser'; // middleware for parsing cookies, save tokens in cookies
import swaggerUi from 'swagger-ui-express'; // middleware for serving Swagger UI, which provides a web interface for API documentation
import router from './routes/product.routes'; // import product routes
const swaggerDocument = require('./swagger-output.json'); 

// start app is server Express
const app = express();

// allow frontend to call this API
app.use(cors({
  origin: ["http://localhost:3000"],
  allowedHeaders: ['Authorization','Content-Type'],
  credentials: true, // allow cookies to be sent with requests
})
);

// Route test
app.get('/', (req, res) => {
    res.send({ 'message': 'Product Service is running successfully' });
}); // test route to check if the server is running when type `http://localhost:6001/` in the browser

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument)); // serve Swagger UI at /api-docs
app.get("/docs-json", (req, res) => {
    res.json(swaggerDocument);
}); 

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser()); // Parse cookies from requests

// Routes 
app.use("/api", router); // use the authentication router for all routes starting with /api

app.use(errorMiddleware); // use custom error handling middleware to handle errors globally

// Start server
const port = process.env.PORT || 6002;
const server = app.listen(port, () => {
    console.log(`Product service is running at http://localhost:${port}/api`);
    console.log(`Swagger UI is running at http://localhost:${port}/docs`);
})

// Handle server error
server.on("error", (err) => {
    console.log("Server Error", err);
})

