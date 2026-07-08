import type { FastifyInstance } from 'fastify';

import { requireAuth } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validation.js';
import { ApiKeyService } from '../../services/apiKey.service.js';
import { AuthService } from '../../services/auth.service.js';
import { UnauthorizedError } from '../../utils/errors.js';
import {
  createApiKeySchema,
  loginSchema,
  registerSchema,
  type CreateApiKeyInput,
  type LoginInput,
  type RegisterInput,
} from '../schemas/auth.schema.js';

export default async function authRoutes(app: FastifyInstance) {
  const authService = new AuthService(app.prisma);
  const apiKeyService = new ApiKeyService(app.prisma);

  app.post(
    '/auth/register',
    {
      schema: { tags: ['auth'], summary: 'Register a new user account' },
      preHandler: validateBody(registerSchema),
    },
    async (request, reply) => {
      const { email, password } = request.body as RegisterInput;
      const user = await authService.register(email, password);
      const token = await reply.jwtSign({ sub: user.id, email: user.email, role: user.role });
      return reply
        .status(201)
        .send({ user: { id: user.id, email: user.email, role: user.role }, token });
    },
  );

  app.post(
    '/auth/login',
    {
      schema: { tags: ['auth'], summary: 'Exchange credentials for a JWT' },
      preHandler: validateBody(loginSchema),
    },
    async (request, reply) => {
      const { email, password } = request.body as LoginInput;
      const user = await authService.login(email, password);
      const token = await reply.jwtSign({ sub: user.id, email: user.email, role: user.role });
      return reply.send({ user: { id: user.id, email: user.email, role: user.role }, token });
    },
  );

  app.post(
    '/auth/api-keys',
    {
      schema: { tags: ['auth'], summary: 'Create an API key for the authenticated user' },
      preHandler: [requireAuth, validateBody(createApiKeySchema)],
    },
    async (request, reply) => {
      if (!request.identity) throw new UnauthorizedError();
      const { name, scopes, expiresAt } = request.body as CreateApiKeyInput;
      const created = await apiKeyService.create(request.identity.userId, name, scopes, expiresAt);
      return reply.status(201).send(created);
    },
  );

  app.get(
    '/auth/api-keys',
    {
      schema: { tags: ['auth'], summary: 'List API keys for the authenticated user' },
      preHandler: requireAuth,
    },
    async (request, reply) => {
      if (!request.identity) throw new UnauthorizedError();
      const keys = await apiKeyService.listForUser(request.identity.userId);
      return reply.send({ data: keys });
    },
  );

  app.delete(
    '/auth/api-keys/:id',
    { schema: { tags: ['auth'], summary: 'Revoke an API key' }, preHandler: requireAuth },
    async (request, reply) => {
      if (!request.identity) throw new UnauthorizedError();
      const { id } = request.params as { id: string };
      await apiKeyService.revoke(request.identity.userId, id);
      return reply.status(204).send();
    },
  );
}
