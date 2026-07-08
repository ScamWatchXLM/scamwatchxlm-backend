import type { FastifyReply, FastifyRequest } from 'fastify';

import { env } from '../config/env.js';
import { prisma } from '../db/prisma.js';
import { hashApiKey } from '../utils/hash.js';

/**
 * Resolves an API key from the configured header into `request.identity`.
 * Returns true if an identity was attached, false if no key was present.
 * Does not reject the request — callers combine this with `requireAuth`.
 */
export async function tryAuthenticateApiKey(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<boolean> {
  const headerValue = request.headers[env.API_KEY_HEADER.toLowerCase()];
  const key = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  if (!key) return false;

  const keyHash = hashApiKey(key);
  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: { user: true },
  });

  if (!apiKey || !apiKey.isActive || !apiKey.user.isActive) return false;
  if (apiKey.expiresAt && apiKey.expiresAt.getTime() < Date.now()) return false;

  request.identity = {
    type: 'apiKey',
    userId: apiKey.userId,
    role: apiKey.user.role,
    scopes: apiKey.scopes,
  };

  // Fire-and-forget last-used tracking; not on the request's critical path.
  void prisma.apiKey
    .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
    .catch(() => undefined);

  return true;
}
