import { Redis } from 'ioredis';
import type { Redis as RedisClient } from 'ioredis';

import { env } from '../config/env.js';
import { childLogger } from '../config/logger.js';

const log = childLogger('ws-pubsub');

export const WS_EVENTS_CHANNEL = 'scamwatch:ws-events';

export interface WsBridgeEvent {
  topic: string;
  payload: unknown;
}

/** Publishes a WS event to Redis so any API process (not just the one that produced it) can fan it out to its clients. */
export async function publishWsEvent(redis: RedisClient, event: WsBridgeEvent): Promise<void> {
  await redis.publish(WS_EVENTS_CHANNEL, JSON.stringify(event));
}

/** Opens a dedicated subscriber connection (ioredis subscribers can't issue other commands) and invokes `onEvent` per message. */
export function subscribeWsEvents(onEvent: (event: WsBridgeEvent) => void): () => Promise<void> {
  const subscriber = new Redis(env.REDIS_URL, { connectionName: 'scamwatch-ws-subscriber' });

  subscriber
    .subscribe(WS_EVENTS_CHANNEL)
    .catch((err) => log.error({ err }, 'Failed to subscribe to WS events channel'));

  subscriber.on('message', (_channel: string, message: string) => {
    try {
      onEvent(JSON.parse(message) as WsBridgeEvent);
    } catch (err) {
      log.error({ err }, 'Failed to parse WS bridge event');
    }
  });

  return () => subscriber.quit().then(() => undefined);
}
