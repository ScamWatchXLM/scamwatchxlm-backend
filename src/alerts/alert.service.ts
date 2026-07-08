import type { AlertStatus, PrismaClient, Severity } from '@prisma/client';

import { NotFoundError } from '../utils/errors.js';
import {
  buildPaginationMeta,
  normalizePagination,
  type PaginatedResult,
} from '../utils/pagination.js';

export interface ListAlertsFilter {
  severity?: Severity;
  status?: AlertStatus;
  entityType?: string;
  page?: number;
  pageSize?: number;
}

export class AlertService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(
    filter: ListAlertsFilter,
  ): Promise<PaginatedResult<Awaited<ReturnType<typeof this.prisma.alert.findMany>>[number]>> {
    const { page, pageSize, skip, take } = normalizePagination(filter);
    const where = {
      ...(filter.severity ? { severity: filter.severity } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.entityType ? { entityType: filter.entityType as never } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.alert.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.alert.count({ where }),
    ]);

    return { data, meta: buildPaginationMeta(page, pageSize, total) };
  }

  async getById(id: string) {
    const alert = await this.prisma.alert.findUnique({
      where: { id },
      include: { account: true, asset: true, detection: true, notifications: true },
    });
    if (!alert) throw new NotFoundError('Alert', id);
    return alert;
  }
}
