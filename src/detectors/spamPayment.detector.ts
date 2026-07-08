import { Severity } from '@prisma/client';

import { SPAM_PAYMENT_THRESHOLD, SPAM_PAYMENT_WINDOW_MS } from '../config/constants.js';
import type { NormalizedHorizonEvent, PaymentEventData } from '../types/horizon.js';
import type { DetectionResult } from '../types/risk.js';

import { BaseDetector, type DetectorContext } from './base/Detector.js';

/**
 * Flags accounts that flood the network with a high volume of outbound
 * payments in a short window, regardless of amount — typical of bots
 * blasting phishing links via memos or farming transaction counts.
 */
export class SpamPaymentDetector extends BaseDetector {
  readonly name = 'spam-payment';
  readonly description =
    'Detects accounts sending an abnormally high volume of payments in a short window.';
  readonly appliesTo = ['PAYMENT'] as const;

  async detect(event: NormalizedHorizonEvent, ctx: DetectorContext): Promise<DetectionResult[]> {
    const data = event.raw as unknown as PaymentEventData;
    const windowStart = new Date(Date.now() - SPAM_PAYMENT_WINDOW_MS);

    const count = await ctx.prisma.horizonEvent.count({
      where: {
        type: 'PAYMENT',
        createdAt: { gte: windowStart },
        raw: { path: ['from'], equals: data.from },
      },
    });

    if (count < SPAM_PAYMENT_THRESHOLD) return [];

    return [
      {
        detectorName: this.name,
        entityType: 'ACCOUNT',
        entityId: data.from,
        dedupeKey: this.dedupeKey(data.from, Math.floor(Date.now() / SPAM_PAYMENT_WINDOW_MS)),
        severity: count >= SPAM_PAYMENT_THRESHOLD * 3 ? Severity.HIGH : Severity.MEDIUM,
        confidence: Math.min(0.9, 0.5 + count / (SPAM_PAYMENT_THRESHOLD * 5)),
        reasons: [
          {
            code: 'PAYMENT_FLOOD',
            message: `Sent ${count} payments within ${SPAM_PAYMENT_WINDOW_MS / 60_000} minutes (threshold: ${SPAM_PAYMENT_THRESHOLD})`,
            weight: 0.55,
          },
        ],
        evidence: { txHash: event.txHash, ledger: event.ledger, paymentCount: count },
      },
    ];
  }
}
