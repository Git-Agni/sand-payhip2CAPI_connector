import { Router } from 'express';
import { handleSlackRoasCron } from '../controllers/vercelCron.controller.js';

export const vercelCronRouter = Router();

vercelCronRouter.get('/cron/slack-roas', handleSlackRoasCron);
