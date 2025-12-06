/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import express from 'express';
import cors from 'cors';
import proxy from 'express-http-proxy';
import morgan from 'morgan';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import axios from 'axios';
import cookieParser from 'cookie-parser';
import { error } from 'console';
import initializeSizeConfig from './libs/initiallizeSizeConfig';

// start app is server Express
const app = express();  

// allow frontend to call this API
app.use(cors({
  origin: ["http://localhost:3000"],
  allowedHeaders: ['Authorization','Content-Type'],
  credentials: true,
})
);

app.use(morgan('dev'));
app.use(express.json({limit: "100mb"}));
app.use(express.urlencoded({limit: "100mb", extended: true}));
app.use(cookieParser());
app.set("trust proxy", 1);

//Apply rate limitting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: (req:any) => (req.user ? 1000 : 100),
  message: {error: "Too many requests, please try again later"},
  standardHeaders: true,
  legacyHeaders: true,
  keyGenerator: (req, res) => ipKeyGenerator(req.ip ?? ''),
});

app.use(limiter);

app.get('/gateway-health', (req, res) => {
  res.send({ message: 'Welcome to api-gateway!' });
});

app.use("/product", proxy("http://localhost:6002", {
  proxyReqOptDecorator: function(proxyReqOpts, srcReq) {
    // Forward cookies from original request
    if (srcReq.headers.cookie) {
      proxyReqOpts.headers = proxyReqOpts.headers || {};
      proxyReqOpts.headers.cookie = srcReq.headers.cookie;
    }
    return proxyReqOpts;
  },
  userResDecorator: function(proxyRes, proxyResData, userReq, userRes) {
    // Forward Set-Cookie headers from backend to client
    if (proxyRes.headers['set-cookie']) {
      userRes.setHeader('Set-Cookie', proxyRes.headers['set-cookie']);
    }
    return proxyResData;
  }
}));
app.use("/", proxy("http://localhost:6001", {
  proxyReqOptDecorator: function(proxyReqOpts, srcReq) {
    // Forward cookies from original request
    if (srcReq.headers.cookie) {
      proxyReqOpts.headers = proxyReqOpts.headers || {};
      proxyReqOpts.headers.cookie = srcReq.headers.cookie;
    }
    return proxyReqOpts;
  },
  userResDecorator: function(proxyRes, proxyResData, userReq, userRes) {
    // Forward Set-Cookie headers from backend to client
    if (proxyRes.headers['set-cookie']) {
      userRes.setHeader('Set-Cookie', proxyRes.headers['set-cookie']);
    }
    return proxyResData;
  }
}));


const port = process.env.PORT || 8080;
const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}/api`);
  try {
    initializeSizeConfig();
  } catch (error) {
    console.error('Failed to initialize size configuration on server start:', error);
  }
});
server.on('error', console.error);
