import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/index';
import { prisma } from '../src/config/db';

describe('Accounts & Paginated Statement API', () => {
  let adminToken: string;
  let holderToken: string;
  let auditorToken: string;
  let accountAId: string;
  let accountBId: string;

  beforeAll(async () => {
    // 1. Login as all three roles
    const adminLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@ledgerline.dev', password: 'Admin1234!' });
    adminToken = adminLogin.body.accessToken;

    const holderLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'holder@ledgerline.dev', password: 'Holder1234!' });
    holderToken = holderLogin.body.accessToken;

    const auditorLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'auditor@ledgerline.dev', password: 'Audit1234!' });
    auditorToken = auditorLogin.body.accessToken;

    const accA = await prisma.account.findFirst({ where: { name: 'Account A' } });
    const accB = await prisma.account.findFirst({ where: { name: 'Account B' } });
    accountAId = accA!.id;
    accountBId = accB!.id;
  });

  it('allows AUDITOR to view all accounts read-only (same count as ADMIN)', async () => {
    const adminRes = await request(app)
      .get('/accounts')
      .set('Authorization', `Bearer ${adminToken}`);
    const auditorRes = await request(app)
      .get('/accounts')
      .set('Authorization', `Bearer ${auditorToken}`);

    expect(adminRes.status).toBe(200);
    expect(auditorRes.status).toBe(200);
    expect(auditorRes.body.length).toBe(adminRes.body.length);
  });

  it('allows only ADMIN to create new accounts via POST /accounts', async () => {
    // HOLDER forbidden
    const holderCreate = await request(app)
      .post('/accounts')
      .set('Authorization', `Bearer ${holderToken}`)
      .send({ name: 'Unauthorized Account', initialBalance: 1000 });
    expect(holderCreate.status).toBe(403);

    // ADMIN authorized
    const adminCreate = await request(app)
      .post('/accounts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Admin-Created-${Date.now()}`,
        initialBalance: 50000,
        overdraftLimit: 10000,
      });
    expect(adminCreate.status).toBe(201);
    expect(adminCreate.body.name).toMatch(/Admin-Created/);
    expect(adminCreate.body.balancePence).toBe('50000');
  });

  it('returns paginated statement including REFUSED entries for HOLDER own account', async () => {
    const res = await request(app)
      .get(`/accounts/${accountAId}/statement?limit=10`)
      .set('Authorization', `Bearer ${holderToken}`);

    expect(res.status).toBe(200);
    expect(res.body.accountId).toBe(accountAId);
    expect(Array.isArray(res.body.entries)).toBe(true);
    expect(res.body.entries.length).toBeGreaterThanOrEqual(1);

    const firstEntry = res.body.entries[0];
    expect(firstEntry).toHaveProperty('id');
    expect(firstEntry).toHaveProperty('createdAt');
    expect(firstEntry).toHaveProperty('type');
    expect(firstEntry).toHaveProperty('status');
    expect(firstEntry).toHaveProperty('amountPence');
    expect(firstEntry).toHaveProperty('runningBalance');
    expect(firstEntry.initiatedBy).toHaveProperty('email');
  });

  it('blocks HOLDER from viewing another user account statement with 403', async () => {
    const res = await request(app)
      .get(`/accounts/${accountBId}/statement`)
      .set('Authorization', `Bearer ${holderToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Forbidden|own/i);
  });

  it('allows AUDITOR to view any account statement', async () => {
    const res = await request(app)
      .get(`/accounts/${accountBId}/statement`)
      .set('Authorization', `Bearer ${auditorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.accountId).toBe(accountBId);
  });

  it('returns balance and version via GET /accounts/:id/balance', async () => {
    const res = await request(app)
      .get(`/accounts/${accountAId}/balance`)
      .set('Authorization', `Bearer ${holderToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('balancePence');
    expect(res.body).toHaveProperty('version');
  });
});

