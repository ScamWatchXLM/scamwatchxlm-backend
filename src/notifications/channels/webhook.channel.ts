import type { Alert } from '@prisma/client';

import { env } from '../../config/env.js';
import type { NotificationChannelHandler } from '../types.js';

function parseWebhookUrls(): string[] {
  return env.GENERIC_WEBHOOK_URLS.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Delivers a generic JSON payload to any number of configured third-party webhook URLs. */
export class WebhookChannel implements NotificationChannelHandler {
  readonly channel = 'WEBHOOK' as const;

  get isConfigured(): boolean {
    return parseWebhookUrls().length > 0;
  }

  async send(alert: Alert, target?: string | null): Promise<void> {
    const urls = target ? [target] : parseWebhookUrls();
    if (urls.length === 0) throw new Error('No webhook URLs configured');

    const results = await Promise.allSettled(
      urls.map((url) =>
        fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ event: 'alert.created', alert }),
        }).then((res) => {
          if (!res.ok) throw new Error(`Webhook ${url} responded with ${res.status}`);
        }),
      ),
    );

    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length === results.length) {
      throw new Error(`All ${failures.length} webhook deliveries failed`);
    }
  }
}
