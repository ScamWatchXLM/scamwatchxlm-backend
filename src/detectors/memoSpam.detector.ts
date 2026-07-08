import { Severity } from '@prisma/client';

import { MEMO_SPAM_REPEAT_THRESHOLD, SPAM_PAYMENT_WINDOW_MS } from '../config/constants.js';
import type { NormalizedHorizonEvent, PaymentEventData } from '../types/horizon.js';
import type { DetectionResult } from '../types/risk.js';

import { BaseDetector, type DetectorContext } from './base/Detector.js';

/**
 * Flags a memo string once it has been reused across many payments from
 * different senders in a short window — a strong signal of coordinated
 * phishing/advertising spam ("claim your airdrop at http://...") rather than
 * a single account being noisy.
 */
export class MemoSpamDetector extends BaseDetector {
  readonly name = 'memo-spam';
  readonly description = 'Detects memo text reused across many payments in a short window.';
  readonly appliesTo = ['PAYMENT'] as const;

  async detect(event: NormalizedHorizonEvent, ctx: DetectorContext): Promise<DetectionResult[]> {
    const data = event.raw as unknown as PaymentEventData;
    const memo = data.memo?.trim();
    if (!memo || memo.length < 3) return [];

    const windowStart = new Date(Date.now() - SPAM_PAYMENT_WINDOW_MS);
    const recentWithMemo = await ctx.prisma.horizonEvent.findMany({
      where: {
        type: 'PAYMENT',
        createdAt: { gte: windowStart },
        raw: { path: ['memo'], equals: memo },
      },
      select: { raw: true },
      take: 500,
    });

    const distinctSenders = new Set<string>([data.from]);
    for (const row of recentWithMemo) {
      const payment = row.raw as unknown as PaymentEventData;
      distinctSenders.add(payment.from);
    }

    if (distinctSenders.size < MEMO_SPAM_REPEAT_THRESHOLD) return [];

    const looksLikePhishing = /https?:\/\/|claim|airdrop|reward|verify|winner/i.test(memo);

    return [
      {
        detectorName: this.name,
        entityType: 'TRANSACTION',
        entityId: event.txHash,
        dedupeKey: this.dedupeKey(memo, Math.floor(Date.now() / SPAM_PAYMENT_WINDOW_MS)),
        severity: looksLikePhishing ? Severity.HIGH : Severity.MEDIUM,
        confidence: Math.min(0.9, 0.5 + distinctSenders.size / (MEMO_SPAM_REPEAT_THRESHOLD * 3)),
        reasons: [
          {
            code: 'REPEATED_MEMO',
            message: `Memo "${memo}" reused by ${distinctSenders.size} distinct senders within ${SPAM_PAYMENT_WINDOW_MS / 60_000} minutes`,
            weight: looksLikePhishing ? 0.7 : 0.45,
          },
        ],
        evidence: {
          txHash: event.txHash,
          ledger: event.ledger,
          memo,
          distinctSenders: distinctSenders.size,
        },
      },
    ];
  }
}
