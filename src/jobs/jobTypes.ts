export interface HorizonEventJobData {
  eventId: string;
}

export interface DetectionJobData {
  detectionId: string;
}

export interface RiskRecalculationJobData {
  entityType?: 'ACCOUNT' | 'ASSET';
  entityId?: string;
}

export interface AlertCleanupJobData {
  retentionDays: number;
}

export interface StatisticsGenerationJobData {
  period: 'hourly' | 'daily';
}

export interface NotificationDispatchJobData {
  alertId: string;
}
