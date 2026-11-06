import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/index';
import { prisma } from '../src/config/db';
import { resetDatabase } from './helpers/resetDb';

describe('Double-Entry Reconciliation Invariant Suite', () => {
  let adminToken: string;
  let auditorToken: string;
  let holderToken: string;
  let accountAId: string;
  let accountBId: string;

  beforeAll(async () => {
    // 0. Reset to deterministic seed state
    const { accountA, accountB } = await resetDatabase();
    accountAId = accountA.id;
    accountBId = accountB.id;

    const adminLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@ledgerline.dev', password: 'Admin1234!' });
    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.accessToken;

    const auditorLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'auditor@ledgerline.dev', password: 'Audit1234!' });
    expect(auditorLogin.status).toBe(200);
    auditorToken = auditorLogin.body.accessToken;

    const holderLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'holder@ledgerline.dev', password: 'Holder1234!' });
    expect(holderLogin.status).toBe(200);
    holderToken = holderLogin.body.accessToken;
  });

  it('allows ADMIN and AUDITOR to reconcile an account, returning matches: true for uncorrupted state', async () => {
    const adminRes = await request(app)
      .get(`/accounts/${accountAId}/reconcile`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminRes.status).toBe(200);
    expect(adminRes.body.matches).toBe(true);
    expect(adminRes.body.discrepancyPence).toBe('0');
    expect(adminRes.body.storedBalance).toBe(adminRes.body.computedBalance);

    const auditorRes = await request(app)
      .get(`/accounts/${accountAId}/reconcile`)
      .set('Authorization', `Bearer ${auditorToken}`);

    expect(auditorRes.status).toBe(200);
    expect(auditorRes.body.matches).toBe(true);
  });

  it('blocks HOLDER from calling reconcile endpoints with 403', async () => {
    const res = await request(app)
      .get(`/accounts/${accountAId}/reconcile`)
      .set('Authorization', `Bearer ${holderToken}`);

    expect(res.status).toBe(403);
  });

  it('system-wide reconcile-all succeeds for ADMIN and blocks non-ADMIN', async () => {
    const adminRes = await request(app)
      .get('/admin/reconcile-all')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminRes.status).toBe(200);
    expect(adminRes.body.allMatch).toBe(true);
    expect(adminRes.body.discrepantAccountsCount).toBe(0);
    expect(adminRes.body.accounts.length).toBeGreaterThanOrEqual(2);

    const auditorRes = await request(app)
      .get('/admin/reconcile-all')
      .set('Authorization', `Bearer ${auditorToken}`);

    expect(auditorRes.status).toBe(403);
  });

  it('deliberately corrupts Account.balancePence via raw SQL and confirms reconcile detects discrepancy', async () => {
    // 1. Directly corrupt Account A balance by injecting an artificial out-of-band +5,000 paise (₹50)
    // without creating any LedgerEntry (simulating a direct DB compromise or faulty DB script)
    await prisma.$executeRaw`
      UPDATE "Account"
      SET "balancePence" = "balancePence" + 5000
      WHERE id = ${accountAId}
    `;

    // 2. Call single-account reconcile endpoint
    const res = await request(app)
      .get(`/accounts/${accountAId}/reconcile`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    // Discrepancy detected! Stored balance is 5,000 paise higher than ledger sum
    expect(res.body.matches).toBe(false);
    expect(res.body.discrepancyPence).toBe('5000');
    expect(BigInt(res.body.storedBalance)).toBe(BigInt(res.body.computedBalance) + 5000n);

    // 3. Call system-wide reconcile endpoint
    const allRes = await request(app)
      .get('/admin/reconcile-all')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(allRes.status).toBe(200);
    expect(allRes.body.allMatch).toBe(false);
    expect(allRes.body.discrepantAccountsCount).toBe(1);

    const corruptedAccount = allRes.body.accounts.find((a: any) => a.accountId === accountAId);
    expect(corruptedAccount).toBeDefined();
    expect(corruptedAccount.matches).toBe(false);
    expect(corruptedAccount.discrepancyPence).toBe('5000');

    // 4. Restore database to clean state
    await prisma.$executeRaw`
      UPDATE "Account"
      SET "balancePence" = "balancePence" - 5000
      WHERE id = ${accountAId}
    `;

    const cleanedRes = await request(app)
      .get(`/accounts/${accountAId}/reconcile`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(cleanedRes.body.matches).toBe(true);
    expect(cleanedRes.body.discrepancyPence).toBe('0');
  });
});

