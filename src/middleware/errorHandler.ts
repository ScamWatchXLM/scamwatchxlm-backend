import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

import { AppError } from '../utils/errors.js';

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler(
    (error: FastifyError | Error, request: FastifyRequest, reply: FastifyReply) => {
      if (error instanceof AppError) {
        request.log.warn({ err: error, code: error.code }, error.message);
        return reply.status(error.statusCode).send({
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
          },
        });
      }

      if (error instanceof ZodError) {
        request.log.warn({ err: error }, 'Validation failed');
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: error.flatten(),
          },
        });
      }

      const fastifyError = error as FastifyError;
      if (fastifyError.statusCode && fastifyError.statusCode < 500) {
        request.log.warn({ err: error }, fastifyError.message);
        return reply.status(fastifyError.statusCode).send({
          error: {
            code: fastifyError.code ?? 'BAD_REQUEST',
            message: fastifyError.message,
          },
        });
      }

      request.log.error({ err: error }, 'Unhandled error');
      return reply.status(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      });
    },
  );

  app.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(404).send({
      error: {
        code: 'NOT_FOUND',
        message: `Route ${request.method} ${request.url} not found`,
      },
    });
  });
}
