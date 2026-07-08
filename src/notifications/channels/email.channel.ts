import type { Alert } from '@prisma/client';
import nodemailer, { type Transporter } from 'nodemailer';

import { env } from '../../config/env.js';
import type { NotificationChannelHandler } from '../types.js';

/**
 * Thin interface over SMTP delivery. In environments without SMTP
 * credentials configured, `isConfigured` is false and callers should skip
 * this channel rather than attempt delivery.
 */
export class EmailChannel implements NotificationChannelHandler {
  readonly channel = 'EMAIL' as const;
  private transporter: Transporter | null = null;

  get isConfigured(): boolean {
    return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD);
  }

  private getTransporter(): Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
      });
    }
    return this.transporter;
  }

  async send(alert: Alert, target?: string | null): Promise<void> {
    if (!this.isConfigured) throw new Error('SMTP is not configured');
    if (!target) throw new Error('Email channel requires a recipient address');

    await this.getTransporter().sendMail({
      from: env.SMTP_FROM,
      to: target,
      subject: `[ScamWatchXLM] ${alert.severity} — ${alert.title}`,
      text: `${alert.description}\n\nEntity: ${alert.entityType} ${alert.entityId}\nSeverity: ${alert.severity}\nCreated: ${alert.createdAt.toISOString()}`,
    });
  }
}
