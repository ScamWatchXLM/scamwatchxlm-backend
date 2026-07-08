import type { FastifyReply, FastifyRequest } from 'fastify';

type RouteHandler = (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;

/**
 * Fastify already awaits async handlers and forwards rejections to the error
 * handler, so this is a thin semantic wrapper for readability at call sites.
 */
export function asyncHandler(handler: RouteHandler): RouteHandler {
  return handler;
}
