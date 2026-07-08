import { UserRole } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

import { attachIdentityIfPresent, requireAuth, requireRole } from '../../middleware/auth.js';
import { validateBody, validateQuery } from '../../middleware/validation.js';
import { ReportService } from '../../services/report.service.js';
import { UnauthorizedError } from '../../utils/errors.js';
import {
  createReportSchema,
  listReportsQuerySchema,
  reviewReportSchema,
  type CreateReportInput,
  type ListReportsQuery,
  type ReviewReportInput,
} from '../schemas/report.schema.js';

export default async function reportsRoutes(app: FastifyInstance) {
  const reportService = new ReportService(app.prisma);

  app.post(
    '/reports',
    {
      schema: { tags: ['reports'], summary: 'Submit a community scam report' },
      preHandler: [attachIdentityIfPresent, validateBody(createReportSchema)],
    },
    async (request, reply) => {
      const input = request.body as CreateReportInput;
      const report = await reportService.create({ ...input, reporterId: request.identity?.userId });
      return reply.status(201).send(report);
    },
  );

  app.get(
    '/reports',
    {
      schema: { tags: ['reports'], summary: 'List community reports' },
      preHandler: validateQuery(listReportsQuerySchema),
    },
    async (request, reply) => {
      const query = request.query as ListReportsQuery;
      const result = await reportService.list(query);
      return reply.send(result);
    },
  );

  app.get(
    '/reports/:id',
    { schema: { tags: ['reports'], summary: 'Get report detail' } },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const report = await reportService.getById(id);
      return reply.send(report);
    },
  );

  app.post(
    '/reports/:id/review',
    {
      schema: { tags: ['reports'], summary: 'Review a report (moderator/admin only)' },
      preHandler: [
        requireAuth,
        requireRole(UserRole.MODERATOR, UserRole.ADMIN),
        validateBody(reviewReportSchema),
      ],
    },
    async (request, reply) => {
      if (!request.identity) throw new UnauthorizedError();
      const { id } = request.params as { id: string };
      const { status, notes } = request.body as ReviewReportInput;
      const report = await reportService.review(id, request.identity.userId, status, notes);
      return reply.send(report);
    },
  );
}
