import { UserRole } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

import {
  alertCleanupQueue,
  riskRecalculationQueue,
  statisticsGenerationQueue,
} from '../../jobs/queues.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

export default async function adminRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);
  app.addHook('preHandler', requireRole(UserRole.ADMIN));

  app.post(
    '/admin/accounts/:publicKey/flag',
    { schema: { tags: ['admin'], summary: 'Manually flag an account' } },
    async (request, reply) => {
      const { publicKey } = request.params as { publicKey: string };
      const account = await app.prisma.account.update({
        where: { publicKey },
        data: { isFlagged: true },
      });
      return reply.send(account);
    },
  );

  app.post(
    '/admin/accounts/:publicKey/unflag',
    { schema: { tags: ['admin'], summary: 'Manually unflag an account' } },
    async (request, reply) => {
      const { publicKey } = request.params as { publicKey: string };
      const account = await app.prisma.account.update({
        where: { publicKey },
        data: { isFlagged: false },
      });
      return reply.send(account);
    },
  );

  app.post(
    '/admin/jobs/risk-recalculation',
    { schema: { tags: ['admin'], summary: 'Manually trigger a risk recalculation pass' } },
    async (_request, reply) => {
      const job = await riskRecalculationQueue.add('manual-trigger', {});
      return reply.status(202).send({ jobId: job.id });
    },
  );

  app.post(
    '/admin/jobs/alert-cleanup',
    { schema: { tags: ['admin'], summary: 'Manually trigger alert cleanup' } },
    async (_request, reply) => {
      const job = await alertCleanupQueue.add('manual-trigger', { retentionDays: 90 });
      return reply.status(202).send({ jobId: job.id });
    },
  );

  app.post(
    '/admin/jobs/statistics-generation',
    { schema: { tags: ['admin'], summary: 'Manually trigger a statistics snapshot' } },
    async (_request, reply) => {
      const job = await statisticsGenerationQueue.add('manual-trigger', { period: 'hourly' });
      return reply.status(202).send({ jobId: job.id });
    },
  );
}
