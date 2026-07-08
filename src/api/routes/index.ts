import type { FastifyInstance } from 'fastify';

import accountsRoutes from './accounts.routes.js';
import adminRoutes from './admin.routes.js';
import alertsRoutes from './alerts.routes.js';
import analyticsRoutes from './analytics.routes.js';
import assetsRoutes from './assets.routes.js';
import authRoutes from './auth.routes.js';
import healthRoutes from './health.routes.js';
import reportsRoutes from './reports.routes.js';
import searchRoutes from './search.routes.js';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(healthRoutes);

  await app.register(
    async (api) => {
      await api.register(authRoutes);
      await api.register(accountsRoutes);
      await api.register(assetsRoutes);
      await api.register(alertsRoutes);
      await api.register(reportsRoutes);
      await api.register(searchRoutes);
      await api.register(analyticsRoutes);
      await api.register(adminRoutes);
    },
    { prefix: '/api/v1' },
  );
}
