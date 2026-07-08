import { Worker } from 'bullmq';

import { QUEUE_NAMES } from '../config/constants.js';
import { env } from '../config/env.js';
import { childLogger } from '../config/logger.js';
import { prisma } from '../db/prisma.js';
import { createQueueConnection } from '../db/redis.js';
import type { NotificationDispatchJobData } from '../jobs/jobTypes.js';
import { NotificationDispatcher } from '../notifications/NotificationDispatcher.js';
import { NotFoundError } from '../utils/errors.js';

const log = childLogger('worker:notification-dispatch');

export function createNotificationDispatchWorker(): Worker<NotificationDispatchJobData> {
  const dispatcher = new NotificationDispatcher(prisma);

  return new Worker<NotificationDispatchJobData>(
    QUEUE_NAMES.NOTIFICATION_DISPATCH,
    async (job) => {
      const alert = await prisma.alert.findUnique({ where: { id: job.data.alertId } });
      if (!alert) throw new NotFoundError('Alert', job.data.alertId);

      await dispatcher.dispatch(alert);
      log.info({ jobId: job.id, alertId: alert.id }, 'Notification dispatch complete');
    },
    {
      connection: createQueueConnection('notification-dispatch-worker'),
      concurrency: env.WORKER_CONCURRENCY,
    },
  );
}
