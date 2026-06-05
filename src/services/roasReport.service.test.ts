import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  makeRoasReportService,
  resolveDateRange,
} from './roasReport.service.js';

const makeTestRoasReportService = () =>
  makeRoasReportService({
    metaInsightsService: {
      getCampaignSpend: vi.fn(async () => []),
    },
    payhipPurchaseService: {
      populatePayhipPurchase: vi.fn(async () => undefined),
      getPurchasesByDateRange: vi.fn(async () => []),
    },
  });

describe('resolveDateRange', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('META_PIXEL_ID', 'pixel-id');
    vi.stubEnv('META_ACCESS_TOKEN', 'meta-access-token');
    vi.stubEnv('CUSTOMERIO_API_SECRET', 'customerio-api-secret');
  });

  it('resolves daily reports to the previous completed UTC day', () => {
    const dateRange = resolveDateRange(
      'daily',
      new Date('2026-06-03T00:15:00.000Z'),
    );

    expect(dateRange.start.toISOString()).toBe('2026-06-02T00:00:00.000Z');
    expect(dateRange.end.toISOString()).toBe('2026-06-02T23:59:59.999Z');
    expect(dateRange.metaSince).toBe('2026-06-02');
    expect(dateRange.metaUntil).toBe('2026-06-02');
  });

  it('resolves monthly reports to the previous completed UTC month', () => {
    const dateRange = resolveDateRange(
      'monthly',
      new Date('2026-06-03T00:15:00.000Z'),
    );

    expect(dateRange.start.toISOString()).toBe('2026-05-01T00:00:00.000Z');
    expect(dateRange.end.toISOString()).toBe('2026-05-31T23:59:59.999Z');
    expect(dateRange.metaSince).toBe('2026-05-01');
    expect(dateRange.metaUntil).toBe('2026-05-31');
  });
});

