import { Router } from 'express';
import makeVercelCronController from '../controllers/vercelCron.controller.js';
import { makeRoasReportService } from '../services/roasReport.service.js';
import { makeMetaInsightsService } from '../services/metaInsights.service.js';
import { makePayhipPurchaseService } from '../services/payhipPurchase.service.js';

export const vercelCronRouter = Router();

const metaInsightsSvc = makeMetaInsightsService();
const payhipPurchaseSvc = makePayhipPurchaseService();
const roasReportSvc = makeRoasReportService({
  metaInsightsService: metaInsightsSvc,
  payhipPurchaseService: payhipPurchaseSvc,
});
const ctrl = makeVercelCronController({ roasReportService: roasReportSvc });

vercelCronRouter.get('/cron/slack-roas/:period', ctrl.handleSlackRoasCron);
