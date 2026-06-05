import { type Express } from 'express';
import { payhipWebhookRouter } from '../routes/payhipWebhook.routes.js';
import { vercelCronRouter } from '../routes/vercelCron.routes.js';
import { logger } from '../services/logging.service.js';

export default function attachRoutes(app: Express) {
  app.use(payhipWebhookRouter);
  app.use('/vercel', vercelCronRouter);
  logger.info('Routes attached');
}
