import type { FastifyInstance } from 'fastify';

import { validateQuery } from '../../middleware/validation.js';
import { AnalyticsService } from '../../services/analytics.service.js';
import {
  detectionCountsQuerySchema,
  networkActivityQuerySchema,
  trendingScamsQuerySchema,
} from '../schemas/analytics.schema.js';

export default async function analyticsRoutes(app: FastifyInstance) {
  const analyticsService = new AnalyticsService(app.prisma);

  app.get(
    '/analytics/overview',
    { schema: { tags: ['analytics'], summary: 'High-level platform statistics' } },
    async (_request, reply) => {
      return reply.send(await analyticsService.getOverview());
    },
  );

  app.get(
    '/analytics/detections',
    {
      schema: { tags: ['analytics'], summary: 'Detection counts by detector' },
      preHandler: validateQuery(detectionCountsQuerySchema),
    },
    async (request, reply) => {
      const { sinceDays } = request.query as { sinceDays: number };
      return reply.send({ data: await analyticsService.getDetectionCounts(sinceDays) });
    },
  );

  app.get(
    '/analytics/trending',
    {
      schema: { tags: ['analytics'], summary: 'Trending scams by detection volume' },
      preHandler: validateQuery(trendingScamsQuerySchema),
    },
    async (request, reply) => {
      const { sinceDays, limit } = request.query as { sinceDays: number; limit: number };
      return reply.send({ data: await analyticsService.getTrendingScams(sinceDays, limit) });
    },
  );

  app.get(
    '/analytics/top-malicious-assets',
    { schema: { tags: ['analytics'], summary: 'Assets with the highest risk activity' } },
    async (_request, reply) => {
      return reply.send({ data: await analyticsService.getTopMaliciousAssets() });
    },
  );

  app.get(
    '/analytics/top-malicious-issuers',
    { schema: { tags: ['analytics'], summary: 'Issuers with the highest risk activity' } },
    async (_request, reply) => {
      return reply.send({ data: await analyticsService.getTopMaliciousIssuers() });
    },
  );

  app.get(
    '/analytics/network-activity',
    {
      schema: { tags: ['analytics'], summary: 'Raw Horizon event volume by type' },
      preHandler: validateQuery(networkActivityQuerySchema),
    },
    async (request, reply) => {
      const { sinceHours } = request.query as { sinceHours: number };
      return reply.send({ data: await analyticsService.getNetworkActivity(sinceHours) });
    },
  );
}
