import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeCustomerioService } from './customerio.service.js';
import type { PayhipPaidWebhook } from '../models/payhip.models.js';

const { analyticsMock, identifyMock, trackMock } = vi.hoisted(() => {
  const identifyMock = vi.fn();
  const trackMock = vi.fn();
  const analyticsMock = vi.fn(function () {
    return {
      identify: identifyMock,
      track: trackMock,
    };
  });

  return { analyticsMock, identifyMock, trackMock };
});

vi.mock('@customerio/cdp-analytics-node', () => ({
  Analytics: analyticsMock,
  default: analyticsMock,
}));

const payhipPayload: PayhipPaidWebhook = {
  id: 'payhip-user',
  email: 'user@email.com',
  currency: 'USD',
  price: 10000,
  vat_applied: false,
  ip_address: '127.0.0.1',
  items: [
    {
      product_id: 'product-123',
      product_name: 'Test Product',
      product_key: 'test-product',
      product_permalink: 'https://example.com/test-product',
      quantity: '1',
      on_sale: false,
      used_coupon: false,
      used_social_discount: false,
      used_cross_sell_discount: false,
      used_upgrade_discount: false,
      promoted_by_affiliate: false,
      has_variant: false,
    },
  ],
  payment_type: 'card',
  date: 1710000000,
  type: 'paid',
};

describe('testing customerio service', () => {
  beforeEach(() => {
    analyticsMock.mockClear();
    identifyMock.mockClear();
    trackMock.mockClear();
  });

  it('calls customerio with required items', () => {
    const customerIoService = makeCustomerioService();

    customerIoService.addUserToCustomerIo(payhipPayload);

    expect(analyticsMock).toHaveBeenCalledWith({
      writeKey: expect.any(String),
      maxEventsInBatch: 10,
      flushInterval: 10,
      host: 'https://cdp-eu.customer.io',
    });
    expect(identifyMock).toHaveBeenCalledWith({
      userId: payhipPayload.email,
      traits: {
        email: payhipPayload.email,
        payhip_id: payhipPayload.id,
        currency: payhipPayload.currency,
        price: payhipPayload.price,
        vat_applied: payhipPayload.vat_applied,
        ip_address: payhipPayload.ip_address,
        payment_type: payhipPayload.payment_type,
        stripe_fee: payhipPayload.stripe_fee,
        payhip_fee: payhipPayload.payhip_fee,
        unconsented_from_emails: payhipPayload.unconsented_from_emails,
        is_gift: payhipPayload.is_gift,
        purchase_date: payhipPayload.date,
        purchase_type: payhipPayload.type,
        item_count: payhipPayload.items.length,
        product_ids: ['product-123'],
        product_names: ['Test Product'],
        product_keys: ['test-product'],
        product_permalinks: ['https://example.com/test-product'],
        items: payhipPayload.items,
      },
    });
    expect(trackMock).toHaveBeenCalledWith({
      userId: payhipPayload.email,
      event: 'Payhip Purchase',
      properties: payhipPayload,
    });
  });
});
