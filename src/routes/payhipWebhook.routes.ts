import { Router } from 'express';
import { handlePayhipWebhook } from '../controllers/payhipWebhook.controller.js';

export const payhipWebhookRouter = Router();

payhipWebhookRouter.post('/webhooks/payhip', handlePayhipWebhook);
