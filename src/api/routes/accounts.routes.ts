import type { FastifyInstance } from 'fastify';

import { validateQuery } from '../../middleware/validation.js';
import { AccountService } from '../../services/account.service.js';
import { listAccountsQuerySchema, type ListAccountsQuery } from '../schemas/account.schema.js';

export default async function accountsRoutes(app: FastifyInstance) {
  const accountService = new AccountService(app.prisma);

  app.get(
    '/accounts',
    {
      schema: { tags: ['accounts'], summary: 'List accounts' },
      preHandler: validateQuery(listAccountsQuerySchema),
    },
    async (request, reply) => {
      const query = request.query as ListAccountsQuery;
      const result = await accountService.list(query);
      return reply.send(result);
    },
  );

  app.get(
    '/accounts/:publicKey',
    {
      schema: {
        tags: ['accounts'],
        summary: 'Get account detail, including risk history and alerts',
      },
    },
    async (request, reply) => {
      const { publicKey } = request.params as { publicKey: string };
      const account = await accountService.getByPublicKey(publicKey);
      return reply.send(account);
    },
  );

  app.get(
    '/accounts/:publicKey/risk-history',
    { schema: { tags: ['accounts'], summary: 'Get an account risk score history' } },
    async (request, reply) => {
      const { publicKey } = request.params as { publicKey: string };
      const history = await accountService.getRiskHistory(publicKey);
      return reply.send({ data: history });
    },
  );
}
