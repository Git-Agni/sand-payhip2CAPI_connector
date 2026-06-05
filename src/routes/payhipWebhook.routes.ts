import { Router } from 'express';
import makePayhipController from '../controllers/payhipWebhook.controller.js';
import { makeMetaCapiService } from '../services/metaCapi.service.js';
import { makeCustomerioService } from '../services/customerio.service.js';
import { makePayhipPurchaseService } from '../services/payhipPurchase.service.js';

export const payhipWebhookRouter = Router();

const metaCapiSvc = makeMetaCapiService();
const customerIoSvc = makeCustomerioService();
const payhipPurchaseSvc = makePayhipPurchaseService();

const ctrl = makePayhipController({
  metaCapiService: metaCapiSvc,
  customerIoService: customerIoSvc,
  payhipPurchaseService: payhipPurchaseSvc,
});

payhipWebhookRouter.post('/webhooks/payhip', ctrl.handlePayhipWebhook);
