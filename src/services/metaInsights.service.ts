import { config } from '../config/env.js';
import type {
  MetaInsightsCampaignRow,
  MetaInsightsResponse,
} from '../models/meta.models.js';
import { logger } from './logging.service.js';

export interface MetaInsightsDateRange {
  readonly since: string;
  readonly until: string;
}

export type MetaInsightsService = ReturnType<typeof makeMetaInsightsService>

export function makeMetaInsightsService() {
  async function getCampaignSpend(
    dateRange: MetaInsightsDateRange,
  ): Promise<readonly MetaInsightsCampaignRow[]> {
    if (!config.meta.adAccountId) {
      throw new Error('META_AD_ACCOUNT_ID is required for ROAS reporting');
    }

    const rows: MetaInsightsCampaignRow[] = [];
    let nextUrl: string | undefined = insightsUrl(dateRange);

    while (nextUrl) {
      logger.debug('Fetching Meta Insights campaign spend', {
        dateRange,
        graphApiVersion: config.meta.graphApiVersion,
      });

      const response = await fetch(nextUrl);
      const responseBody = (await response.json()) as
        | MetaInsightsResponse
        | { error?: unknown };

      if (!response.ok) {
        logger.warn('Meta Insights request rejected', {
          statusCode: response.status,
          response: responseBody,
        });
        throw new Error(
          `Meta Insights request failed: ${JSON.stringify(responseBody)}`,
        );
      }

      const insightsResponse = responseBody as MetaInsightsResponse;
      rows.push(...(insightsResponse.data ?? []));
      nextUrl = insightsResponse.paging?.next;
    }

    return rows;
  }

  return {
    getCampaignSpend,
  };
}

function insightsUrl(dateRange: MetaInsightsDateRange): string {
  const adAccountId = config.meta.adAccountId;

  if (!adAccountId) {
    throw new Error('META_AD_ACCOUNT_ID is required for ROAS reporting');
  }

  const normalizedAccountId = adAccountId.startsWith('act_')
    ? adAccountId
    : `act_${adAccountId}`;
  const params = new URLSearchParams({
    access_token: config.meta.marketingAccessToken,
    fields: 'campaign_id,campaign_name,spend',
    level: 'campaign',
    time_range: JSON.stringify(dateRange),
  });

  return `https://graph.facebook.com/${config.meta.graphApiVersion}/${normalizedAccountId}/insights?${params.toString()}`;
}
