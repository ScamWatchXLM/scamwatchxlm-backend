import type { Alert, NotificationChannel, PrismaClient } from '@prisma/client';

import { isAtLeast, parseSeverity } from '../alerts/severity.js';
import { env } from '../config/env.js';
import { childLogger } from '../config/logger.js';

import { DiscordChannel } from './channels/discord.channel.js';
import { EmailChannel } from './channels/email.channel.js';
import { SlackChannel } from './channels/slack.channel.js';
import { WebhookChannel } from './channels/webhook.channel.js';
import type { NotificationChannelHandler } from './types.js';

const log = childLogger('notification-dispatcher');

export class NotificationDispatcher {
  private readonly handlers: NotificationChannelHandler[];

  constructor(
    private readonly prisma: PrismaClient,
    handlers: NotificationChannelHandler[] = [
      new DiscordChannel(),
      new SlackChannel(),
      new EmailChannel(),
      new WebhookChannel(),
    ],
  ) {
    this.handlers = handlers;
  }

  /** Dispatches an alert to every configured channel that meets the minimum severity threshold. */
  async dispatch(alert: Alert): Promise<void> {
    const minSeverity = parseSeverity(env.NOTIFICATIONS_MIN_SEVERITY) ?? 'HIGH';
    if (!isAtLeast(alert.severity, minSeverity)) {
      log.debug(
        { alertId: alert.id, severity: alert.severity },
        'Below notification severity threshold, skipping',
      );
      return;
    }

    const configured = this.handlers.filter((h) => h.isConfigured);
    if (configured.length === 0) {
      log.warn('No notification channels configured; alert will not be delivered externally');
      return;
    }

    await Promise.all(configured.map((handler) => this.dispatchToChannel(alert, handler)));
  }

  async dispatchToChannel(
    alert: Alert,
    handler: NotificationChannelHandler,
    target?: string | null,
  ): Promise<void> {
    const notification = await this.prisma.notification.create({
      data: {
        alertId: alert.id,
        channel: handler.channel as NotificationChannel,
        target: target ?? null,
      },
    });

    try {
      await handler.send(alert, target);
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { status: 'SENT', sentAt: new Date(), attempts: { increment: 1 } },
      });
    } catch (err) {
      log.error(
        { err, alertId: alert.id, channel: handler.channel },
        'Notification delivery failed',
      );
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: 'FAILED',
          attempts: { increment: 1 },
          lastError: err instanceof Error ? err.message : String(err),
        },
      });
      throw err;
    }
  }

  async retryFailed(limit = 25): Promise<void> {
    const failed = await this.prisma.notification.findMany({
      where: { status: 'FAILED', attempts: { lt: 5 } },
      include: { alert: true },
      take: limit,
    });

    for (const notification of failed) {
      const handler = this.handlers.find((h) => h.channel === notification.channel);
      if (!handler?.isConfigured) continue;
      try {
        await handler.send(notification.alert, notification.target);
        await this.prisma.notification.update({
          where: { id: notification.id },
          data: { status: 'SENT', sentAt: new Date(), attempts: { increment: 1 } },
        });
      } catch (err) {
        await this.prisma.notification.update({
          where: { id: notification.id },
          data: {
            attempts: { increment: 1 },
            lastError: err instanceof Error ? err.message : String(err),
          },
        });
      }
    }
  }
}
