import { config } from '../config/env.js';
import type { PayhipPaidWebhook } from '../models/payhip.models.js';
import { PayhipPurchaseModel } from '../models/payhipPurchase.schema.js';
import { connectToDatabase } from './database.service.js';
import { logger } from './logging.service.js';

export type PayhipPurchaseService = ReturnType<
  typeof makePayhipPurchaseService
>;

export function makePayhipPurchaseService() {
  async function populatePayhipPurchase(
    payload: PayhipPaidWebhook,
    rawPayload: unknown = payload,
  ): Promise<void> {
    const purchaseDate = new Date(payload.date * 1000);

    await connectToDatabase(config.mongoDbUrl);
    await PayhipPurchaseModel.updateOne(
      {
        payhipTransactionId: payload.id,
      },
      {
        $set: {
          date: purchaseDate,
          payload: buildStoredPayload(rawPayload, purchaseDate),
        },
        $setOnInsert: {
          payhipTransactionId: payload.id,
        },
      },
      {
        upsert: true,
      },
    );

    logger.debug('Saved Payhip purchase webhook payload', {
      payhipTransactionId: payload.id,
    });
  }

  async function getPurchasesByDateRange(start: Date, end: Date) {
    return PayhipPurchaseModel.collection
      .find({
        date: {
          $gte: start,
          $lte: end,
        },
      })
      .toArray();
  }

  return {
    populatePayhipPurchase,
    getPurchasesByDateRange,
  };
}

const buildStoredPayload = (
  rawPayload: unknown,
  purchaseDate: Date,
): unknown => {
  if (
    typeof rawPayload !== 'object' ||
    rawPayload === null ||
    Array.isArray(rawPayload)
  ) {
    return rawPayload;
  }

  const payloadRecord = rawPayload as Record<string, unknown>;

  return {
    ...payloadRecord,
    date: purchaseDate,
    price: centsToDollars(payloadRecord.price),
    ...(typeof payloadRecord.stripe_fee === 'number'
      ? { stripe_fee: centsToDollars(payloadRecord.stripe_fee) }
      : {}),
    ...(typeof payloadRecord.payhip_fee === 'number'
      ? { payhip_fee: centsToDollars(payloadRecord.payhip_fee) }
      : {}),
  };
};

const centsToDollars = (value: unknown): unknown =>
  typeof value === 'number' ? value / 100 : value;
