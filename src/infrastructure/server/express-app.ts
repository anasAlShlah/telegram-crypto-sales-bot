import express, { Express } from 'express';
import { webhookRouter } from './webhook-routes.js';

export function createExpressApp(): Express {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logger in dev
  app.use((req, _res, next) => {
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[HTTP] ${req.method} ${req.url}`);
    }
    next();
  });

  app.use(webhookRouter);

  return app;
}
