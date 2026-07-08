import type { PrismaClient } from '@prisma/client';

import { isValidPublicKey } from '../utils/stellar.js';

export interface SearchResult {
  accounts: Awaited<ReturnType<PrismaClient['account']['findMany']>>;
  assets: Awaited<ReturnType<PrismaClient['asset']['findMany']>>;
  issuers: Awaited<ReturnType<PrismaClient['account']['findMany']>>;
  transactions: Awaited<ReturnType<PrismaClient['horizonEvent']['findMany']>>;
  reports: Awaited<ReturnType<PrismaClient['report']['findMany']>>;
}

const SEARCH_LIMIT = 10;

export class SearchService {
  constructor(private readonly prisma: PrismaClient) {}

  async search(query: string): Promise<SearchResult> {
    const trimmed = query.trim();
    const isPublicKey = isValidPublicKey(trimmed);
    const isTxHash = /^[a-fA-F0-9]{64}$/.test(trimmed);

    const [accounts, assets, issuers, transactions, reports] = await Promise.all([
      isPublicKey
        ? this.prisma.account.findMany({ where: { publicKey: trimmed }, take: SEARCH_LIMIT })
        : this.prisma.account.findMany({
            where: { publicKey: { contains: trimmed, mode: 'insensitive' } },
            take: SEARCH_LIMIT,
          }),
      this.prisma.asset.findMany({
        where: { code: { contains: trimmed, mode: 'insensitive' } },
        take: SEARCH_LIMIT,
      }),
      isPublicKey
        ? this.prisma.account.findMany({
            where: { publicKey: trimmed, issuedAssets: { some: {} } },
            take: SEARCH_LIMIT,
          })
        : Promise.resolve([]),
      isTxHash
        ? this.prisma.horizonEvent.findMany({ where: { txHash: trimmed }, take: SEARCH_LIMIT })
        : Promise.resolve([]),
      this.prisma.report.findMany({
        where: {
          OR: [
            { description: { contains: trimmed, mode: 'insensitive' } },
            { category: { contains: trimmed, mode: 'insensitive' } },
            { targetAddress: trimmed },
          ],
        },
        take: SEARCH_LIMIT,
      }),
    ]);

    return { accounts, assets, issuers, transactions, reports };
  }
}
