import { Worker } from 'bullmq';

import { QUEUE_NAMES, RISK_DECAY_LOOKBACK_MS } from '../config/constants.js';
import { env } from '../config/env.js';
import { childLogger } from '../config/logger.js';
import { prisma } from '../db/prisma.js';
import { createQueueConnection } from '../db/redis.js';
import type { RiskRecalculationJobData } from '../jobs/jobTypes.js';
import { RiskHistoryService } from '../risk/riskHistory.service.js';
import { RiskScorer } from '../risk/RiskScorer.js';

const log = childLogger('worker:risk-recalculation');

/**
 * Periodically re-scores flagged entities so risk decays over time when no
 * fresh detections corroborate the original signal, and so entities that
 * accumulate multiple independent detections get a combined score rather
 * than only ever reflecting the most recent one.
 */
export function createRiskRecalculationWorker(): Worker<RiskRecalculationJobData> {
  const scorer = new RiskScorer();
  const history = new RiskHistoryService(prisma);

  return new Worker<RiskRecalculationJobData>(
    QUEUE_NAMES.RISK_RECALCULATION,
    async (job) => {
      const flaggedAccounts = await prisma.account.findMany({
        where: { isFlagged: true },
        select: { publicKey: true },
      });
      const flaggedAssets = await prisma.asset.findMany({
        where: { isFlagged: true },
        select: { code: true, issuer: true },
      });

      let recalculated = 0;
      const lookbackStart = new Date(Date.now() - RISK_DECAY_LOOKBACK_MS);

      for (const account of flaggedAccounts) {
        const recentDetections = await prisma.detection.findMany({
          where: {
            entityType: 'ACCOUNT',
            entityId: account.publicKey,
            createdAt: { gte: lookbackStart },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        });

        const previousScore = await history.getLatestScore('ACCOUNT', account.publicKey);
        if (recentDetections.length === 0 && previousScore == null) continue;

        const result = scorer.score({
          entityType: 'ACCOUNT',
          entityId: account.publicKey,
          previousScore,
          detections: recentDetections.map((d) => ({
            detectorName: d.detectorName,
            entityType: d.entityType,
            entityId: d.entityId,
            dedupeKey: d.dedupeKey,
            severity: d.severity,
            confidence: d.confidence,
            reasons: d.reasons as never,
          })),
        });
        await history.persist(result);
        recalculated++;
      }

      for (const asset of flaggedAssets) {
        const entityId = `${asset.code}:${asset.issuer}`;
        const recentDetections = await prisma.detection.findMany({
          where: {
            entityType: 'ASSET',
            entityId,
            createdAt: { gte: lookbackStart },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        });

        const previousScore = await history.getLatestScore('ASSET', entityId);
        if (recentDetections.length === 0 && previousScore == null) continue;

        const result = scorer.score({
          entityType: 'ASSET',
          entityId,
          previousScore,
          detections: recentDetections.map((d) => ({
            detectorName: d.detectorName,
            entityType: d.entityType,
            entityId: d.entityId,
            dedupeKey: d.dedupeKey,
            severity: d.severity,
            confidence: d.confidence,
            reasons: d.reasons as never,
          })),
        });
        await history.persist(result);
        recalculated++;
      }

      log.info({ jobId: job.id, recalculated }, 'Risk recalculation complete');
    },
    {
      connection: createQueueConnection('risk-recalculation-worker'),
      concurrency: env.WORKER_CONCURRENCY,
    },
  );
}
