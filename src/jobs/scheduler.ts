import { env } from '../config/env.js';
import { childLogger } from '../config/logger.js';

import { alertCleanupQueue, riskRecalculationQueue, statisticsGenerationQueue } from './queues.js';

const log = childLogger('scheduler');

/** Registers repeatable (cron-driven) jobs. Idempotent — BullMQ dedupes by job name + repeat pattern. */
export async function registerScheduledJobs(): Promise<void> {
  await riskRecalculationQueue.add(
    'recalculate-all',
    {},
    { repeat: { pattern: env.RISK_RECALC_CRON }, jobId: 'scheduled-risk-recalculation' },
  );

  await alertCleanupQueue.add(
    'cleanup-old-alerts',
    { retentionDays: env.ALERT_RETENTION_DAYS },
    { repeat: { pattern: env.ALERT_CLEANUP_CRON }, jobId: 'scheduled-alert-cleanup' },
  );

  await statisticsGenerationQueue.add(
    'generate-hourly-stats',
    { period: 'hourly' },
    { repeat: { pattern: env.STATS_GENERATION_CRON }, jobId: 'scheduled-stats-generation' },
  );

  log.info('Scheduled jobs registered');
}
