import type { EntityType, PrismaClient } from '@prisma/client';

import type { RiskScoreResult } from '../types/risk.js';

export class RiskHistoryService {
  constructor(private readonly prisma: PrismaClient) {}

  async getLatestScore(entityType: EntityType, entityId: string): Promise<number | null> {
    const latest = await this.prisma.riskScore.findFirst({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
      select: { score: true },
    });
    return latest?.score ?? null;
  }

  async getHistory(entityType: EntityType, entityId: string, limit = 20) {
    return this.prisma.riskScore.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async persist(result: RiskScoreResult, links: { accountId?: string; assetId?: string } = {}) {
    return this.prisma.riskScore.create({
      data: {
        entityType: result.entityType,
        entityId: result.entityId,
        accountId: links.accountId,
        assetId: links.assetId,
        score: result.score,
        severity: result.severity,
        confidence: result.confidence,
        reasons: result.reasons as unknown as object,
        detector: result.detector,
      },
    });
  }
}
