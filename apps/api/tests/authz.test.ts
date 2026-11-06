import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/index';
import { prisma } from '../src/config/db';

describe('Authorization & Role Guard Integration Tests', () => {
  let holderToken: string;
  let adminToken: string;
  let holderUserId: string;
  let accountAId: string;
  let accountBId: string;

  beforeAll(async () => {
    // Login as HOLDER
    const holderLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'holder@ledgerline.dev', password: 'Holder1234!' });
    expect(holderLogin.status).toBe(200);
    holderToken = holderLogin.body.accessToken;
    holderUserId = holderLogin.body.user.id;

    // Login as ADMIN
    const adminLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@ledgerline.dev', password: 'Admin1234!' });
    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.accessToken;

    // Fetch account IDs directly from DB to verify
    const accountA = await prisma.account.findFirst({ where: { name: 'Account A' } });
    const accountB = await prisma.account.findFirst({ where: { name: 'Account B' } });
    expect(accountA).not.toBeNull();
    expect(accountB).not.toBeNull();
    accountAId = accountA!.id;
    accountBId = accountB!.id;
  });

  it('rejects unauthenticated requests to protected endpoints with 401', async () => {
    const res = await request(app).get('/accounts');
    expect(res.status).toBe(401);
  });

  it('rejects invalid Bearer token with 401', async () => {
    const res = await request(app)
      .get('/accounts')
      .set('Authorization', 'Bearer invalid-token-xyz');
    expect(res.status).toBe(401);
  });

  it('returns only own accounts for HOLDER role', async () => {
    const res = await request(app)
      .get('/accounts')
      .set('Authorization', `Bearer ${holderToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // Every returned account must be owned by the holder
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    for (const acc of res.body) {
      expect(acc.holders.some((h: any) => h.userId === holderUserId)).toBe(true);
    }
    // Must contain Account A and MUST NOT contain Account B (owned only by admin)
    const accountIds = res.body.map((a: any) => a.id);
    expect(accountIds).toContain(accountAId);
    expect(accountIds).not.toContain(accountBId);
  });

  it('returns all accounts for ADMIN role', async () => {
    const res = await request(app)
      .get('/accounts')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // Admin sees all accounts (at least Account A and Account B)
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    const accountIds = res.body.map((a: any) => a.id);
    expect(accountIds).toContain(accountAId);
    expect(accountIds).toContain(accountBId);
  });

  it('blocks HOLDER from debiting an account they do not own (returns 403)', async () => {
    // Attempting to withdraw or transfer from Account B (owned only by admin)
    const res = await request(app)
      .post('/transfers')
      .set('Authorization', `Bearer ${holderToken}`)
      .set('Idempotency-Key', 'test-authz-cross-user-debit')
      .send({
        type: 'transfer',
        fromAccountId: accountBId, // Account B is owned by admin
        toAccountId: accountAId,
        amount: 1000, // 1000 paise = ₹10
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Forbidden|own/i);
  });

  it('blocks SQL injection payload in fromAccountId without executing DDL or returning 500', async () => {
    const maliciousAccountId = "'; DROP TABLE \"Account\"; --";
    const res = await request(app)
      .post('/transfers')
      .set('Authorization', `Bearer ${holderToken}`)
      .set('Idempotency-Key', `sqli-test-${Date.now()}`)
      .send({
        type: 'transfer',
        fromAccountId: maliciousAccountId,
        toAccountId: accountAId,
        amount: 1000,
        note: 'SQL injection attack attempt',
      });

    // Parameterized queries treat input as literal string; must return 400 or 403, never 500
    expect([400, 403, 404]).toContain(res.status);
    expect(res.status).not.toBe(500);

    // Verify Account table remains completely intact
    const accountCount = await prisma.account.count();
    expect(accountCount).toBeGreaterThan(0);
  });
});
