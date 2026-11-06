import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/index';
import { prisma } from '../src/config/db';

describe('Conservation of Money Invariant Suite', () => {
  let adminToken: string;
  let adminUserId: string;

  beforeAll(async () => {
    const adminLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@ledgerline.dev', password: 'Admin1234!' });
    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.accessToken;
    adminUserId = adminLogin.body.user.id;
  });

  it('preserves system-wide sum invariant during simultaneous credit-debit pairings', async () => {
    const sumBeforeResult = await prisma.$queryRaw<[{ sum: bigint }]>`
      SELECT COALESCE(SUM("balancePence"), 0) as sum FROM "Account"
    `;
    const initialTotal = BigInt(sumBeforeResult[0].sum);

    const accounts = await prisma.account.findMany({ take: 5 });
    expect(accounts.length).toBeGreaterThanOrEqual(2);

    const transfers = Array.from({ length: 25 }).map((_, i) => {
      const fromIdx = i % accounts.length;
      const toIdx = (i + 1) % accounts.length;

      return request(app)
        .post('/transfers')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Idempotency-Key', `sum-invariant-${Date.now()}-${i}`)
        .send({
          type: 'transfer',
          fromAccountId: accounts[fromIdx].id,
          toAccountId: accounts[toIdx].id,
          amount: 50,
        });
    });

    await Promise.all(transfers);

    const sumAfterResult = await prisma.$queryRaw<[{ sum: bigint }]>`
      SELECT COALESCE(SUM("balancePence"), 0) as sum FROM "Account"
    `;
    const finalTotal = BigInt(sumAfterResult[0].sum);

    expect(finalTotal).toBe(initialTotal);
  });
});
