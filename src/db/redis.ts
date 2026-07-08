import { Redis, type RedisOptions } from 'ioredis';

import { env } from '../config/env.js';
import { childLogger } from '../config/logger.js';

const log = childLogger('redis');

const sharedOptions: RedisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
};

function createConnection(name: string): Redis {
  const client = new Redis(env.REDIS_URL, { ...sharedOptions, connectionName: name });
  client.on('error', (err: Error) => log.error({ err, name }, 'Redis connection error'));
  client.on('connect', () => log.info({ name }, 'Redis connected'));
  return client;
}

/** General-purpose connection for caching and pub/sub reads. */
export const redis = createConnection('scamwatch-core');

/** BullMQ requires its own dedicated connection(s); do not share with pub/sub. */
export function createQueueConnection(name: string): Redis {
  return createConnection(`scamwatch-queue-${name}`);
}

export async function disconnectRedis(): Promise<void> {
  await redis.quit();
}
