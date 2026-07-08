import { UserRole } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

import { AlertService } from '../../alerts/alert.service.js';
import { AlertEngine } from '../../alerts/AlertEngine.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validateQuery } from '../../middleware/validation.js';
import { listAlertsQuerySchema, type ListAlertsQuery } from '../schemas/alert.schema.js';

export default async function alertsRoutes(app: FastifyInstance) {
  const alertService = new AlertService(app.prisma);
  const alertEngine = new AlertEngine(app.prisma);

  app.get(
    '/alerts',
    {
      schema: { tags: ['alerts'], summary: 'List alerts' },
      preHandler: validateQuery(listAlertsQuerySchema),
    },
    async (request, reply) => {
      const query = request.query as ListAlertsQuery;
      const result = await alertService.list(query);
      return reply.send(result);
    },
  );

  app.get(
    '/alerts/:id',
    { schema: { tags: ['alerts'], summary: 'Get alert detail' } },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const alert = await alertService.getById(id);
      return reply.send(alert);
    },
  );

  app.post(
    '/alerts/:id/acknowledge',
    {
      schema: { tags: ['alerts'], summary: 'Acknowledge an alert' },
      preHandler: [requireAuth, requireRole(UserRole.MODERATOR, UserRole.ADMIN)],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const alert = await alertEngine.acknowledge(id);
      return reply.send(alert);
    },
  );

  app.post(
    '/alerts/:id/resolve',
    {
      schema: { tags: ['alerts'], summary: 'Resolve an alert' },
      preHandler: [requireAuth, requireRole(UserRole.MODERATOR, UserRole.ADMIN)],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const alert = await alertEngine.resolve(id);
      return reply.send(alert);
    },
  );

  app.post(
    '/alerts/:id/dismiss',
    {
      schema: { tags: ['alerts'], summary: 'Dismiss an alert' },
      preHandler: [requireAuth, requireRole(UserRole.MODERATOR, UserRole.ADMIN)],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const alert = await alertEngine.dismiss(id);
      return reply.send(alert);
    },
  );
}
