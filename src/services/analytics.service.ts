import type { PrismaClient } from '@prisma/client';

export class AnalyticsService {
  constructor(private readonly prisma: PrismaClient) {}

  async getOverview() {
    const [totalAlerts, totalReports, totalDetections, flaggedAccounts, flaggedAssets, openAlerts] =
      await Promise.all([
        this.prisma.alert.count(),
        this.prisma.report.count(),
        this.prisma.detection.count(),
        this.prisma.account.count({ where: { isFlagged: true } }),
        this.prisma.asset.count({ where: { isFlagged: true } }),
        this.prisma.alert.count({ where: { status: 'OPEN' } }),
      ]);

    return {
      totalAlerts,
      totalReports,
      totalDetections,
      flaggedAccounts,
      flaggedAssets,
      openAlerts,
    };
  }

  async getDetectionCounts(sinceDays = 7) {
    const since = new Date(Date.now() - sinceDays * 86_400_000);
    const grouped = await this.prisma.detection.groupBy({
      by: ['detectorName'],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
      orderBy: { _count: { detectorName: 'desc' } },
    });

    return grouped.map((g) => ({ detector: g.detectorName, count: g._count._all }));
  }

  async getTrendingScams(sinceDays = 3, limit = 10) {
    const since = new Date(Date.now() - sinceDays * 86_400_000);
    const grouped = await this.prisma.detection.groupBy({
      by: ['entityType', 'entityId'],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
      _max: { severity: true },
      orderBy: { _count: { entityId: 'desc' } },
      take: limit,
    });

    return grouped.map((g) => ({
      entityType: g.entityType,
      entityId: g.entityId,
      detectionCount: g._count._all,
      maxSeverity: g._max.severity,
    }));
  }

  async getTopMaliciousAssets(limit = 10) {
    return this.prisma.asset.findMany({
      where: { isFlagged: true },
      orderBy: { riskScores: { _count: 'desc' } },
      take: limit,
      include: { _count: { select: { riskScores: true, alerts: true } } },
    });
  }

  async getTopMaliciousIssuers(limit = 10) {
    return this.prisma.account.findMany({
      where: { isFlagged: true, issuedAssets: { some: {} } },
      orderBy: { riskScores: { _count: 'desc' } },
      take: limit,
      include: { _count: { select: { riskScores: true, issuedAssets: true } } },
    });
  }

  async getNetworkActivity(sinceHours = 24) {
    const since = new Date(Date.now() - sinceHours * 3_600_000);
    const grouped = await this.prisma.horizonEvent.groupBy({
      by: ['type'],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    });

    return grouped.map((g) => ({ type: g.type, count: g._count._all }));
  }
}
