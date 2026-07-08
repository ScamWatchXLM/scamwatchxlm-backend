import { describe, expect, it, vi } from 'vitest';

import { DustAttackDetector } from '../../../src/detectors/dustAttack.detector.js';
import type { NormalizedHorizonEvent } from '../../../src/types/horizon.js';

function makeEvent(overrides: Partial<NormalizedHorizonEvent> = {}): NormalizedHorizonEvent {
  return {
    type: 'PAYMENT',
    ledger: 1,
    txHash: 'tx-1',
    opIndex: 0,
    sourceAccount: 'GDUST',
    createdAt: new Date().toISOString(),
    raw: { from: 'GDUST', to: 'GVICTIM', assetCode: 'XLM', assetIssuer: null, amount: '0.00001' },
    ...overrides,
  };
}

function makeFakePrisma(recipients: string[]) {
  return {
    horizonEvent: {
      findMany: vi.fn().mockResolvedValue(
        recipients.map((to) => ({
          raw: { from: 'GDUST', to, assetCode: 'XLM', assetIssuer: null, amount: '0.00001' },
        })),
      ),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe('DustAttackDetector', () => {
  const detector = new DustAttackDetector();

  it('does not flag payments above the dust threshold', async () => {
    const event = makeEvent({
      raw: { from: 'GDUST', to: 'GVICTIM', assetCode: 'XLM', assetIssuer: null, amount: '5' },
    });
    const results = await detector.detect(event, { prisma: makeFakePrisma([]) });
    expect(results).toHaveLength(0);
  });

  it('does not flag dust payments below the distinct-recipient threshold', async () => {
    const event = makeEvent();
    const results = await detector.detect(event, {
      prisma: makeFakePrisma(['GVICTIM2', 'GVICTIM3']),
    });
    expect(results).toHaveLength(0);
  });

  it('flags an account dusting many distinct recipients', async () => {
    const recipients = Array.from({ length: 20 }, (_, i) => `GVICTIM${i}`);
    const event = makeEvent();
    const results = await detector.detect(event, { prisma: makeFakePrisma(recipients) });

    expect(results).toHaveLength(1);
    expect(results[0]?.entityId).toBe('GDUST');
    expect(results[0]?.detectorName).toBe('dust-attack');
  });
});
