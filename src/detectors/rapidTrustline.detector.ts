import { Severity } from '@prisma/client';

import { RAPID_TRUSTLINE_THRESHOLD, RAPID_TRUSTLINE_WINDOW_MS } from '../config/constants.js';
import type { NormalizedHorizonEvent, TrustlineEventData } from '../types/horizon.js';
import type { DetectionResult } from '../types/risk.js';

import { BaseDetector, type DetectorContext } from './base/Detector.js';

/**
 * Flags accounts that open an unusually high number of trustlines in a
 * short window — often bots pre-positioning to receive/relay scam tokens
 * across many freshly issued assets.
 */
export class RapidTrustlineDetector extends BaseDetector {
  readonly name = 'rapid-trustline-creation';
  readonly description = 'Detects accounts opening many trustlines in a short window.';
  readonly appliesTo = ['TRUSTLINE_CREATED'] as const;

  async detect(event: NormalizedHorizonEvent, ctx: DetectorContext): Promise<DetectionResult[]> {
    const data = event.raw as unknown as TrustlineEventData;
    const windowStart = new Date(Date.now() - RAPID_TRUSTLINE_WINDOW_MS);

    const count = await ctx.prisma.horizonEvent.count({
      where: {
        type: 'TRUSTLINE_CREATED',
        createdAt: { gte: windowStart },
        raw: { path: ['account'], equals: data.account },
      },
    });

    if (count < RAPID_TRUSTLINE_THRESHOLD) return [];

    return [
      {
        detectorName: this.name,
        entityType: 'ACCOUNT',
        entityId: data.account,
        dedupeKey: this.dedupeKey(data.account, Math.floor(Date.now() / RAPID_TRUSTLINE_WINDOW_MS)),
        severity: count >= RAPID_TRUSTLINE_THRESHOLD * 2 ? Severity.HIGH : Severity.MEDIUM,
        confidence: Math.min(0.85, 0.5 + count / (RAPID_TRUSTLINE_THRESHOLD * 4)),
        reasons: [
          {
            code: 'TRUSTLINE_BURST',
            message: `Opened ${count} trustlines within ${RAPID_TRUSTLINE_WINDOW_MS / 60_000} minutes (threshold: ${RAPID_TRUSTLINE_THRESHOLD})`,
            weight: 0.5,
          },
        ],
        evidence: { txHash: event.txHash, ledger: event.ledger, trustlineCount: count },
      },
    ];
  }
}
