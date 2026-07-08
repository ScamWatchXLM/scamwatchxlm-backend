import { Severity } from '@prisma/client';

import {
  RAPID_ACCOUNT_CREATION_THRESHOLD,
  RAPID_ACCOUNT_CREATION_WINDOW_MS,
} from '../config/constants.js';
import type { AccountCreatedEventData, NormalizedHorizonEvent } from '../types/horizon.js';
import type { DetectionResult } from '../types/risk.js';

import { BaseDetector, type DetectorContext } from './base/Detector.js';

/**
 * Flags a funder account that creates an unusually large number of new
 * accounts in a short window — the setup phase of a bot farm or a scam
 * campaign that needs many disposable accounts.
 */
export class RapidAccountCreationDetector extends BaseDetector {
  readonly name = 'rapid-account-creation';
  readonly description = 'Detects funders creating many new accounts in a short window.';
  readonly appliesTo = ['ACCOUNT_CREATED'] as const;

  async detect(event: NormalizedHorizonEvent, ctx: DetectorContext): Promise<DetectionResult[]> {
    const data = event.raw as unknown as AccountCreatedEventData;
    const windowStart = new Date(Date.now() - RAPID_ACCOUNT_CREATION_WINDOW_MS);

    const count = await ctx.prisma.horizonEvent.count({
      where: {
        type: 'ACCOUNT_CREATED',
        createdAt: { gte: windowStart },
        raw: { path: ['funder'], equals: data.funder },
      },
    });

    if (count < RAPID_ACCOUNT_CREATION_THRESHOLD) return [];

    return [
      {
        detectorName: this.name,
        entityType: 'ACCOUNT',
        entityId: data.funder,
        dedupeKey: this.dedupeKey(
          data.funder,
          Math.floor(Date.now() / RAPID_ACCOUNT_CREATION_WINDOW_MS),
        ),
        severity: count >= RAPID_ACCOUNT_CREATION_THRESHOLD * 3 ? Severity.HIGH : Severity.MEDIUM,
        confidence: Math.min(0.9, 0.5 + count / (RAPID_ACCOUNT_CREATION_THRESHOLD * 5)),
        reasons: [
          {
            code: 'ACCOUNT_CREATION_BURST',
            message: `Funded ${count} new accounts within ${RAPID_ACCOUNT_CREATION_WINDOW_MS / 60_000} minutes (threshold: ${RAPID_ACCOUNT_CREATION_THRESHOLD})`,
            weight: 0.55,
          },
        ],
        evidence: { txHash: event.txHash, ledger: event.ledger, accountsCreated: count },
      },
    ];
  }
}
