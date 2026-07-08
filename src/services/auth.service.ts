import type { PrismaClient, User } from '@prisma/client';

import { ConflictError, UnauthorizedError } from '../utils/errors.js';
import { hashPassword, verifyPassword } from '../utils/hash.js';

export class AuthService {
  constructor(private readonly prisma: PrismaClient) {}

  async register(email: string, password: string): Promise<User> {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictError('An account with this email already exists');

    return this.prisma.user.create({
      data: { email, passwordHash: await hashPassword(password) },
    });
  }

  async login(email: string, password: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) throw new UnauthorizedError('Invalid credentials');

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) throw new UnauthorizedError('Invalid credentials');

    return user;
  }

  async getById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }
}
