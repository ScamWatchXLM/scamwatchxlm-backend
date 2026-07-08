import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp, type App } from '../../src/app.js';

describe('POST /api/v1/reports', () => {
  let app: App;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects a report with an invalid category', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      payload: {
        category: 'not_a_real_category',
        description: 'This description is definitely long enough to pass validation.',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a report with a too-short description', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      payload: { category: 'phishing', description: 'too short' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('creates a report given valid input', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      payload: {
        category: 'phishing',
        description:
          'This account is impersonating a well-known Stellar wallet provider to steal funds.',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toHaveProperty('id');
    expect(response.json().status).toBe('PENDING');
  });
});
