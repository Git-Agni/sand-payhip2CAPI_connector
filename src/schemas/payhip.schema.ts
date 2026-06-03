import type {
  PayhipPaidWebhook,
  PayhipWebhookItem,
} from '../models/payhip.models.js';

type ObjectRecord = Record<string, unknown>;

export interface ValidationResult<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly errors?: readonly string[];
}

const isObjectRecord = (value: unknown): value is ObjectRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

const isBoolean = (value: unknown): value is boolean =>
  typeof value === 'boolean';

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const validatePayhipItem = (
  value: unknown,
  index: number,
): ValidationResult<PayhipWebhookItem> => {
  if (!isObjectRecord(value)) {
    return { success: false, errors: [`items.${index} must be an object`] };
  }

  const errors: string[] = [];

  const stringFields = [
    'product_id',
    'product_name',
    'product_key',
    'product_permalink',
    'quantity',
  ] as const;
  const booleanFields = [
    'on_sale',
    'used_coupon',
    'used_social_discount',
    'used_cross_sell_discount',
    'used_upgrade_discount',
    'promoted_by_affiliate',
    'has_variant',
  ] as const;

  for (const field of stringFields) {
    if (!isString(value[field])) {
      errors.push(`items.${index}.${field} must be a non-empty string`);
    }
  }

  for (const field of booleanFields) {
    if (!isBoolean(value[field])) {
      errors.push(`items.${index}.${field} must be a boolean`);
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      product_id: value.product_id as string,
      product_name: value.product_name as string,
      product_key: value.product_key as string,
      product_permalink: value.product_permalink as string,
      quantity: value.quantity as string,
      on_sale: value.on_sale as boolean,
      used_coupon: value.used_coupon as boolean,
      used_social_discount: value.used_social_discount as boolean,
      used_cross_sell_discount: value.used_cross_sell_discount as boolean,
      used_upgrade_discount: value.used_upgrade_discount as boolean,
      promoted_by_affiliate: value.promoted_by_affiliate as boolean,
      has_variant: value.has_variant as boolean,
    },
  };
};

export const validatePayhipPaidWebhook = (
  payload: unknown,
): ValidationResult<PayhipPaidWebhook> => {
  if (!isObjectRecord(payload)) {
    return { success: false, errors: ['payload must be an object'] };
  }

  const errors: string[] = [];

  if (payload.type !== 'paid') {
    errors.push('type must be paid');
  }

  for (const field of [
    'id',
    'email',
    'currency',
    'ip_address',
    'payment_type',
  ] as const) {
    if (!isString(payload[field])) {
      errors.push(`${field} must be a non-empty string`);
    }
  }

  for (const field of ['price', 'date'] as const) {
    if (!isNumber(payload[field])) {
      errors.push(`${field} must be a number`);
    }
  }

  if (!isBoolean(payload.vat_applied)) {
    errors.push('vat_applied must be a boolean');
  }

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    errors.push('items must be a non-empty array');
  }

  const itemResults = Array.isArray(payload.items)
    ? payload.items.map((item, index) => validatePayhipItem(item, index))
    : [];

  for (const result of itemResults) {
    if (!result.success && result.errors) {
      errors.push(...result.errors);
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const items = itemResults.flatMap((result) =>
    result.data ? [result.data] : [],
  );

  const data: PayhipPaidWebhook = {
    id: payload.id as string,
    email: payload.email as string,
    currency: payload.currency as string,
    price: payload.price as number,
    vat_applied: payload.vat_applied as boolean,
    ip_address: payload.ip_address as string,
    items,
    payment_type: payload.payment_type as string,
    date: payload.date as number,
    type: 'paid',
    ...(isNumber(payload.stripe_fee) ? { stripe_fee: payload.stripe_fee } : {}),
    ...(isNumber(payload.payhip_fee) ? { payhip_fee: payload.payhip_fee } : {}),
    ...(isBoolean(payload.unconsented_from_emails)
      ? { unconsented_from_emails: payload.unconsented_from_emails }
      : {}),
    ...(isBoolean(payload.is_gift) ? { is_gift: payload.is_gift } : {}),
    ...(isString(payload.signature) ? { signature: payload.signature } : {}),
  };

  return {
    success: true,
    data,
  };
};
