import type { Request, Response } from 'express';
import { config } from '../config/env.js';
import { logger } from '../services/logging.service.js';
import {
  type RoasReportPeriod,
  type RoasReportService,
} from '../services/roasReport.service.js';


export default function makeVercelCronController({
  roasReportService
}: {
  roasReportService: RoasReportService
}) {

  const hasValidCronAuthorization = (
    authorization: string | undefined,
  ): boolean => authorization === `Bearer ${config.cron.secret}`;

  const handleSlackRoasCron = async (
    request: Request,
    response: Response,
  ): Promise<void> => {
    if (!config.cron.secret) {
      logger.error(
        'Rejected Vercel cron request because CRON_SECRET is not configured',
      );
      response.status(500).json({ error: 'cron_secret_not_configured' });
      return;
    }

    if (!hasValidCronAuthorization(request.header('authorization'))) {
      logger.warn('Rejected Vercel cron request with invalid authorization');
      response.status(401).json({ error: 'invalid_cron_authorization' });
      return;
    }

    const period = readRequestedPeriod(request);

    if (!period) {
      response.status(400).json({
        error: 'invalid_roas_period',
        expected: ['daily', 'weekly', 'monthly'],
      });
      return;
    }

    logger.info('Accepted Vercel cron ROAS calculation request', {
      report: 'slack_roas',
      period,
    });

    try {
      await roasReportService.logCampaignRoas(period);
      response.status(202).json({
        status: 'accepted',
        report: 'slack_roas',
        period,
      });
    } catch (error) {
      logger.error('Failed to calculate Vercel cron ROAS report', error, {
        report: 'slack_roas',
        period,
      });
      response.status(502).json({
        error: 'roas_report_failed',
        message: error instanceof Error ? error.message : 'Unknown ROAS error',
      });
    }
  };

  function readRequestedPeriod(request: Request): RoasReportPeriod | null {
    const period =
      typeof request.params.period === 'string'
        ? request.params.period
        : typeof request.query.period === 'string'
          ? request.query.period
          : readBodyPeriod(request.body);

    if (period === 'daily' || period === 'weekly' || period === 'monthly') {
      return period;
    }

    return null;
  }

  function readBodyPeriod(body: unknown): unknown {
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return undefined;
    }

    return (body as Record<string, unknown>).period;
  }
  return {
    handleSlackRoasCron
  }
}

