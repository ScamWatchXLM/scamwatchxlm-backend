import { z } from 'zod';

export const detectionCountsQuerySchema = z.object({
  sinceDays: z.coerce.number().int().positive().max(90).default(7),
});

export const trendingScamsQuerySchema = z.object({
  sinceDays: z.coerce.number().int().positive().max(30).default(3),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

export const networkActivityQuerySchema = z.object({
  sinceHours: z.coerce.number().int().positive().max(168).default(24),
});
