import closeWithGrace from 'close-with-grace';

import { buildApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { disconnectRedis } from './db/redis.js';

async function main(): Promise<void> {
  const app = await buildApp();

  closeWithGrace({ delay: 10_000 }, async ({ err }) => {
    if (err) app.log.error({ err }, 'Shutting down due to error');
    await app.close();
    await disconnectRedis();
  });

  try {
    await app.listen({ host: env.HOST, port: env.PORT });
    logger.info(`ScamWatchXLM API listening on http://${env.HOST}:${env.PORT} (docs at /docs)`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main().catch((err) => {
  logger.error({ err }, 'Fatal error during startup');
  process.exit(1);
});
