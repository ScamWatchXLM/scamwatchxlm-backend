import { Severity } from '@prisma/client';

import { RAPID_ACCOUNT_CREATION_WINDOW_MS } from '../config/constants.js';
import type {
  AccountCreatedEventData,
  AssetIssuanceEventData,
  NormalizedHorizonEvent,
} from '../types/horizon.js';
import type { DetectionResult } from '../types/risk.js';

import { BaseDetector, type DetectorContext } from './base/Detector.js';

const CAMPAIGN_ISSUER_THRESHOLD = 5;

/**
 * Correlates asset issuance with account funding lineage: when a single
 * funder has bankrolled many accounts that go on to issue assets in the
 * same window, that is the signature of an organized scam campaign rather
 * than independent, unrelated token launches.
 */
export class HighVolumeCampaignDetector extends BaseDetector {
  readonly name = 'high-volume-scam-campaign';
  readonly description =
    'Detects clusters of issuer accounts funded by the same source, issuing assets in bulk.';
  readonly appliesTo = ['ASSET_ISSUANCE'] as const;

  async detect(event: NormalizedHorizonEvent, ctx: DetectorContext): Promise<DetectionResult[]> {
    const data = event.raw as unknown as AssetIssuanceEventData;

    const fundingEvent = await ctx.prisma.horizonEvent.findFirst({
      where: { type: 'ACCOUNT_CREATED', raw: { path: ['account'], equals: data.issuer } },
      orderBy: { createdAt: 'desc' },
    });
    if (!fundingEvent) return [];

    const funder = (fundingEvent.raw as unknown as AccountCreatedEventData).funder;
    const windowStart = new Date(Date.now() - RAPID_ACCOUNT_CREATION_WINDOW_MS);

    const siblingAccounts = await ctx.prisma.horizonEvent.findMany({
      where: {
        type: 'ACCOUNT_CREATED',
        createdAt: { gte: windowStart },
        raw: { path: ['funder'], equals: funder },
      },
      select: { raw: true },
      take: 500,
    });
    const siblingAddresses = new Set(
      siblingAccounts.map((row) => (row.raw as unknown as AccountCreatedEventData).account),
    );
    siblingAddresses.add(data.issuer);

    const issuanceEvents = await ctx.prisma.horizonEvent.findMany({
      where: { type: 'ASSET_ISSUANCE', createdAt: { gte: windowStart } },
      select: { raw: true },
      take: 1000,
    });
    const issuersInCluster = new Set<string>();
    for (const row of issuanceEvents) {
      const issuance = row.raw as unknown as AssetIssuanceEventData;
      if (siblingAddresses.has(issuance.issuer)) issuersInCluster.add(issuance.issuer);
    }

    if (issuersInCluster.size < CAMPAIGN_ISSUER_THRESHOLD) return [];

    return [
      {
        detectorName: this.name,
        entityType: 'ACCOUNT',
        entityId: funder,
        dedupeKey: this.dedupeKey(
          funder,
          Math.floor(Date.now() / RAPID_ACCOUNT_CREATION_WINDOW_MS),
        ),
        severity:
          issuersInCluster.size >= CAMPAIGN_ISSUER_THRESHOLD * 2
            ? Severity.CRITICAL
            : Severity.HIGH,
        confidence: Math.min(0.9, 0.5 + issuersInCluster.size / (CAMPAIGN_ISSUER_THRESHOLD * 4)),
        reasons: [
          {
            code: 'FUNDER_ISSUER_CLUSTER',
            message: `Funder ${funder} bankrolled ${issuersInCluster.size} accounts that issued assets within ${RAPID_ACCOUNT_CREATION_WINDOW_MS / 60_000} minutes`,
            weight: 0.75,
          },
        ],
        evidence: {
          txHash: event.txHash,
          ledger: event.ledger,
          funder,
          clusterIssuers: [...issuersInCluster],
        },
      },
    ];
  }
}
