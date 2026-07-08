import { Severity } from '@prisma/client';

import { RISK_SCORE_THRESHOLDS, SEVERITY_WEIGHTS } from '../config/constants.js';

/** Converts a single detection's severity + confidence into a 0..100 point contribution. */
export function severityToPoints(severity: Severity, confidence: number): number {
  const base = (SEVERITY_WEIGHTS[severity] / SEVERITY_WEIGHTS.CRITICAL) * 100;
  return base * Math.max(0, Math.min(1, confidence));
}

/**
 * Combines multiple detection point contributions into a single 0..100 score
 * using a noisy-OR: combined = 1 - Π(1 - p_i). This is monotonic in every
 * input, saturates at 100, and rewards corroborating evidence from multiple
 * detectors without letting many weak signals trivially outscore one very
 * strong one.
 */
export function combinePoints(points: number[]): number {
  if (points.length === 0) return 0;
  const survivalProduct = points.reduce(
    (acc, p) => acc * (1 - Math.max(0, Math.min(100, p)) / 100),
    1,
  );
  return Math.round((1 - survivalProduct) * 100);
}

export function scoreToSeverity(score: number): Severity {
  if (score >= RISK_SCORE_THRESHOLDS.CRITICAL) return Severity.CRITICAL;
  if (score >= RISK_SCORE_THRESHOLDS.HIGH) return Severity.HIGH;
  if (score >= RISK_SCORE_THRESHOLDS.MEDIUM) return Severity.MEDIUM;
  return Severity.LOW;
}

/** Blends a freshly computed score with the previous score to smooth volatility. */
export function applyDecay(
  newScore: number,
  previousScore: number | null | undefined,
  decayFactor = 0.3,
): number {
  if (previousScore == null) return newScore;
  if (newScore >= previousScore) return newScore; // risk escalations apply immediately
  return Math.round(previousScore * decayFactor + newScore * (1 - decayFactor));
}
