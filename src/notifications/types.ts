import type { Alert } from '@prisma/client';

export interface NotificationChannelHandler {
  readonly channel: 'DISCORD' | 'SLACK' | 'EMAIL' | 'WEBHOOK';
  readonly isConfigured: boolean;
  send(alert: Alert, target?: string | null): Promise<void>;
}
