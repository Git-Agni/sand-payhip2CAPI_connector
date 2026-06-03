import type { RoasProductMapping } from '../config/env.js';
import { config } from '../config/env.js';
import type { MetaInsightsCampaignRow } from '../models/meta.models.js';
import { PayhipPurchaseModel } from '../models/payhipPurchase.schema.js';
import { logger } from './logging.service.js';
import { makeMetaInsightsService } from './metaInsights.service.js';

export type RoasReportPeriod = 'daily' | 'weekly' | 'monthly';

interface DateRange {
  readonly start: Date;
  readonly end: Date;
  readonly metaSince: string;
  readonly metaUntil: string;
}

interface ProductRevenue {
  readonly productId: string;
  readonly productName: string;
  readonly revenue: number;
  readonly purchaseCount: number;
}

interface RoasReportRow {
  readonly campaignId: string;
  readonly campaignName: string;
  readonly productId: string;
  readonly productName: string;
  readonly revenue: number;
  readonly spend: number;
  readonly roas: number | null;
  readonly purchaseCount: number;
}

interface StoredPayhipItem {
  readonly product_id: string;
  readonly product_name?: string;
}

const metaInsightsService = makeMetaInsightsService();

export function makeRoasReportService() {
  async function logCampaignRoas(period: RoasReportPeriod): Promise<void> {
    const dateRange = resolveDateRange(period, new Date());
    const [productRevenue, metaRows] = await Promise.all([
      getProductRevenue(dateRange),
      metaInsightsService.getCampaignSpend({
        since: dateRange.metaSince,
        until: dateRange.metaUntil,
      }),
    ]);

    const reportRows = buildReportRows(
      productRevenue,
      metaRows,
      config.roas.productMappings,
    );

    for (const row of reportRows) {
      logger.info(formatRoasLogMessage(period, dateRange, row), {
        period,
        campaignId: row.campaignId,
        campaignName: row.campaignName,
        productId: row.productId,
        productName: row.productName,
        revenue: roundMoney(row.revenue),
        spend: roundMoney(row.spend),
        roas: row.roas === null ? null : roundRatio(row.roas),
        purchaseCount: row.purchaseCount,
      });
    }

    await sendSlackRoasReport(period, dateRange, reportRows);
  }

  return {
    logCampaignRoas,
  };
}

