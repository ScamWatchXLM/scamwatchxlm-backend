import { describe, expect, it, vi } from 'vitest';

import { CoordinatedTransfersDetector } from '../../../src/detectors/coordinatedTransfers.detector.js';
import type { NormalizedHorizonEvent } from '../../../src/types/horizon.js';

function makeEvent(overrides: Partial<NormalizedHorizonEvent> = {}): NormalizedHorizonEvent {
  return {
    type: 'PAYMENT',
    ledger: 1,
    txHash: 'tx-current',
    opIndex: 0,
    sourceAccount: 'GA',
    createdAt: new Date().toISOString(),
    raw: { from: 'GA', to: 'GB', assetCode: 'XLM', assetIssuer: null, amount: '50000' },
    ...overrides,
  };
}

/**
 * The triggering payment is already persisted to `horizonEvent` by the time detectors run
 * (StreamProcessorService.persistEvent runs before registry.run), so a naive `findMany` over
 * the same window/type would return the current row too.
 */
function makeFakePrisma(otherRows: { from: string; to: string; amount: string }[]) {
  const findMany = vi.fn().mockResolvedValue(
    otherRows.map((r) => ({
      raw: { from: r.from, to: r.to, assetCode: 'XLM', assetIssuer: null, amount: r.amount },
    })),
  );
  return {
    horizonEvent: { findMany },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe('CoordinatedTransfersDetector', () => {
  const detector = new CoordinatedTransfersDetector();

  it('excludes the triggering event itself from the history query', async () => {
    const event = makeEvent();
    const prisma = makeFakePrisma([
      { from: 'GB', to: 'GC', amount: '50000' },
      { from: 'GC', to: 'GD', amount: '50000' },
      { from: 'GD', to: 'GE', amount: '50000' },
    ]);

    await detector.detect(event, { prisma });

    expect(prisma.horizonEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          NOT: { txHash: event.txHash, opIndex: event.opIndex },
        }),
      }),
    );
  });

  it('does not double-count the triggering transfer amount in clusterVolume', async () => {
    const event = makeEvent();
    // Three other large transfers link back to the cluster; the current transfer is not
    // among them here (the detector excludes it from the query, per the test above), so
    // seeding clusterVolume/participants with the current payment must count it exactly once.
    const prisma = makeFakePrisma([
      { from: 'GB', to: 'GC', amount: '50000' },
      { from: 'GC', to: 'GD', amount: '50000' },
      { from: 'GD', to: 'GE', amount: '50000' },
    ]);

    const [result] = await detector.detect(event, { prisma });

    expect(result?.evidence).toMatchObject({ clusterVolume: 200_000 });
  });
});
