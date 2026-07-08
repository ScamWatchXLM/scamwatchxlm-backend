import { z } from 'zod';

export const createReportSchema = z.object({
  category: z.enum([
    'fake_asset',
    'phishing',
    'impersonation',
    'rug_pull',
    'dust_attack',
    'spam',
    'other',
  ]),
  description: z.string().min(20).max(5000),
  evidenceUrls: z.array(z.string().url()).max(10).default([]),
  targetAddress: z.string().optional(),
  reporterEmail: z.string().email().optional(),
});
export type CreateReportInput = z.infer<typeof createReportSchema>;

export const listReportsQuerySchema = z.object({
  status: z.enum(['PENDING', 'REVIEWING', 'CONFIRMED', 'REJECTED']).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});
export type ListReportsQuery = z.infer<typeof listReportsQuerySchema>;

export const reviewReportSchema = z.object({
  status: z.enum(['CONFIRMED', 'REJECTED', 'REVIEWING']),
  notes: z.string().max(2000).optional(),
});
export type ReviewReportInput = z.infer<typeof reviewReportSchema>;
