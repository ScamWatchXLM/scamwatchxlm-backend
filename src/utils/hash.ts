import { randomBytes, createHash } from 'node:crypto';

import bcrypt from 'bcryptjs';

import { env } from '../config/env.js';

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.BCRYPT_SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** API keys are shown once at creation, then only their SHA-256 hash is stored. */
export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const key = `swx_${randomBytes(24).toString('hex')}`;
  return { key, prefix: key.slice(0, 12), hash: hashApiKey(key) };
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}
