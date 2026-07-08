import type { PrismaClient, ReportStatus } from '@prisma/client';

import { NotFoundError } from '../utils/errors.js';
import {
  buildPaginationMeta,
  normalizePagination,
  type PaginatedResult,
} from '../utils/pagination.js';
import { isValidPublicKey } from '../utils/stellar.js';

export interface CreateReportInput {
  reporterId?: string;
  reporterEmail?: string;
  category: string;
  description: string;
  evidenceUrls?: string[];
  targetAddress?: string;
}

export interface ListReportsFilter {
  status?: ReportStatus;
  page?: number;
  pageSize?: number;
}

export class ReportService {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateReportInput) {
    let accountId: string | undefined;

    if (input.targetAddress && isValidPublicKey(input.targetAddress)) {
      const account = await this.prisma.account.upsert({
        where: { publicKey: input.targetAddress },
        update: {},
        create: { publicKey: input.targetAddress },
      });
      accountId = account.id;
    }

    return this.prisma.report.create({
      data: {
        reporterId: input.reporterId,
        reporterEmail: input.reporterEmail,
        category: input.category,
        description: input.description,
        evidenceUrls: input.evidenceUrls ?? [],
        targetAddress: input.targetAddress,
        accountId,
      },
    });
  }

  async list(
    filter: ListReportsFilter,
  ): Promise<PaginatedResult<Awaited<ReturnType<PrismaClient['report']['findMany']>>[number]>> {
    const { page, pageSize, skip, take } = normalizePagination(filter);
    const where = filter.status ? { status: filter.status } : {};

    const [data, total] = await Promise.all([
      this.prisma.report.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.report.count({ where }),
    ]);

    return { data, meta: buildPaginationMeta(page, pageSize, total) };
  }

  async getById(id: string) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      include: { account: true, asset: true, reviewedBy: { select: { id: true, email: true } } },
    });
    if (!report) throw new NotFoundError('Report', id);
    return report;
  }

  async review(id: string, reviewerId: string, status: ReportStatus, notes?: string) {
    await this.getById(id);
    return this.prisma.report.update({
      where: { id },
      data: { status, reviewedById: reviewerId, reviewNotes: notes },
    });
  }
}
