import type { Alert } from '@prisma/client';

import { env } from '../../config/env.js';
import type { NotificationChannelHandler } from '../types.js';

const SEVERITY_EMOJI: Record<string, string> = {
  LOW: ':large_blue_circle:',
  MEDIUM: ':large_yellow_circle:',
  HIGH: ':large_orange_circle:',
  CRITICAL: ':red_circle:',
};

export class SlackChannel implements NotificationChannelHandler {
  readonly channel = 'SLACK' as const;

  get isConfigured(): boolean {
    return Boolean(env.SLACK_WEBHOOK_URL);
  }

  async send(alert: Alert): Promise<void> {
    if (!this.isConfigured) throw new Error('SLACK_WEBHOOK_URL is not configured');

    const response = await fetch(env.SLACK_WEBHOOK_URL as string, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        text: `${SEVERITY_EMOJI[alert.severity] ?? ''} *${alert.title}*\n${alert.description}\n_Entity:_ ${alert.entityType} \`${alert.entityId}\``,
      }),
    });

    if (!response.ok) {
      throw new Error(`Slack webhook responded with ${response.status}: ${await response.text()}`);
    }
  }
}
