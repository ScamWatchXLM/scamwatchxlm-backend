import { Worker } from 'bullmq';

import { QUEUE_NAMES } from '../config/constants.js';
import { childLogger } from '../config/logger.js';
import { prisma } from '../db/prisma.js';
import { createQueueConnection } from '../db/redis.js';
import type { StatisticsGenerationJobData } from '../jobs/jobTypes.js';

const log = childLogger('worker:statistics-generation');

/** Materializes a point-in-time StatsSnapshot so analytics endpoints can serve trends without expensive live aggregation. */
export function createStatisticsGenerationWorker(): Worker<StatisticsGenerationJobData> {
  return new Worker<StatisticsGenerationJobData>(
    QUEUE_NAMES.STATISTICS_GENERATION,
    async (job) => {
      const [
        totalAlerts,
        totalReports,
        totalDetections,
        flaggedAccounts,
        flaggedAssets,
        severityGroups,
        detectorGroups,
      ] = await Promise.all([
        prisma.alert.count(),
        prisma.report.count(),
        prisma.detection.count(),
        prisma.account.count({ where: { isFlagged: true } }),
        prisma.asset.count({ where: { isFlagged: true } }),
        prisma.alert.groupBy({ by: ['severity'], _count: { _all: true } }),
        prisma.detection.groupBy({ by: ['detectorName'], _count: { _all: true } }),
      ]);

      await prisma.statsSnapshot.create({
        data: {
          period: job.data.period,
          totalAlerts,
          totalReports,
          totalDetections,
          flaggedAccounts,
          flaggedAssets,
          bySeverity: Object.fromEntries(severityGroups.map((g) => [g.severity, g._count._all])),
          byDetector: Object.fromEntries(
            detectorGroups.map((g) => [g.detectorName, g._count._all]),
          ),
        },
      });

      log.info({ jobId: job.id, period: job.data.period }, 'Statistics snapshot generated');
    },
    { connection: createQueueConnection('statistics-generation-worker'), concurrency: 1 },
  );
}
