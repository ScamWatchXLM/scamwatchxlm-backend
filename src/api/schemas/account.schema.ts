import { z } from 'zod';

export const listAccountsQuerySchema = z.object({
  // z.coerce.boolean() just runs `Boolean(value)`, so "?flaggedOnly=false" would coerce to
  // `true` since any non-empty string is truthy. Normalize the raw query string ourselves.
  flaggedOnly: z.preprocess(
    (v) => (typeof v === 'string' ? v === 'true' : v),
    z.boolean().optional(),
  ),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});
export type ListAccountsQuery = z.infer<typeof listAccountsQuerySchema>;
