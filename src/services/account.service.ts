import type { PrismaClient } from '@prisma/client';

import { NotFoundError, ValidationError } from '../utils/errors.js';
import {
  buildPaginationMeta,
  normalizePagination,
  type PaginatedResult,
} from '../utils/pagination.js';
import { isValidPublicKey } from '../utils/stellar.js';

export interface ListAccountsFilter {
  flaggedOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export class AccountService {
  constructor(private readonly prisma: PrismaClient) {}

  async getByPublicKey(publicKey: string) {
    if (!isValidPublicKey(publicKey)) throw new ValidationError('Invalid Stellar public key');

    const account = await this.prisma.account.findUnique({
      where: { publicKey },
      include: {
        riskScores: { orderBy: { createdAt: 'desc' }, take: 10 },
        alerts: { orderBy: { createdAt: 'desc' }, take: 10 },
        issuedAssets: true,
      },
    });
    if (!account) throw new NotFoundError('Account', publicKey);
    return account;
  }

  async list(
    filter: ListAccountsFilter,
  ): Promise<PaginatedResult<Awaited<ReturnType<PrismaClient['account']['findMany']>>[number]>> {
    const { page, pageSize, skip, take } = normalizePagination(filter);
    const where = filter.flaggedOnly ? { isFlagged: true } : {};

    const [data, total] = await Promise.all([
      this.prisma.account.findMany({ where, skip, take, orderBy: { lastSeenAt: 'desc' } }),
      this.prisma.account.count({ where }),
    ]);

    return { data, meta: buildPaginationMeta(page, pageSize, total) };
  }

  async getRiskHistory(publicKey: string, limit = 20) {
    const account = await this.prisma.account.findUnique({ where: { publicKey } });
    if (!account) throw new NotFoundError('Account', publicKey);

    return this.prisma.riskScore.findMany({
      where: { entityType: 'ACCOUNT', entityId: publicKey },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
