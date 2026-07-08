import type { FastifyInstance } from 'fastify';

import { validateQuery } from '../../middleware/validation.js';
import { SearchService } from '../../services/search.service.js';
import { searchQuerySchema, type SearchQuery } from '../schemas/search.schema.js';

export default async function searchRoutes(app: FastifyInstance) {
  const searchService = new SearchService(app.prisma);

  app.get(
    '/search',
    {
      schema: {
        tags: ['search'],
        summary: 'Search accounts, assets, issuers, transactions, and reports',
      },
      preHandler: validateQuery(searchQuerySchema),
    },
    async (request, reply) => {
      const { q } = request.query as SearchQuery;
      const results = await searchService.search(q);
      return reply.send(results);
    },
  );
}
