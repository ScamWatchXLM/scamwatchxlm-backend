import jwt from '@fastify/jwt';
import Fastify from 'fastify';

import corsPlugin from './api/plugins/cors.js';
import helmetPlugin from './api/plugins/helmet.js';
import rateLimitPlugin from './api/plugins/rateLimit.js';
import swaggerPlugin from './api/plugins/swagger.js';
import websocketPlugin from './api/plugins/websocket.js';
import { registerRoutes } from './api/routes/index.js';
import { env } from './config/env.js';
import { loggerOptions } from './config/logger.js';
import { prisma } from './db/prisma.js';
import { redis } from './db/redis.js';
import { registerErrorHandler } from './middleware/errorHandler.js';
import { genRequestId } from './middleware/requestId.js';

export async function buildApp() {
  const app = Fastify({
    logger: loggerOptions,
    genReqId: genRequestId,
    trustProxy: true,
  });

  app.decorate('prisma', prisma);
  app.decorate('redis', redis);

  registerErrorHandler(app);

  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN },
  });

  await app.register(helmetPlugin);
  await app.register(corsPlugin);
  await app.register(rateLimitPlugin);
  await app.register(swaggerPlugin);
  await app.register(websocketPlugin);

  await registerRoutes(app);

  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });

  return app;
}

export type App = Awaited<ReturnType<typeof buildApp>>;
