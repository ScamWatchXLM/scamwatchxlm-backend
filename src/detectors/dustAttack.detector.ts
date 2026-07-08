import { Severity } from '@prisma/client';

import { DUST_PAYMENT_MAX_AMOUNT, SPAM_PAYMENT_WINDOW_MS } from '../config/constants.js';
import type { NormalizedHorizonEvent, PaymentEventData } from '../types/horizon.js';
import type { DetectionResult } from '../types/risk.js';

import { BaseDetector, type DetectorContext } from './base/Detector.js';

const DUST_DISTINCT_RECIPIENTS_THRESHOLD = 15;

/**
 * A "dust attack" sends negligible amounts to many wallets so the sender can
 * later correlate on-chain activity and deanonymize victims. Flags a source
 * account once it has dusted a large number of distinct recipients.
 */
export class DustAttackDetector extends BaseDetector {
  readonly name = 'dust-attack';
  readonly description =
    'Detects accounts sending negligible-value payments to many distinct recipients.';
  readonly appliesTo = ['PAYMENT'] as const;

  async detect(event: NormalizedHorizonEvent, ctx: DetectorContext): Promise<DetectionResult[]> {
    const data = event.raw as unknown as PaymentEventData;
    const amount = Number.parseFloat(data.amount);
    if (Number.isNaN(amount) || amount > DUST_PAYMENT_MAX_AMOUNT) return [];

    const windowStart = new Date(Date.now() - SPAM_PAYMENT_WINDOW_MS);
    const recentDustPayments = await ctx.prisma.horizonEvent.findMany({
      where: {
        type: 'PAYMENT',
        createdAt: { gte: windowStart },
        raw: { path: ['from'], equals: data.from },
      },
      select: { raw: true },
      take: 500,
    });

    const recipients = new Set<string>();
    for (const row of recentDustPayments) {
      const payment = row.raw as unknown as PaymentEventData;
      const paymentAmount = Number.parseFloat(payment.amount);
      if (!Number.isNaN(paymentAmount) && paymentAmount <= DUST_PAYMENT_MAX_AMOUNT) {
        recipients.add(payment.to);
      }
    }
    recipients.add(data.to);

    if (recipients.size < DUST_DISTINCT_RECIPIENTS_THRESHOLD) return [];

    return [
      {
        detectorName: this.name,
        entityType: 'ACCOUNT',
        entityId: data.from,
        dedupeKey: this.dedupeKey(data.from, Math.floor(Date.now() / SPAM_PAYMENT_WINDOW_MS)),
        severity:
          recipients.size >= DUST_DISTINCT_RECIPIENTS_THRESHOLD * 2
            ? Severity.HIGH
            : Severity.MEDIUM,
        confidence: Math.min(0.9, 0.5 + recipients.size / 100),
        reasons: [
          {
            code: 'DUST_FANOUT',
            message: `Sent dust payments (<= ${DUST_PAYMENT_MAX_AMOUNT} XLM) to ${recipients.size} distinct accounts within ${SPAM_PAYMENT_WINDOW_MS / 60_000} minutes`,
            weight: 0.65,
          },
        ],
        evidence: {
          txHash: event.txHash,
          ledger: event.ledger,
          distinctRecipients: recipients.size,
        },
      },
    ];
  }
}
