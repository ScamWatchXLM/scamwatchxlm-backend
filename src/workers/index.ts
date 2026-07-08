import closeWithGrace from 'close-with-grace';

import { childLogger } from '../config/logger.js';
import { disconnectPrisma } from '../db/prisma.js';
import { disconnectRedis } from '../db/redis.js';
import { closeQueues } from '../jobs/queues.js';
import { registerScheduledJobs } from '../jobs/scheduler.js';

import { createAlertCleanupWorker } from './alertCleanup.worker.js';
import { startHorizonMonitor } from './horizonMonitor.worker.js';
import { createNotificationDispatchWorker } from './notificationDispatch.worker.js';
import { createRiskRecalculationWorker } from './riskRecalculation.worker.js';
import { createStatisticsGenerationWorker } from './statisticsGeneration.worker.js';

const log = childLogger('workers');

async function main(): Promise<void> {
  const monitor = startHorizonMonitor();

  const workers = [
    createRiskRecalculationWorker(),
    createAlertCleanupWorker(),
    createStatisticsGenerationWorker(),
    createNotificationDispatchWorker(),
  ];

  workers.forEach((worker) => {
    worker.on('failed', (job, err) =>
      log.error({ err, jobId: job?.id, queue: worker.name }, 'Job failed'),
    );
    worker.on('completed', (job) =>
      log.debug({ jobId: job.id, queue: worker.name }, 'Job completed'),
    );
  });

  await registerScheduledJobs();
  log.info({ workerCount: workers.length }, 'Workers started');

  closeWithGrace({ delay: 10_000 }, async ({ err }) => {
    if (err) log.error({ err }, 'Shutting down due to error');
    monitor.stop();
    await Promise.all(workers.map((w) => w.close()));
    await closeQueues();
    await disconnectRedis();
    await disconnectPrisma();
    log.info('Workers shut down cleanly');
  });
}

main().catch((err) => {
  log.error({ err }, 'Failed to start workers');
  process.exit(1);
});
