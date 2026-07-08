import type { Prisma, PrismaClient } from '@prisma/client';

import { AlertEngine } from '../alerts/AlertEngine.js';
import { childLogger } from '../config/logger.js';
import { createDetectorRegistry, type DetectorRegistry } from '../detectors/index.js';
import { RiskHistoryService } from '../risk/riskHistory.service.js';
import { RiskScorer } from '../risk/RiskScorer.js';
import type {
  AccountCreatedEventData,
  AssetIssuanceEventData,
  NormalizedHorizonEvent,
} from '../types/horizon.js';
import type { DetectionResult } from '../types/risk.js';

const log = childLogger('stream-processor');

/**
 * Central pipeline that turns a normalized Horizon event into persisted
 * state, detections, risk scores, and alerts. This is the single place
 * where the "monitor -> detect -> score -> alert" flow is wired together so
 * both the live Horizon stream and backfill/replay tooling can share it.
 */
export class StreamProcessorService {
  private readonly riskScorer = new RiskScorer();
  private readonly riskHistory: RiskHistoryService;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly alertEngine: AlertEngine,
    private readonly registry: DetectorRegistry = createDetectorRegistry(),
  ) {
    this.riskHistory = new RiskHistoryService(prisma);
  }

  async process(event: NormalizedHorizonEvent): Promise<void> {
    await this.persistEvent(event);
    await this.syncEntities(event);

    const detections = await this.registry.run(event, this.prisma);
    for (const detection of detections) {
      await this.handleDetection(detection);
    }
  }

  private async persistEvent(event: NormalizedHorizonEvent): Promise<void> {
    const sourceAccount = await this.prisma.account.findUnique({
      where: { publicKey: event.sourceAccount },
    });

    await this.prisma.horizonEvent.upsert({
      where: { txHash_opIndex: { txHash: event.txHash, opIndex: event.opIndex } },
      update: {},
      create: {
        type: event.type,
        ledger: event.ledger,
        txHash: event.txHash,
        opIndex: event.opIndex,
        sourceAccountId: sourceAccount?.id,
        raw: event.raw as unknown as Prisma.InputJsonValue,
        processedAt: new Date(),
      },
    });
  }

  private async syncEntities(event: NormalizedHorizonEvent): Promise<void> {
    if (event.type === 'ACCOUNT_CREATED') {
      const data = event.raw as unknown as AccountCreatedEventData;
      await this.prisma.account.upsert({
        where: { publicKey: data.account },
        update: { lastSeenAt: new Date() },
        create: { publicKey: data.account, createdAtLedger: event.ledger },
      });
      return;
    }

    if (event.type === 'ASSET_ISSUANCE') {
      const data = event.raw as unknown as AssetIssuanceEventData;
      await this.prisma.account.upsert({
        where: { publicKey: data.issuer },
        update: { lastSeenAt: new Date() },
        create: { publicKey: data.issuer },
      });
      await this.prisma.asset.upsert({
        where: { code_issuer: { code: data.assetCode, issuer: data.issuer } },
        update: {},
        create: { code: data.assetCode, issuer: data.issuer },
      });
      return;
    }

    // Any other event still implies the source account is alive; keep lastSeenAt fresh.
    // Pre-existing accounts we haven't observed an ACCOUNT_CREATED event for (e.g. anything
    // that existed before this service started watching) won't have a row yet, so upsert.
    await this.prisma.account.upsert({
      where: { publicKey: event.sourceAccount },
      update: { lastSeenAt: new Date() },
      create: { publicKey: event.sourceAccount },
    });
  }

  private async handleDetection(detection: DetectionResult): Promise<void> {
    const existing = await this.prisma.detection.findUnique({
      where: { dedupeKey: detection.dedupeKey },
    });
    if (existing) return; // already recorded and (if applicable) alerted

    const persisted = await this.prisma.detection.create({
      data: {
        detectorName: detection.detectorName,
        entityType: detection.entityType,
        entityId: detection.entityId,
        severity: detection.severity,
        confidence: detection.confidence,
        reasons: detection.reasons as unknown as object,
        evidence: (detection.evidence ?? {}) as object,
        dedupeKey: detection.dedupeKey,
      },
    });

    const links = await this.resolveLinks(detection);
    const previousScore = await this.riskHistory.getLatestScore(
      detection.entityType,
      detection.entityId,
    );
    const riskResult = this.riskScorer.score({
      entityType: detection.entityType,
      entityId: detection.entityId,
      detections: [detection],
      previousScore,
    });

    await this.riskHistory.persist(riskResult, links);

    if (['ACCOUNT', 'ISSUER'].includes(detection.entityType) && links.accountId) {
      await this.prisma.account
        .update({ where: { id: links.accountId }, data: { isFlagged: true } })
        .catch(() => undefined);
    }
    if (detection.entityType === 'ASSET' && links.assetId) {
      await this.prisma.asset
        .update({ where: { id: links.assetId }, data: { isFlagged: true } })
        .catch(() => undefined);
    }

    await this.alertEngine.evaluate(riskResult, persisted.id, links);
    log.info(
      { detector: detection.detectorName, entityId: detection.entityId, score: riskResult.score },
      'Detection processed',
    );
  }

  private async resolveLinks(
    detection: DetectionResult,
  ): Promise<{ accountId?: string; assetId?: string }> {
    if (detection.entityType === 'ACCOUNT' || detection.entityType === 'ISSUER') {
      const account = await this.prisma.account.findUnique({
        where: { publicKey: detection.entityId },
      });
      return { accountId: account?.id };
    }
    if (detection.entityType === 'ASSET') {
      const [code, issuer] = detection.entityId.split(':');
      if (!code || !issuer) return {};
      const asset = await this.prisma.asset.findUnique({
        where: { code_issuer: { code, issuer } },
      });
      return { assetId: asset?.id };
    }
    return {};
  }
}
