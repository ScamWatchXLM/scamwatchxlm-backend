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
      const where = {
        status: { in: ['RESOLVED' as const, 'DISMISSED' as const] },
        updatedAt: { lt: cutoff },
      };

      // Notification.alertId is ON DELETE RESTRICT, and every dispatched alert has at
      // least one Notification row, so deleting the alerts directly would violate the FK
      // constraint and abort the whole batch. Clear their notifications first.
      const [, result] = await prisma.$transaction([
        prisma.notification.deleteMany({ where: { alert: where } }),
        prisma.alert.deleteMany({ where }),
      ]);

      log.info({ jobId: job.id, deleted: result.count, cutoff }, 'Alert cleanup complete');
    },
    { connection: createQueueConnection('alert-cleanup-worker'), concurrency: 1 },
  );
}
