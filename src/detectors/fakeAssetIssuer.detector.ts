import { Severity } from '@prisma/client';

import { NEW_ACCOUNT_WINDOW_MS } from '../config/constants.js';
import type { AssetIssuanceEventData, NormalizedHorizonEvent } from '../types/horizon.js';
import type { DetectionResult } from '../types/risk.js';

import { BaseDetector, type DetectorContext } from './base/Detector.js';

/**
 * Flags assets issued by accounts created moments earlier — a hallmark of
 * disposable "fake issuer" accounts spun up specifically to mint a scam
 * token before being abandoned.
 */
export class FakeAssetIssuerDetector extends BaseDetector {
  readonly name = 'fake-asset-issuer';
  readonly description = 'Detects assets issued by freshly created accounts.';
  readonly appliesTo = ['ASSET_ISSUANCE'] as const;

  async detect(event: NormalizedHorizonEvent, ctx: DetectorContext): Promise<DetectionResult[]> {
    const data = event.raw as unknown as AssetIssuanceEventData;

    const issuer = await ctx.prisma.account.findUnique({ where: { publicKey: data.issuer } });
    if (!issuer) return [];

    const accountAgeMs = Date.now() - issuer.firstSeenAt.getTime();
    if (accountAgeMs > NEW_ACCOUNT_WINDOW_MS) return [];

    const confidence = Math.min(0.95, 0.6 + (1 - accountAgeMs / NEW_ACCOUNT_WINDOW_MS) * 0.35);

    return [
      {
        detectorName: this.name,
        entityType: 'ASSET',
        entityId: `${data.assetCode}:${data.issuer}`,
        dedupeKey: this.dedupeKey(data.assetCode, data.issuer),
        severity: accountAgeMs < NEW_ACCOUNT_WINDOW_MS / 4 ? Severity.CRITICAL : Severity.HIGH,
        confidence,
        reasons: [
          {
            code: 'NEW_ISSUER_ACCOUNT',
            message: `Issuer account was created ${Math.round(accountAgeMs / 60_000)} minute(s) before issuing ${data.assetCode}`,
            weight: 0.7,
          },
        ],
        evidence: { txHash: event.txHash, ledger: event.ledger, accountAgeMs },
      },
    ];
  }
}
