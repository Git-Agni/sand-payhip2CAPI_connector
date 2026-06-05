import { Analytics } from '@customerio/cdp-analytics-node';
import { config } from '../config/env.js';
import type { PayhipPaidWebhook } from '../models/payhip.models.js';

export type CustomerIoService = ReturnType<typeof makeCustomerioService>

export function makeCustomerioService() {
  const sdk = new Analytics({
    writeKey: config.customerio.apiSecret,
    maxEventsInBatch: 10,
    flushInterval: 10,
    host: 'https://cdp-eu.customer.io',
  });

  function addUserToCustomerIo(payload: PayhipPaidWebhook) {
    sdk.identify({
      userId: payload.email,
      traits: buildCustomerIoTraits(payload),
      context: {
        ip: payload.ip_address,
      },
    });

    sdk.track({
      userId: payload.email,
      event: 'Payhip Purchase',
      properties: payload,
    });
  }

  return {
    addUserToCustomerIo,
  };
}

const buildCustomerIoTraits = (
  payload: PayhipPaidWebhook,
): Record<string, unknown> => ({
  email: payload.email,
  payhip_id: payload.id,
  currency: payload.currency,
  price: payload.price / 100,
  vat_applied: payload.vat_applied,
  ip_address: payload.ip_address,
  payment_type: payload.payment_type,
  stripe_fee: payload.stripe_fee ? payload.stripe_fee / 100 : undefined,
  payhip_fee: payload.payhip_fee ? payload.payhip_fee / 100 : undefined,
  unconsented_from_emails: payload.unconsented_from_emails,
  is_gift: payload.is_gift,
  purchase_date: payload.date,
  purchase_type: payload.type,
  item_count: payload.items.length,
  product_ids: payload.items.map((item) => item.product_id),
  product_names: payload.items.map((item) => item.product_name),
  product_keys: payload.items.map((item) => item.product_key),
  product_permalinks: payload.items.map((item) => item.product_permalink),
  items: payload.items,
});
