export type PayhipWebhookType =
  | 'paid'
  | 'refunded'
  | 'subscription.created'
  | 'subscription.deleted';

export interface PayhipWebhookItem {
  readonly product_id: string;
  readonly product_name: string;
  readonly product_key: string;
  readonly product_permalink: string;
  readonly quantity: string;
  readonly on_sale: boolean;
  readonly used_coupon: boolean;
  readonly used_social_discount: boolean;
  readonly used_cross_sell_discount: boolean;
  readonly used_upgrade_discount: boolean;
  readonly promoted_by_affiliate: boolean;
  readonly has_variant: boolean;
}

export interface PayhipPaidWebhook {
  readonly id: string;
  readonly email: string;
  readonly currency: string;
  readonly price: number;
  readonly vat_applied: boolean;
  readonly ip_address: string;
  readonly items: readonly PayhipWebhookItem[];
  readonly payment_type: string;
  readonly stripe_fee?: number;
  readonly payhip_fee?: number;
  readonly unconsented_from_emails?: boolean;
  readonly is_gift?: boolean;
  readonly date: number;
  readonly type: 'paid';
  readonly signature?: string;
}

export type PayhipWebhookPayload =
  | PayhipPaidWebhook
  | {
      readonly type: Exclude<PayhipWebhookType, 'paid'>;
      readonly id?: string;
    };
