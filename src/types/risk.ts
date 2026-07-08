import type { EntityType, Severity } from '@prisma/client';

export interface RiskReason {
  code: string;
  message: string;
  weight: number;
}

export interface DetectionResult {
  detectorName: string;
  entityType: EntityType;
  entityId: string;
  /** Stable natural key used to deduplicate repeated detections of the same fact. */
  dedupeKey: string;
  severity: Severity;
  /** 0..1 confidence that this detection is a true positive. */
  confidence: number;
  reasons: RiskReason[];
  evidence?: Record<string, unknown>;
}

export interface RiskScoreInput {
  entityType: EntityType;
  entityId: string;
  accountId?: string;
  assetId?: string;
  detections: DetectionResult[];
  previousScore?: number | null;
}

export interface RiskScoreResult {
  entityType: EntityType;
  entityId: string;
  score: number;
  severity: Severity;
  confidence: number;
  reasons: RiskReason[];
  detector: string;
  historicalScore: number | null;
  timestamp: string;
}
