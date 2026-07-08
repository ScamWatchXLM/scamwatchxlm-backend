import { describe, expect, it } from 'vitest';

import {
  generateApiKey,
  hashApiKey,
  hashPassword,
  verifyPassword,
} from '../../../src/utils/hash.js';

describe('hash utils', () => {
  it('hashes and verifies a password', async () => {
    const hash = await hashPassword('super-secret-password');
    expect(hash).not.toBe('super-secret-password');
    expect(await verifyPassword('super-secret-password', hash)).toBe(true);
    expect(await verifyPassword('wrong-password', hash)).toBe(false);
  });

  it('generates API keys with a stable prefix and deterministic hash', () => {
    const { key, prefix, hash } = generateApiKey();
    expect(key.startsWith('swx_')).toBe(true);
    expect(key.startsWith(prefix)).toBe(true);
    expect(hashApiKey(key)).toBe(hash);
  });
});
