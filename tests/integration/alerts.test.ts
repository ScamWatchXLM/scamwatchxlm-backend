import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp, type App } from '../../src/app.js';

describe('GET /api/v1/alerts', () => {
  let app: App;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects an invalid severity filter', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/alerts?severity=NOT_REAL' });
    expect(response.statusCode).toBe(400);
  });

  it('returns a paginated list of alerts', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/alerts' });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('meta');
    expect(body.meta).toHaveProperty('total');
  });

  it('requires authentication to acknowledge an alert', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/alerts/nonexistent-id/acknowledge',
    });
    expect(response.statusCode).toBe(401);
  });
});
