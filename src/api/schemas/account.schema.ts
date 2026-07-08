import { z } from 'zod';

export const listAccountsQuerySchema = z.object({
  flaggedOnly: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});
export type ListAccountsQuery = z.infer<typeof listAccountsQuerySchema>;
