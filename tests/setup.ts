process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??=
  'postgresql://scamwatch:scamwatch@localhost:5432/scamwatchxlm_test?schema=public';
process.env.REDIS_URL ??= 'redis://localhost:6379/1';
process.env.JWT_SECRET ??= 'test-secret-at-least-16-chars';
process.env.LOG_LEVEL ??= 'silent';
