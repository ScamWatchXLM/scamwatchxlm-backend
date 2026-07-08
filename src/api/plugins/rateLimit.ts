import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

import { env } from '../../config/env.js';

export default fp(async function rateLimitPlugin(app: FastifyInstance) {
  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
    redis: app.redis,
    keyGenerator: (request) => request.identity?.userId ?? request.ip,
    errorResponseBuilder: () => ({
      error: { code: 'RATE_LIMITED', message: 'Too many requests, please slow down' },
    }),
  });
});
