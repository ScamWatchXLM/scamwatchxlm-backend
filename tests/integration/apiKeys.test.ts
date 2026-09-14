import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp, type App } from '../../src/app.js';

describe('POST /api/v1/auth/api-keys', () => {
  let app: App;
  let token: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    const register = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: `${randomUUID()}@example.com`, password: 'a-strong-password' },
    });
    token = register.json().token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('never returns the key hash, only the plaintext key at creation time', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/api-keys',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'ci key' },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body).toHaveProperty('plaintextKey');
    expect(body).not.toHaveProperty('keyHash');
  });

  it('never returns the key hash when listing keys', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/api-keys',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const { data } = response.json();
    expect(data.length).toBeGreaterThan(0);
    for (const key of data) {
      expect(key).not.toHaveProperty('keyHash');
    }
  });
});
