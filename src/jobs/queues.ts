import { Queue } from 'bullmq';

import { QUEUE_NAMES } from '../config/constants.js';
import { createQueueConnection } from '../db/redis.js';

import type {
  AlertCleanupJobData,
  NotificationDispatchJobData,
  RiskRecalculationJobData,
  StatisticsGenerationJobData,
} from './jobTypes.js';

const connection = createQueueConnection('producer');

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 5000 },
  removeOnComplete: { count: 500 },
  removeOnFail: { count: 1000 },
};

export const riskRecalculationQueue = new Queue<RiskRecalculationJobData>(
  QUEUE_NAMES.RISK_RECALCULATION,
  {
    connection,
    defaultJobOptions,
  },
);

export const alertCleanupQueue = new Queue<AlertCleanupJobData>(QUEUE_NAMES.ALERT_CLEANUP, {
  connection,
  defaultJobOptions,
});

export const statisticsGenerationQueue = new Queue<StatisticsGenerationJobData>(
  QUEUE_NAMES.STATISTICS_GENERATION,
  {
    connection,
    defaultJobOptions,
  },
);

export const notificationDispatchQueue = new Queue<NotificationDispatchJobData>(
  QUEUE_NAMES.NOTIFICATION_DISPATCH,
  {
    connection,
    defaultJobOptions,
  },
);

export const allQueues = [
  riskRecalculationQueue,
  alertCleanupQueue,
  statisticsGenerationQueue,
  notificationDispatchQueue,
];

export async function closeQueues(): Promise<void> {
  await Promise.all(allQueues.map((q) => q.close()));
}
