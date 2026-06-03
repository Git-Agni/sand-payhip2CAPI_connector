import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const payhipPurchaseSchema = new Schema(
  {
    payhipTransactionId: {
      type: String,
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  {
    collection: 'payhip_purchases',
    timestamps: true,
  },
);

export type PayhipPurchaseDocument = InferSchemaType<
  typeof payhipPurchaseSchema
>;

export const PayhipPurchaseModel =
  mongoose.models.PayhipPurchase ??
  mongoose.model<PayhipPurchaseDocument>(
    'PayhipPurchase',
    payhipPurchaseSchema,
  );
