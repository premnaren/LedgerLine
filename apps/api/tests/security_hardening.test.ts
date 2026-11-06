import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/index';
import { resetDatabase } from './helpers/resetDb';

describe('Security Hardening & Observability Suite', () => {
  let holderToken: string;
  let adminToken: string;
  let accountAId: string;
  let accountBId: string;

  beforeAll(async () => {
    const { accountA, accountB } = await resetDatabase();
    accountAId = accountA.id;
    accountBId = accountB.id;

    const holderLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'holder@ledgerline.dev', password: 'Holder1234!' });
    holderToken = holderLogin.body.accessToken;

    const adminLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@ledgerline.dev', password: 'Admin1234!' });
    adminToken = adminLogin.body.accessToken;
  });

  it('sets secure HTTP response headers via Helmet on all responses', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);

    // Verify security headers
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['content-security-policy']).toContain("default-src 'none'");
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('rejects malformed transfer payloads with clean HTTP 400 via Zod, never 500', async () => {
    // 1. Nested object as amount
    const res1 = await request(app)
      .post('/transfers')
      .set('Authorization', `Bearer ${holderToken}`)
      .set('Idempotency-Key', `malformed-amount-obj-${Date.now()}`)
      .send({
        type: 'transfer',
        fromAccountId: accountAId,
        toAccountId: accountBId,
        amount: { exploit: 1000 },
      });
    expect(res1.status).toBe(400);
    expect(res1.body.error).toBe('Validation failed');

    // 2. Array as accountId
    const res2 = await request(app)
      .post('/transfers')
      .set('Authorization', `Bearer ${holderToken}`)
      .set('Idempotency-Key', `malformed-array-id-${Date.now()}`)
      .send({
        type: 'transfer',
        fromAccountId: accountAId,
        toAccountId: ['acc-1', 'acc-2'],
        amount: 500,
      });
    expect(res2.status).toBe(400);

    // 3. Invalid transfer type
    const res3 = await request(app)
      .post('/transfers')
      .set('Authorization', `Bearer ${holderToken}`)
      .set('Idempotency-Key', `malformed-type-${Date.now()}`)
      .send({
        type: 'exploit_drain',
        fromAccountId: accountAId,
        toAccountId: accountBId,
        amount: 500,
      });
    expect(res3.status).toBe(400);

    // 4. Missing fromAccountId on transfer type
    const res4 = await request(app)
      .post('/transfers')
      .set('Authorization', `Bearer ${holderToken}`)
      .set('Idempotency-Key', `missing-from-${Date.now()}`)
      .send({
        type: 'transfer',
        toAccountId: accountBId,
        amount: 500,
      });
    expect(res4.status).toBe(400);
  });

  it('rejects malformed account creation payloads with clean HTTP 400', async () => {
    const res = await request(app)
      .post('/accounts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 12345, // invalid type: number instead of string
        initialBalance: 'not-a-number',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('rejects malformed login body with clean HTTP 400', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({
        email: 'not-an-email',
        password: '',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });
});

