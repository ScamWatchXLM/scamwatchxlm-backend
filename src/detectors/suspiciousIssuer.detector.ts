import { Severity } from '@prisma/client';

import type {
  NormalizedHorizonEvent,
  SignerChangeEventData,
  ThresholdChangeEventData,
} from '../types/horizon.js';
import type { DetectionResult } from '../types/risk.js';

import { BaseDetector, type DetectorContext } from './base/Detector.js';

const POST_ISSUANCE_RUG_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Flags asset issuers that change signers or thresholds shortly after
 * issuing an asset — a common precursor to a "rug pull" where the issuer
 * locks out other signers or raises weights before abandoning the token.
 */
export class SuspiciousIssuerDetector extends BaseDetector {
  readonly name = 'suspicious-issuer-activity';
  readonly description =
    'Detects issuers modifying signers/thresholds shortly after issuing an asset.';
  readonly appliesTo = ['SIGNER_CHANGE', 'THRESHOLD_CHANGE'] as const;

  async detect(event: NormalizedHorizonEvent, ctx: DetectorContext): Promise<DetectionResult[]> {
    const account = (event.raw as unknown as SignerChangeEventData | ThresholdChangeEventData)
      .account;

    const asset = await ctx.prisma.asset.findFirst({
      where: { issuer: account },
      orderBy: { createdAt: 'desc' },
    });
    if (!asset) return [];

    const sinceIssuanceMs = Date.now() - asset.createdAt.getTime();
    if (sinceIssuanceMs > POST_ISSUANCE_RUG_WINDOW_MS) return [];

    const changeKind = event.type === 'SIGNER_CHANGE' ? 'signer' : 'threshold';

    return [
      {
        detectorName: this.name,
        entityType: 'ISSUER',
        entityId: account,
        dedupeKey: this.dedupeKey(account, event.txHash),
        severity:
          sinceIssuanceMs < POST_ISSUANCE_RUG_WINDOW_MS / 4 ? Severity.HIGH : Severity.MEDIUM,
        confidence: 0.55,
        reasons: [
          {
            code: 'POST_ISSUANCE_ACCOUNT_CHANGE',
            message: `Issuer of ${asset.code} changed its ${changeKind} configuration ${Math.round(sinceIssuanceMs / 3_600_000)}h after issuance`,
            weight: 0.5,
          },
        ],
        evidence: { txHash: event.txHash, ledger: event.ledger, assetCode: asset.code, changeKind },
      },
    ];
  }
}
