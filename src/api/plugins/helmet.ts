import helmet from '@fastify/helmet';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

export default fp(async function helmetPlugin(app: FastifyInstance) {
  await app.register(helmet, {
    global: true,
    contentSecurityPolicy: false, // this is a JSON API, not an HTML-serving app
  });
});
