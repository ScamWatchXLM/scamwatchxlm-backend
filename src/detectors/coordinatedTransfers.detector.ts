import { Severity } from '@prisma/client';

import {
  COORDINATED_TRANSFER_MIN_PARTICIPANTS,
  COORDINATED_TRANSFER_WINDOW_MS,
  LARGE_TRANSFER_AMOUNT,
} from '../config/constants.js';
import type { NormalizedHorizonEvent, PaymentEventData } from '../types/horizon.js';
import type { DetectionResult } from '../types/risk.js';

import { BaseDetector, type DetectorContext } from './base/Detector.js';

/**
 * Flags clusters of accounts moving large amounts between each other in a
 * short window — consistent with wash trading, layering, or a coordinated
 * exit-scam draining funds through intermediary wallets.
 */
export class CoordinatedTransfersDetector extends BaseDetector {
  readonly name = 'coordinated-transfers';
  readonly description =
    'Detects clusters of accounts moving large amounts between each other in a short window.';
  readonly appliesTo = ['PAYMENT'] as const;

  async detect(event: NormalizedHorizonEvent, ctx: DetectorContext): Promise<DetectionResult[]> {
    const data = event.raw as unknown as PaymentEventData;
    const amount = Number.parseFloat(data.amount);
    if (Number.isNaN(amount) || amount < LARGE_TRANSFER_AMOUNT) return [];

    const windowStart = new Date(Date.now() - COORDINATED_TRANSFER_WINDOW_MS);
    const recentLargeTransfers = await ctx.prisma.horizonEvent.findMany({
      where: { type: 'PAYMENT', createdAt: { gte: windowStart } },
      select: { raw: true },
      take: 1000,
    });

    const participants = new Set<string>([data.from, data.to]);
    let clusterVolume = amount;
    for (const row of recentLargeTransfers) {
      const payment = row.raw as unknown as PaymentEventData;
      const paymentAmount = Number.parseFloat(payment.amount);
      if (Number.isNaN(paymentAmount) || paymentAmount < LARGE_TRANSFER_AMOUNT) continue;
      if (participants.has(payment.from) || participants.has(payment.to)) {
        participants.add(payment.from);
        participants.add(payment.to);
        clusterVolume += paymentAmount;
      }
    }

    if (participants.size < COORDINATED_TRANSFER_MIN_PARTICIPANTS) return [];

    return [
      {
        detectorName: this.name,
        entityType: 'TRANSACTION',
        entityId: event.txHash,
        dedupeKey: this.dedupeKey(
          [...participants].sort().join('|'),
          Math.floor(Date.now() / COORDINATED_TRANSFER_WINDOW_MS),
        ),
        severity: clusterVolume >= LARGE_TRANSFER_AMOUNT * 10 ? Severity.CRITICAL : Severity.HIGH,
        confidence: Math.min(
          0.85,
          0.4 + participants.size / (COORDINATED_TRANSFER_MIN_PARTICIPANTS * 4),
        ),
        reasons: [
          {
            code: 'LARGE_TRANSFER_CLUSTER',
            message: `${participants.size} accounts exchanged ${clusterVolume.toLocaleString()} XLM+ in large transfers within ${COORDINATED_TRANSFER_WINDOW_MS / 60_000} minutes`,
            weight: 0.6,
          },
        ],
        evidence: {
          txHash: event.txHash,
          ledger: event.ledger,
          participants: [...participants],
          clusterVolume,
        },
      },
    ];
  }
}
