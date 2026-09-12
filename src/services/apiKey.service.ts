import type { PrismaClient } from '@prisma/client';

import { NotFoundError } from '../utils/errors.js';
import { generateApiKey } from '../utils/hash.js';

/** Fields safe to return to clients — never the hash, which is otherwise the bearer secret's only stand-in server-side. */
const SAFE_SELECT = {
  id: true,
  name: true,
  keyPrefix: true,
  userId: true,
  scopes: true,
  isActive: true,
  lastUsedAt: true,
  expiresAt: true,
  createdAt: true,
} as const;

export class ApiKeyService {
  constructor(private readonly prisma: PrismaClient) {}

  /** Returns the plaintext key exactly once — only the hash is persisted. */
  async create(userId: string, name: string, scopes: string[] = [], expiresAt?: Date) {
    const { key, prefix, hash } = generateApiKey();

    const record = await this.prisma.apiKey.create({
      data: { userId, name, keyHash: hash, keyPrefix: prefix, scopes, expiresAt },
      select: SAFE_SELECT,
    });

    return { ...record, plaintextKey: key };
  }

  async listForUser(userId: string) {
    return this.prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: SAFE_SELECT,
    });
  }

  async revoke(userId: string, keyId: string) {
    const key = await this.prisma.apiKey.findFirst({ where: { id: keyId, userId } });
    if (!key) throw new NotFoundError('API key', keyId);
    return this.prisma.apiKey.update({
      where: { id: keyId },
      data: { isActive: false },
      select: SAFE_SELECT,
    });
  }
}
