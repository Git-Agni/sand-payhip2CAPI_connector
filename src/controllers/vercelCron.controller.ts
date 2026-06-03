import type { Request, Response } from 'express';
import { config } from '../config/env.js';
import { logger } from '../services/logging.service.js';

const hasValidCronAuthorization = (
  authorization: string | undefined,
): boolean => authorization === `Bearer ${config.cron.secret}`;

export const handleSlackRoasCron = async (
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

  logger.info('Accepted Vercel cron ROAS calculation request', {
    report: 'slack_roas',
    defaultPeriod: 'previous_completed_day',
  });

  response.status(202).json({
    status: 'accepted',
    report: 'slack_roas',
    defaultPeriod: 'previous_completed_day',
  });
};
