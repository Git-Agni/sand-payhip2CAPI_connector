import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('resolveDateRange', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('META_PIXEL_ID', 'pixel-id');
    vi.stubEnv('META_ACCESS_TOKEN', 'meta-access-token');
    vi.stubEnv('CUSTOMERIO_API_SECRET', 'customerio-api-secret');
  });

  it('resolves daily reports to the previous completed UTC day', async () => {
    const { resolveDateRange } = await import('./roasReport.service.js');

    const dateRange = resolveDateRange(
      'daily',
      new Date('2026-06-03T00:15:00.000Z'),
    );

    expect(dateRange.start.toISOString()).toBe('2026-06-02T00:00:00.000Z');
    expect(dateRange.end.toISOString()).toBe('2026-06-02T23:59:59.999Z');
    expect(dateRange.metaSince).toBe('2026-06-02');
    expect(dateRange.metaUntil).toBe('2026-06-02');
  });

  it('resolves monthly reports to the previous completed UTC month', async () => {
    const { resolveDateRange } = await import('./roasReport.service.js');

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
