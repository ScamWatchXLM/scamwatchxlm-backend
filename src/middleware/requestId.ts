import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';

export function genRequestId(request: IncomingMessage): string {
  const incoming = request.headers['x-request-id'];
  const value = Array.isArray(incoming) ? incoming[0] : incoming;
  if (typeof value === 'string' && value.length > 0) return value;
  return randomUUID();
}
