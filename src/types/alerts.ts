import type { AlertStatus, EntityType, Severity } from '@prisma/client';

export interface AlertPayload {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  status: AlertStatus;
  entityType: EntityType;
  entityId: string;
  createdAt: string;
}

export interface CreateAlertInput {
  title: string;
  description: string;
  severity: Severity;
  entityType: EntityType;
  entityId: string;
  accountId?: string;
  assetId?: string;
  detectionId?: string;
}
