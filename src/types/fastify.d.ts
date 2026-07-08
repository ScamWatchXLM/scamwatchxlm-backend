import '@fastify/jwt';
import type { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';

import type { AuthenticatedIdentity, JwtPayload } from './auth.js';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    redis: Redis;
  }

  interface FastifyRequest {
    identity?: AuthenticatedIdentity;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}
