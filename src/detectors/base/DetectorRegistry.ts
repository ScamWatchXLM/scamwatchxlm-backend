import type { PrismaClient } from '@prisma/client';

import { childLogger } from '../../config/logger.js';
import type { NormalizedHorizonEvent } from '../../types/horizon.js';
import type { DetectionResult } from '../../types/risk.js';

import type { Detector } from './Detector.js';

const log = childLogger('detector-registry');

export class DetectorRegistry {
  private readonly detectors: Detector[] = [];
  private readonly byEventType = new Map<string, Detector[]>();

  register(detector: Detector): this {
    this.detectors.push(detector);
    for (const eventType of detector.appliesTo) {
      const list = this.byEventType.get(eventType) ?? [];
      list.push(detector);
      this.byEventType.set(eventType, list);
    }
    return this;
  }

  registerAll(detectors: Detector[]): this {
    for (const d of detectors) this.register(d);
    return this;
  }

  list(): readonly Detector[] {
    return this.detectors;
  }

  async run(event: NormalizedHorizonEvent, prisma: PrismaClient): Promise<DetectionResult[]> {
    const applicable = this.byEventType.get(event.type) ?? [];
    if (applicable.length === 0) return [];

    const results = await Promise.allSettled(
      applicable.map((detector) => detector.detect(event, { prisma })),
    );

    const detections: DetectionResult[] = [];
    results.forEach((result, index) => {
      const detector = applicable[index];
      if (result.status === 'fulfilled') {
        detections.push(...result.value);
      } else {
        log.error({ err: result.reason, detector: detector?.name }, 'Detector threw an error');
      }
    });
    return detections;
  }
}
