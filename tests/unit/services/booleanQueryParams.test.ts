import { describe, expect, it } from 'vitest';

import { listAccountsQuerySchema } from '../../../src/api/schemas/account.schema.js';
import { listAssetsQuerySchema } from '../../../src/api/schemas/asset.schema.js';

// `?flaggedOnly=false` arrives to Fastify as the string "false". z.coerce.boolean() runs
// `Boolean(value)` under the hood, so any non-empty string — including the literal string
// "false" — coerces to `true`. These schemas parse the raw query string themselves instead.
describe('flaggedOnly query param parsing', () => {
  it('parses "false" as false for accounts', () => {
    expect(listAccountsQuerySchema.parse({ flaggedOnly: 'false' }).flaggedOnly).toBe(false);
  });

  it('parses "true" as true for accounts', () => {
    expect(listAccountsQuerySchema.parse({ flaggedOnly: 'true' }).flaggedOnly).toBe(true);
  });

  it('parses "false" as false for assets', () => {
    expect(listAssetsQuerySchema.parse({ flaggedOnly: 'false' }).flaggedOnly).toBe(false);
  });

  it('parses "true" as true for assets', () => {
    expect(listAssetsQuerySchema.parse({ flaggedOnly: 'true' }).flaggedOnly).toBe(true);
  });
});
