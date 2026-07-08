import { Severity, type Alert, type PrismaClient } from '@prisma/client';

import { childLogger } from '../config/logger.js';
import type { RiskScoreResult } from '../types/risk.js';

import { isAtLeast } from './severity.js';

const log = childLogger('alert-engine');

/** Minimum severity that will generate an Alert from a risk score. Detections below this are recorded but stay silent. */
const ALERT_SEVERITY_THRESHOLD = Severity.MEDIUM;

export interface AlertCreatedHook {
  (alert: Alert): Promise<void> | void;
}

export class AlertEngine {
  private readonly hooks: AlertCreatedHook[] = [];

  constructor(private readonly prisma: PrismaClient) {}

  onAlertCreated(hook: AlertCreatedHook): void {
    this.hooks.push(hook);
  }

  /**
   * Evaluates a risk score and, if it clears the alerting threshold and no
   * open alert already exists for the entity, creates one and fires hooks
   * (notification dispatch, WebSocket broadcast).
   */
  async evaluate(
    riskResult: RiskScoreResult,
    detectionId: string | undefined,
    links: { accountId?: string; assetId?: string } = {},
  ): Promise<Alert | null> {
    if (!isAtLeast(riskResult.severity, ALERT_SEVERITY_THRESHOLD)) return null;

    const existingOpen = await this.prisma.alert.findFirst({
      where: { entityType: riskResult.entityType, entityId: riskResult.entityId, status: 'OPEN' },
    });
    if (existingOpen) {
      log.debug(
        { entityId: riskResult.entityId },
        'Open alert already exists for entity, skipping',
      );
      return null;
    }

    const alert = await this.prisma.alert.create({
      data: {
        title: this.buildTitle(riskResult),
        description: riskResult.reasons.map((r) => r.message).join(' '),
        severity: riskResult.severity,
        entityType: riskResult.entityType,
        entityId: riskResult.entityId,
        accountId: links.accountId,
        assetId: links.assetId,
        detectionId,
      },
    });

    log.info(
      { alertId: alert.id, severity: alert.severity, entityId: alert.entityId },
      'Alert created',
    );

    for (const hook of this.hooks) {
      try {
        await hook(alert);
      } catch (err) {
        log.error({ err, alertId: alert.id }, 'Alert-created hook failed');
      }
    }

    return alert;
  }

  async acknowledge(alertId: string): Promise<Alert> {
    return this.prisma.alert.update({
      where: { id: alertId },
      data: { status: 'ACKNOWLEDGED', acknowledgedAt: new Date() },
    });
  }

  async resolve(alertId: string): Promise<Alert> {
    return this.prisma.alert.update({
      where: { id: alertId },
      data: { status: 'RESOLVED', resolvedAt: new Date() },
    });
  }

  async dismiss(alertId: string): Promise<Alert> {
    return this.prisma.alert.update({
      where: { id: alertId },
      data: { status: 'DISMISSED' },
    });
  }

  private buildTitle(riskResult: RiskScoreResult): string {
    const label = riskResult.entityType.charAt(0) + riskResult.entityType.slice(1).toLowerCase();
    return `${riskResult.severity} risk detected on ${label} ${riskResult.entityId}`;
  }
}
