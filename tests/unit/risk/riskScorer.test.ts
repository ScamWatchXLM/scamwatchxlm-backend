import { describe, expect, it } from 'vitest';

import {
  applyDecay,
  combinePoints,
  scoreToSeverity,
  severityToPoints,
} from '../../../src/risk/riskFactors.js';
import { RiskScorer } from '../../../src/risk/RiskScorer.js';
import type { DetectionResult } from '../../../src/types/risk.js';

describe('riskFactors', () => {
  it('severityToPoints scales with confidence', () => {
    const low = severityToPoints('CRITICAL', 0.5);
    const high = severityToPoints('CRITICAL', 1);
    expect(high).toBeGreaterThan(low);
  });

  it('combinePoints saturates towards 100 without exceeding it', () => {
    const combined = combinePoints([90, 90, 90]);
    expect(combined).toBeLessThanOrEqual(100);
    expect(combined).toBeGreaterThan(90);
  });

  it('combinePoints returns 0 for no input', () => {
    expect(combinePoints([])).toBe(0);
  });

  it('scoreToSeverity maps thresholds correctly', () => {
    expect(scoreToSeverity(10)).toBe('LOW');
    expect(scoreToSeverity(60)).toBe('MEDIUM');
    expect(scoreToSeverity(80)).toBe('HIGH');
    expect(scoreToSeverity(95)).toBe('CRITICAL');
  });

  it('applyDecay keeps escalations immediate but smooths de-escalation', () => {
    expect(applyDecay(80, 50)).toBe(80);
    const decayed = applyDecay(20, 80);
    expect(decayed).toBeLessThan(80);
    expect(decayed).toBeGreaterThan(20);
  });
});

describe('RiskScorer', () => {
  const scorer = new RiskScorer();

  it('produces a CRITICAL score for a high-confidence critical detection', () => {
    const detection: DetectionResult = {
      detectorName: 'fake-asset-issuer',
      entityType: 'ASSET',
      entityId: 'SCAM:GABC',
      dedupeKey: 'fake-asset-issuer:SCAM:GABC',
      severity: 'CRITICAL',
      confidence: 0.95,
      reasons: [{ code: 'NEW_ISSUER_ACCOUNT', message: 'test', weight: 0.7 }],
    };

    const result = scorer.score({
      entityType: 'ASSET',
      entityId: 'SCAM:GABC',
      detections: [detection],
    });

    expect(result.severity).toBe('CRITICAL');
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.reasons).toHaveLength(1);
  });

  it('returns a zero score with no detections', () => {
    const result = scorer.score({ entityType: 'ACCOUNT', entityId: 'GABC', detections: [] });
    expect(result.score).toBe(0);
    expect(result.severity).toBe('LOW');
  });
});