describe('formatSlackRoasReport', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('META_PIXEL_ID', 'pixel-id');
    vi.stubEnv('META_ACCESS_TOKEN', 'meta-access-token');
    vi.stubEnv('CUSTOMERIO_API_SECRET', 'customerio-api-secret');
  });

  it('groups multiple products under one campaign without duplicating spend', async () => {
    const { formatSlackRoasReport } = makeTestRoasReportService();

    const report = formatSlackRoasReport(
      'daily',
      {
        start: new Date('2026-06-02T00:00:00.000Z'),
        end: new Date('2026-06-02T23:59:59.999Z'),
        metaSince: '2026-06-02',
        metaUntil: '2026-06-02',
      },
      [
        {
          campaignId: 'campaign-1',
          campaignName: 'Launch Campaign',
          productId: 'product-1',
          productName: 'Course',
          revenue: 100,
          spend: 50,
          roas: 2,
          purchaseCount: 2,
        },
        {
          campaignId: 'campaign-1',
          campaignName: 'Launch Campaign',
          productId: 'product-2',
          productName: 'Template',
          revenue: 25,
          spend: 50,
          roas: 0.5,
          purchaseCount: 1,
        },
      ],
    );

    expect(report).toContain(
      '📈 *ROAS:* 2.5x (organic + paid) | 2.5x (paid)',
    );
    expect(report).toContain(
      'Campaign: *Launch Campaign* (campaign-1) → \n  ↳ 💰 Revenue: $125.00 | 💸 Spend: $50.00 | 📈 ROAS: 2.5x | 🛒 Purchases: 3',
    );
    expect(report).toContain(
      'Product: *Course* (product-1) \n    ↳ 💰 Revenue: $100.00 | 🛒 Purchases: 2',
    );
    expect(report).toContain(
      'Product: *Template* (product-2) \n    ↳ 💰 Revenue: $25.00 | 🛒 Purchases: 1',
    );
    expect(report).toContain('💸 *Ad spend:* $50.00');
  });

  it('splits summary ROAS into organic plus paid and paid-only values', async () => {
    const { formatSlackRoasReport } = makeTestRoasReportService();

    const report = formatSlackRoasReport(
      'daily',
      {
        start: new Date('2026-06-02T00:00:00.000Z'),
        end: new Date('2026-06-02T23:59:59.999Z'),
        metaSince: '2026-06-02',
        metaUntil: '2026-06-02',
      },
      [
        {
          campaignId: 'campaign-1',
          campaignName: 'Launch Campaign',
          productId: 'product-1',
          productName: 'Course',
          revenue: 100,
          spend: 50,
          roas: 2,
          purchaseCount: 2,
        },
        {
          campaignId: 'organic',
          campaignName: 'unknown campaign',
          productId: 'product-2',
          productName: 'Template',
          revenue: 25,
          spend: 0,
          roas: null,
          purchaseCount: 1,
        },
      ],
    );

    expect(report).toContain(
      '📈 *ROAS:* 2.5x (organic + paid) | 2x (paid)',
    );
  });

  it('adds two blank lines between campaign groups', async () => {
    const { formatSlackRoasReport } = makeTestRoasReportService();

    const report = formatSlackRoasReport(
      'weekly',
      {
        start: new Date('2026-05-26T00:00:00.000Z'),
        end: new Date('2026-06-02T23:59:59.999Z'),
        metaSince: '2026-05-26',
        metaUntil: '2026-06-02',
      },
      [
        {
          campaignId: 'campaign-1',
          campaignName: 'Launch Campaign',
          productId: 'product-1',
          productName: 'Course',
          revenue: 100,
          spend: 50,
          roas: 2,
          purchaseCount: 2,
        },
        {
          campaignId: 'campaign-2',
          campaignName: 'Retargeting Campaign',
          productId: 'product-2',
          productName: 'Template',
          revenue: 25,
          spend: 10,
          roas: 2.5,
          purchaseCount: 1,
        },
      ],
    );

    expect(report).toContain(
      'Product: *Course* (product-1) \n    ↳ 💰 Revenue: $100.00 | 🛒 Purchases: 2\n\n\n• 🎯 Campaign: *Retargeting Campaign* (campaign-2)',
    );
  });

  it('omits configured ids when no product or campaign data was found', async () => {
    const { formatSlackRoasReport } = makeTestRoasReportService();

    const report = formatSlackRoasReport(
      'monthly',
      {
        start: new Date('2026-05-01T00:00:00.000Z'),
        end: new Date('2026-05-31T23:59:59.999Z'),
        metaSince: '2026-05-01',
        metaUntil: '2026-05-31',
      },
      [
        {
          campaignId: 'configured-campaign',
          campaignName: 'unknown campaign',
          productId: 'configured-product',
          productName: 'unknown product',
          revenue: 0,
          spend: 0,
          roas: null,
          purchaseCount: 0,
        },
      ],
    );

    expect(report).not.toContain('configured-campaign');
    expect(report).not.toContain('configured-product');
    expect(report).toContain(
      'No campaign or product activity found for this period.',
    );
  });

  it('shows organic campaign ids as organic purchase data', async () => {
    const { formatSlackRoasReport } = makeTestRoasReportService();

    const report = formatSlackRoasReport(
      'daily',
      {
        start: new Date('2026-06-02T00:00:00.000Z'),
        end: new Date('2026-06-02T23:59:59.999Z'),
        metaSince: '2026-06-02',
        metaUntil: '2026-06-02',
      },
      [
        {
          campaignId: 'organic',
          campaignName: 'unknown campaign',
          productId: 'product-1',
          productName: 'Course',
          revenue: 100,
          spend: 0,
          roas: null,
          purchaseCount: 2,
        },
      ],
    );

    expect(report).toContain(
      '🌱 Organic purchase → \n  ↳ 💰 Revenue: $100.00  🛒 Purchases: 2',
    );
    expect(report).toContain(
      'Product: *Course* (product-1) \n    ↳ 💰 Revenue: $100.00 | 🛒 Purchases: 2',
    );
    expect(report).not.toContain('Campaign: *unknown campaign* (organic)');
  });
});
