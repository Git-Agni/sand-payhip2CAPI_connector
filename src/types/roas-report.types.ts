export interface DateRange {
  readonly start: Date;
  readonly end: Date;
  readonly metaSince: string;
  readonly metaUntil: string;
}

export interface ProductRevenue {
  readonly productId: string;
  readonly productName: string;
  readonly revenue: number;
  readonly purchaseCount: number;
}

export interface RoasReportRow {
  readonly campaignId: string;
  readonly campaignName: string;
  readonly productId: string;
  readonly productName: string;
  readonly revenue: number;
  readonly spend: number;
  readonly roas: number | null;
  readonly purchaseCount: number;
}

export interface SlackCampaignProduct {
  readonly productId: string;
  readonly productName: string;
  readonly revenue: number;
  readonly purchaseCount: number;
}

export interface SlackCampaignGroup {
  readonly campaignId: string;
  readonly campaignName: string;
  readonly revenue: number;
  readonly spend: number;
  readonly roas: number | null;
  readonly purchaseCount: number;
  readonly products: readonly SlackCampaignProduct[];
}

export interface StoredPayhipItem {
  readonly product_id: string;
  readonly product_name?: string;
}
