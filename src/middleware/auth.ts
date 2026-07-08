import type { UserRole } from '@prisma/client';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { JwtPayload } from '../types/auth.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';

import { tryAuthenticateApiKey } from './apiKey.js';

/**
 * Accepts either a valid JWT (Authorization: Bearer) or an API key header.
 * Attaches `request.identity` on success; throws UnauthorizedError otherwise.
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const viaApiKey = await tryAuthenticateApiKey(request, reply);
  if (viaApiKey) return;

  try {
    const payload = await request.jwtVerify<JwtPayload>();
    request.identity = { type: 'user', userId: payload.sub, role: payload.role };
  } catch {
    throw new UnauthorizedError('Missing or invalid credentials');
  }
}

export function requireRole(...roles: UserRole[]) {
  return async function roleGuard(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    if (!request.identity) {
      throw new UnauthorizedError();
    }
    if (!roles.includes(request.identity.role)) {
      throw new ForbiddenError(`Requires role: ${roles.join(' or ')}`);
    }
  };
}

/** Best-effort identity resolution — never throws, useful for optional-auth routes. */
export async function attachIdentityIfPresent(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const viaApiKey = await tryAuthenticateApiKey(request, reply);
  if (viaApiKey) return;

  try {
    const payload = await request.jwtVerify<JwtPayload>();
    request.identity = { type: 'user', userId: payload.sub, role: payload.role };
  } catch {
    // no-op: identity remains undefined
  }
}
