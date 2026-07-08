import type { RiskReason, RiskScoreInput, RiskScoreResult } from '../types/risk.js';

import { applyDecay, combinePoints, scoreToSeverity, severityToPoints } from './riskFactors.js';

export class RiskScorer {
  score(input: RiskScoreInput): RiskScoreResult {
    const points = input.detections.map((d) => severityToPoints(d.severity, d.confidence));
    const rawScore = combinePoints(points);
    const finalScore = applyDecay(rawScore, input.previousScore ?? null);

    const reasons: RiskReason[] = input.detections.flatMap((d) => d.reasons);
    const confidence = input.detections.length
      ? Math.max(...input.detections.map((d) => d.confidence))
      : 0;
    const primaryDetector =
      input.detections
        .slice()
        .sort(
          (a, b) =>
            severityToPoints(b.severity, b.confidence) - severityToPoints(a.severity, a.confidence),
        )[0]?.detectorName ?? 'aggregate';

    return {
      entityType: input.entityType,
      entityId: input.entityId,
      score: finalScore,
      severity: scoreToSeverity(finalScore),
      confidence,
      reasons,
      detector: primaryDetector,
      historicalScore: input.previousScore ?? null,
      timestamp: new Date().toISOString(),
    };
  }
}

export const riskScorer = new RiskScorer();
