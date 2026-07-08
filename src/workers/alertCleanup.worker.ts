import { Worker } from 'bullmq';

import { QUEUE_NAMES } from '../config/constants.js';
import { env } from '../config/env.js';
import { childLogger } from '../config/logger.js';
import { prisma } from '../db/prisma.js';
import { createQueueConnection } from '../db/redis.js';
import type { AlertCleanupJobData } from '../jobs/jobTypes.js';

const log = childLogger('worker:alert-cleanup');

/** Removes resolved/dismissed alerts past the retention window to keep the table lean. */
export function createAlertCleanupWorker(): Worker<AlertCleanupJobData> {
  return new Worker<AlertCleanupJobData>(
    QUEUE_NAMES.ALERT_CLEANUP,
    async (job) => {
      const retentionDays = job.data.retentionDays ?? env.ALERT_RETENTION_DAYS;
      const cutoff = new Date(Date.now() - retentionDays * 86_400_000);

      const result = await prisma.alert.deleteMany({
        where: {
          status: { in: ['RESOLVED', 'DISMISSED'] },
          updatedAt: { lt: cutoff },
        },
      });

      log.info({ jobId: job.id, deleted: result.count, cutoff }, 'Alert cleanup complete');
    },
    { connection: createQueueConnection('alert-cleanup-worker'), concurrency: 1 },
  );
}
