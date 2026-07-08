import type { HorizonEventType, PrismaClient } from '@prisma/client';

import type { NormalizedHorizonEvent } from '../../types/horizon.js';
import type { DetectionResult } from '../../types/risk.js';

export interface DetectorContext {
  prisma: PrismaClient;
}

/**
 * A Detector inspects a single normalized Horizon event (optionally
 * consulting recent history via `ctx.prisma`) and returns zero or more
 * detections. Detectors must be side-effect free — persistence happens
 * centrally in the detection pipeline so results can be deduplicated and
 * scored consistently.
 */
export interface Detector {
  readonly name: string;
  readonly description: string;
  readonly appliesTo: readonly HorizonEventType[];
  detect(event: NormalizedHorizonEvent, ctx: DetectorContext): Promise<DetectionResult[]>;
}

export abstract class BaseDetector implements Detector {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly appliesTo: readonly HorizonEventType[];
  abstract detect(event: NormalizedHorizonEvent, ctx: DetectorContext): Promise<DetectionResult[]>;

  protected dedupeKey(...parts: (string | number)[]): string {
    return [this.name, ...parts].join(':');
  }
}