export function resolveDateRange(
  period: RoasReportPeriod,
  requestedAt: Date,
): DateRange {
  const start = startOfUtcDay(requestedAt);
  const end = new Date(requestedAt);

  if (period === 'daily') {
    start.setUTCDate(start.getUTCDate() - 1);
    end.setTime(start.getTime());
    end.setUTCDate(end.getUTCDate() + 1);
    end.setUTCMilliseconds(end.getUTCMilliseconds() - 1);

    return {
      start,
      end,
      metaSince: toMetaDate(start),
      metaUntil: toMetaDate(start),
    };
  }

  if (period === 'weekly') {
    start.setUTCDate(start.getUTCDate() - 7);
  }

  if (period === 'monthly') {
    start.setUTCMonth(start.getUTCMonth() - 1, 1);
    end.setTime(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    end.setUTCMilliseconds(end.getUTCMilliseconds() - 1);
  }

  return {
    start,
    end,
    metaSince: toMetaDate(start),
    metaUntil: toMetaDate(end),
  };
}

async function getProductRevenue(
  dateRange: DateRange,
): Promise<readonly ProductRevenue[]> {
  const purchases = await PayhipPurchaseModel.collection
    .find({
      date: {
        $gte: dateRange.start,
        $lte: dateRange.end,
      },
    })
    .toArray();

  const revenueByProductId = new Map<string, ProductRevenue>();

  for (const purchase of purchases) {
    const payload = toRecord(purchase.payload);
    const price = readNumber(payload.price);
    const items = readStoredItems(payload.items);
    const payhipTransactionId = readString(purchase.payhipTransactionId);

    if (price === null || items.length === 0) {
      logger.warn('Skipped Payhip purchase while calculating ROAS', {
        payhipTransactionId,
        reason: 'missing_price_or_items',
      });
      continue;
    }

    const revenuePerItem = price / items.length;

    for (const item of items) {
      const existing = revenueByProductId.get(item.product_id);
      const productName = item.product_name ?? 'unknown product';

      revenueByProductId.set(item.product_id, {
        productId: item.product_id,
        productName: existing?.productName ?? productName,
        revenue: (existing?.revenue ?? 0) + revenuePerItem,
        purchaseCount: (existing?.purchaseCount ?? 0) + 1,
      });
    }
  }

  return [...revenueByProductId.values()];
}

function buildReportRows(
  productRevenue: readonly ProductRevenue[],
  metaRows: readonly MetaInsightsCampaignRow[],
  mappings: readonly RoasProductMapping[],
): readonly RoasReportRow[] {
  const revenueByProductId = new Map(
    productRevenue.map((product) => [product.productId, product]),
  );
  const mappedProductIds = new Set(
    mappings.map((mapping) => mapping.productId),
  );
  const mappedCampaignIds = new Set(
    mappings.map((mapping) => mapping.campaignId),
  );
  const spendByCampaignId = aggregateSpendByCampaignId(metaRows);
  const campaignNameById = new Map(
    metaRows.flatMap((row) =>
      row.campaign_id
        ? [[row.campaign_id, row.campaign_name ?? 'unknown campaign'] as const]
        : [],
    ),
  );
  const reportRows: RoasReportRow[] = [];

  for (const mapping of mappings) {
    const revenue = revenueByProductId.get(mapping.productId);
    const spend = spendByCampaignId.get(mapping.campaignId) ?? 0;

    reportRows.push({
      campaignId: mapping.campaignId,
      campaignName:
        campaignNameById.get(mapping.campaignId) ?? 'unknown campaign',
      productId: mapping.productId,
      productName: revenue?.productName ?? 'unknown product',
      revenue: revenue?.revenue ?? 0,
      spend,
      roas: spend > 0 ? (revenue?.revenue ?? 0) / spend : null,
      purchaseCount: revenue?.purchaseCount ?? 0,
    });
  }

  for (const revenue of productRevenue) {
    if (mappedProductIds.has(revenue.productId)) {
      continue;
    }

    reportRows.push({
      campaignId: 'unknown campaign',
      campaignName: 'unknown campaign',
      productId: revenue.productId,
      productName: revenue.productName,
      revenue: revenue.revenue,
      spend: 0,
      roas: null,
      purchaseCount: revenue.purchaseCount,
    });
  }

  for (const [campaignId, spend] of spendByCampaignId) {
    if (mappedCampaignIds.has(campaignId)) {
      continue;
    }

    reportRows.push({
      campaignId,
      campaignName: campaignNameById.get(campaignId) ?? 'unknown campaign',
      productId: 'unknown product',
      productName: 'unknown product',
      revenue: 0,
      spend,
      roas: null,
      purchaseCount: 0,
    });
  }

  return reportRows;
}

function aggregateSpendByCampaignId(
  metaRows: readonly MetaInsightsCampaignRow[],
): Map<string, number> {
  const spendByCampaignId = new Map<string, number>();

  for (const row of metaRows) {
    const campaignId = row.campaign_id ?? 'unknown campaign';
    const spend = Number.parseFloat(row.spend ?? '0');

    spendByCampaignId.set(
      campaignId,
      (spendByCampaignId.get(campaignId) ?? 0) +
        (Number.isFinite(spend) ? spend : 0),
    );
  }

  return spendByCampaignId;
}

function toRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : 'unknown';
}

