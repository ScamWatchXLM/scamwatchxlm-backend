import { z } from 'zod';

export const listAssetsQuerySchema = z.object({
  flaggedOnly: z.coerce.boolean().optional(),
  issuer: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});
export type ListAssetsQuery = z.infer<typeof listAssetsQuerySchema>;
