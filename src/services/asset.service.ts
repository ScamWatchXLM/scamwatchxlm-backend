import type { PrismaClient } from '@prisma/client';

import { NotFoundError } from '../utils/errors.js';
import {
  buildPaginationMeta,
  normalizePagination,
  type PaginatedResult,
} from '../utils/pagination.js';

export interface ListAssetsFilter {
  flaggedOnly?: boolean;
  issuer?: string;
  page?: number;
  pageSize?: number;
}

export class AssetService {
  constructor(private readonly prisma: PrismaClient) {}

  async getByCodeAndIssuer(code: string, issuer: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { code_issuer: { code, issuer } },
      include: {
        riskScores: { orderBy: { createdAt: 'desc' }, take: 10 },
        alerts: { orderBy: { createdAt: 'desc' }, take: 10 },
        issuerAccount: true,
      },
    });
    if (!asset) throw new NotFoundError('Asset', `${code}:${issuer}`);
    return asset;
  }

  async list(
    filter: ListAssetsFilter,
  ): Promise<PaginatedResult<Awaited<ReturnType<PrismaClient['asset']['findMany']>>[number]>> {
    const { page, pageSize, skip, take } = normalizePagination(filter);
    const where = {
      ...(filter.flaggedOnly ? { isFlagged: true } : {}),
      ...(filter.issuer ? { issuer: filter.issuer } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.asset.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.asset.count({ where }),
    ]);

    return { data, meta: buildPaginationMeta(page, pageSize, total) };
  }
}
