import type { FastifyInstance } from 'fastify';

export default async function healthRoutes(app: FastifyInstance) {
  app.get(
    '/health',
    { schema: { tags: ['health'], summary: 'Liveness/readiness probe' } },
    async (_request, reply) => {
      const [dbOk, redisOk] = await Promise.all([
        app.prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
        app.redis
          .ping()
          .then(() => true)
          .catch(() => false),
      ]);

      const healthy = dbOk && redisOk;
      return reply.status(healthy ? 200 : 503).send({
        status: healthy ? 'ok' : 'degraded',
        database: dbOk ? 'up' : 'down',
        redis: redisOk ? 'up' : 'down',
        timestamp: new Date().toISOString(),
      });
    },
  );
}
