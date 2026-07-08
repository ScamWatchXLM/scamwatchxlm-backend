import type { Alert } from '@prisma/client';

import { env } from '../../config/env.js';
import type { NotificationChannelHandler } from '../types.js';

const SEVERITY_COLORS: Record<string, number> = {
  LOW: 0x8ea1b2,
  MEDIUM: 0xf5a623,
  HIGH: 0xe8590c,
  CRITICAL: 0xd6336c,
};

export class DiscordChannel implements NotificationChannelHandler {
  readonly channel = 'DISCORD' as const;

  get isConfigured(): boolean {
    return Boolean(env.DISCORD_WEBHOOK_URL);
  }

  async send(alert: Alert): Promise<void> {
    if (!this.isConfigured) throw new Error('DISCORD_WEBHOOK_URL is not configured');

    const response = await fetch(env.DISCORD_WEBHOOK_URL as string, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        embeds: [
          {
            title: alert.title,
            description: alert.description,
            color: SEVERITY_COLORS[alert.severity] ?? 0x8ea1b2,
            fields: [
              { name: 'Severity', value: alert.severity, inline: true },
              { name: 'Entity type', value: alert.entityType, inline: true },
              { name: 'Entity', value: alert.entityId, inline: false },
            ],
            timestamp: alert.createdAt.toISOString(),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Discord webhook responded with ${response.status}: ${await response.text()}`,
      );
    }
  }
}
