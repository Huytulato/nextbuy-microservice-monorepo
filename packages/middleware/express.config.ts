import express, { Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { getCorsConfig } from './cors.config';
import { errorMiddleware } from '@packages/error-handler';

/**
 * Configure Express app with common middleware
 */
export const configureExpressApp = (app: Express, options?: {
  jsonLimit?: string;
  urlencodedLimit?: string;
  enableMorgan?: boolean;
  corsConfig?: any;
}): void => {
  // CORS
  app.use(cors(options?.corsConfig || getCorsConfig()));

  // Logging
  if (options?.enableMorgan !== false) {
    app.use(morgan('dev'));
  }

  // Body parsing
  app.use(express.json({ limit: options?.jsonLimit || '50mb' }));
  app.use(express.urlencoded({ 
    extended: true, 
    limit: options?.urlencodedLimit || '50mb' 
  }));

  // Cookie parser
  app.use(cookieParser());

  // Trust proxy (for rate limiting behind reverse proxy)
  app.set('trust proxy', 1);
};

/**
 * Add error handling middleware
 */
export const addErrorHandling = (app: Express): void => {
  app.use(errorMiddleware);
};

