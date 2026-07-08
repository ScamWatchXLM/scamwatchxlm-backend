import cors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

import { env } from '../../config/env.js';

export default fp(async function corsPlugin(app: FastifyInstance) {
  const origin = env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((o) => o.trim());

  await app.register(cors, {
    origin,
    credentials: true,
  });
});
