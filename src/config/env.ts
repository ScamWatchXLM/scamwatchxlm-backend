import 'dotenv/config';

import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_NAME: z.string().default('scamwatchxlm-backend'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  API_BASE_URL: z.string().url().default('http://localhost:3000'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('1h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  API_KEY_HEADER: z.string().default('x-api-key'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),

  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),

  CORS_ORIGIN: z.string().default('*'),

  STELLAR_NETWORK: z.enum(['testnet', 'public']).default('testnet'),
  HORIZON_URL: z.string().url().default('https://horizon-testnet.stellar.org'),
  HORIZON_STREAM_RETRY_MS: z.coerce.number().int().positive().default(5000),
  HORIZON_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(10_000),

  DISCORD_WEBHOOK_URL: z.string().url().optional().or(z.literal('')),
  SLACK_WEBHOOK_URL: z.string().url().optional().or(z.literal('')),
  GENERIC_WEBHOOK_URLS: z.string().optional().default(''),
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASSWORD: z.string().optional().default(''),
  SMTP_FROM: z.string().default('alerts@scamwatchxlm.dev'),
  NOTIFICATIONS_MIN_SEVERITY: z.enum(['low', 'medium', 'high', 'critical']).default('high'),

  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(5),
  RISK_RECALC_CRON: z.string().default('*/15 * * * *'),
  ALERT_CLEANUP_CRON: z.string().default('0 3 * * *'),
  STATS_GENERATION_CRON: z.string().default('*/10 * * * *'),
  ALERT_RETENTION_DAYS: z.coerce.number().int().positive().default(90),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}

export const env = loadEnv();
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
