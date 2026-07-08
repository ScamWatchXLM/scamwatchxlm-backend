import type { FastifyInstance } from 'fastify';

import { validateQuery } from '../../middleware/validation.js';
import { AssetService } from '../../services/asset.service.js';
import { listAssetsQuerySchema, type ListAssetsQuery } from '../schemas/asset.schema.js';

export default async function assetsRoutes(app: FastifyInstance) {
  const assetService = new AssetService(app.prisma);

  app.get(
    '/assets',
    {
      schema: { tags: ['assets'], summary: 'List assets' },
      preHandler: validateQuery(listAssetsQuerySchema),
    },
    async (request, reply) => {
      const query = request.query as ListAssetsQuery;
      const result = await assetService.list(query);
      return reply.send(result);
    },
  );

  app.get(
    '/assets/:code/:issuer',
    {
      schema: { tags: ['assets'], summary: 'Get asset detail, including risk history and alerts' },
    },
    async (request, reply) => {
      const { code, issuer } = request.params as { code: string; issuer: string };
      const asset = await assetService.getByCodeAndIssuer(code, issuer);
      return reply.send(asset);
    },
  );
}
