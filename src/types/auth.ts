import type { UserRole } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export interface AuthenticatedIdentity {
  type: 'user' | 'apiKey';
  userId: string;
  role: UserRole;
  scopes?: string[];
}
