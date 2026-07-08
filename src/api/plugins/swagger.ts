import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

import { env } from '../../config/env.js';

export default fp(async function swaggerPlugin(app: FastifyInstance) {
  await app.register(swagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'ScamWatchXLM API',
        description:
          'Intelligence engine for scam detection on the Stellar network — detections, risk scores, alerts, and community reports.',
        version: '0.1.0',
      },
      servers: [{ url: env.API_BASE_URL }],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
          apiKeyAuth: { type: 'apiKey', in: 'header', name: env.API_KEY_HEADER },
        },
      },
      tags: [
        { name: 'health', description: 'Service health' },
        { name: 'auth', description: 'Authentication and API keys' },
        { name: 'accounts', description: 'Stellar account intelligence' },
        { name: 'assets', description: 'Stellar asset intelligence' },
        { name: 'alerts', description: 'Generated scam alerts' },
        { name: 'reports', description: 'Community-submitted scam reports' },
        { name: 'search', description: 'Cross-entity search' },
        { name: 'analytics', description: 'Aggregate statistics and trends' },
        { name: 'admin', description: 'Administrative operations' },
      ],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list', deepLinking: true },
  });
});
