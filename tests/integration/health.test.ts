import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp, type App } from '../../src/app.js';

describe('GET /health', () => {
  let app: App;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('reports service health with database and redis status', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect([200, 503]).toContain(response.statusCode);
    const body = response.json();
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('database');
    expect(body).toHaveProperty('redis');
  });
});
