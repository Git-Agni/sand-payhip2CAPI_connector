import { Router } from 'express';
import makeVercelCronController from '../controllers/vercelCron.controller.js';
import { makeRoasReportService } from '../services/roasReport.service.js';
import { makeMetaInsightsService } from '../services/metaInsights.service.js';

export const vercelCronRouter = Router();

const metaInsightsSvc = makeMetaInsightsService();
const roasReportSvc = makeRoasReportService({
  metaInsightsService: metaInsightsSvc,
});
const ctrl = makeVercelCronController({ roasReportService: roasReportSvc });

vercelCronRouter.get('/cron/slack-roas/:period', ctrl.handleSlackRoasCron);
