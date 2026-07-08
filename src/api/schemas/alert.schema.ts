import { z } from 'zod';

export const listAlertsQuerySchema = z.object({
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  status: z.enum(['OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED']).optional(),
  entityType: z.enum(['ACCOUNT', 'ASSET', 'ISSUER', 'TRANSACTION']).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});
export type ListAlertsQuery = z.infer<typeof listAlertsQuerySchema>;
