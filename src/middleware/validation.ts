import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ZodSchema } from 'zod';

/**
 * Parses and replaces `request.body` / `request.query` with the schema's
 * output, throwing (via the global error handler) on failure. Fastify's
 * JSON-schema validation still runs first for coarse shape checks; these
 * hooks add business-level validation (enums, cross-field rules, refine()).
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    request.body = schema.parse(request.body);
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    request.query = schema.parse(request.query);
  };
}

export function validateParams<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    request.params = schema.parse(request.params);
  };
}