function readStoredItems(value: unknown): readonly StoredPayhipItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      return [];
    }

    const record = item as Record<string, unknown>;
    const productId = record.product_id;

    if (typeof productId !== 'string' || productId.length === 0) {
      return [];
    }

    return [
      {
        product_id: productId,
        ...(typeof record.product_name === 'string'
          ? { product_name: record.product_name }
          : {}),
      },
    ];
  });
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function toMetaDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundRatio(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function formatRoasLogMessage(
  period: RoasReportPeriod,
  dateRange: DateRange,
  row: RoasReportRow,
): string {
  return [
    `ROAS ${period}`,
    `${dateRange.metaSince}..${dateRange.metaUntil}`,
    `campaign ${row.campaignName} (${row.campaignId})`,
    `product ${row.productName} (${row.productId})`,
    `revenue ${formatMoney(row.revenue)}`,
    `spend ${formatMoney(row.spend)}`,
    `roas ${row.roas === null ? 'n/a' : `${roundRatio(row.roas)}x`}`,
    `purchases ${row.purchaseCount}`,
  ].join(' | ');
}

function formatMoney(value: number): string {
  return `$${roundMoney(value).toFixed(2)}`;
}

async function sendSlackRoasReport(
  period: RoasReportPeriod,
  dateRange: DateRange,
  reportRows: readonly RoasReportRow[],
): Promise<void> {
  const webhookUrl = config.slack.webhookUrl;

  if (!webhookUrl) {
    logger.debug(
      'Skipped Slack ROAS report because SLACK_WEBHOOK_URL is unset',
    );
    return;
  }

  const text = formatSlackRoasReport(period, dateRange, reportRows);
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      data: text,
    }),
  });

  if (!response.ok) {
    const responseBody = await response.text();

    logger.warn('Slack ROAS webhook rejected report', {
      statusCode: response.status,
      response: responseBody,
    });
    throw new Error(`Slack ROAS webhook failed with ${response.status}`);
  }

  logger.info('Sent Slack ROAS report', {
    period,
    rowCount: reportRows.length,
  });
}

function formatSlackRoasReport(
  period: RoasReportPeriod,
  dateRange: DateRange,
  reportRows: readonly RoasReportRow[],
): string {
  const totals = reportRows.reduce(
    (summary, row) => ({
      revenue: summary.revenue + row.revenue,
      spend: summary.spend + row.spend,
      purchaseCount: summary.purchaseCount + row.purchaseCount,
    }),
    {
      revenue: 0,
      spend: 0,
      purchaseCount: 0,
    },
  );
  const totalRoas = totals.spend > 0 ? totals.revenue / totals.spend : null;
  const lines =
    reportRows.length > 0
      ? reportRows.map(formatSlackRoasRow)
      : ['No campaign or product activity found for this period.'];

  return [
    `📊 *Payhip × Meta ROAS ${formatPeriodLabel(period)} Report*`,
    `🗓️ *Date range:* ${dateRange.metaSince} → ${dateRange.metaUntil}`,
    '',
    '*Summary*',
    `💰 *Revenue:* ${formatMoney(totals.revenue)}`,
    `💸 *Ad spend:* ${formatMoney(totals.spend)}`,
    `📈 *ROAS:* ${formatRoas(totalRoas)}`,
    `🛒 *Purchases:* ${totals.purchaseCount}`,
    '',
    '*Campaign Breakdown*',
    ...lines,
  ].join('\n');
}

function formatSlackRoasRow(row: RoasReportRow): string {
  return [
    `• 🎯 *${row.campaignName}* (${row.campaignId})`,
    `  ↳ 📦 ${row.productName} (${row.productId})`,
    `  ↳ 💰 Revenue: ${formatMoney(row.revenue)} | 💸 Spend: ${formatMoney(row.spend)} | 📈 ROAS: ${formatRoas(row.roas)} | 🛒 Purchases: ${row.purchaseCount}`,
  ].join('\n');
}

function formatRoas(value: number | null): string {
  return value === null ? 'n/a' : `${roundRatio(value)}x`;
}

function formatPeriodLabel(period: RoasReportPeriod): string {
  return period.charAt(0).toUpperCase() + period.slice(1);
}
