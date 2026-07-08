import pino from 'pino';

import { env, isProduction } from './env.js';

/**
 * Plain pino options rather than a pre-built instance — Fastify's `logger`
 * option constructs its own pino instance from this so its internal types
 * (child logger factories, request/reply serializers) line up exactly with
 * what it expects. A hand-built `pino()` instance passed via `loggerInstance`
 * doesn't structurally match Fastify's bundled pino typings.
 */
export const loggerOptions: pino.LoggerOptions = {
  name: env.APP_NAME,
  level: env.LOG_LEVEL,
  transport: isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      },
};

export const logger = pino(loggerOptions);

export function childLogger(scope: string) {
  return logger.child({ scope });
}
