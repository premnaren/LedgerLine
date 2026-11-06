import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/index';
import { prisma } from '../src/config/db';

describe('Idempotency Middleware Integration Tests', () => {
  let holderToken: string;
  let accountAId: string;
  let accountBId: string;

  beforeAll(async () => {
    // Login as HOLDER
    const holderLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'holder@ledgerline.dev', password: 'Holder1234!' });
    expect(holderLogin.status).toBe(200);
    holderToken = holderLogin.body.accessToken;

    const accountA = await prisma.account.findFirst({ where: { name: 'Account A' } });
    const accountB = await prisma.account.findFirst({ where: { name: 'Account B' } });
    expect(accountA).not.toBeNull();
    expect(accountB).not.toBeNull();
    accountAId = accountA!.id;
    accountBId = accountB!.id;
  });

  it('rejects POST /transfers without Idempotency-Key header with 400', async () => {
    const res = await request(app)
      .post('/transfers')
      .set('Authorization', `Bearer ${holderToken}`)
      .send({
        type: 'transfer',
        fromAccountId: accountAId,
        toAccountId: accountBId,
        amount: 100,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Idempotency-Key/i);
  });

  it('returns identical response body on replay and mutates balance exactly once', async () => {
    const key = `replay-test-${Date.now()}`;
    const amount = 5000; // ₹50 in paise

    const accBefore = await prisma.account.findUnique({ where: { id: accountAId } });
    const balanceBefore = BigInt(accBefore!.balancePence);

    // First call
    const res1 = await request(app)
      .post('/transfers')
      .set('Authorization', `Bearer ${holderToken}`)
      .set('Idempotency-Key', key)
      .send({
        type: 'transfer',
        fromAccountId: accountAId,
        toAccountId: accountBId,
        amount,
        note: 'Idempotency replay test',
      });

    expect(res1.status).toBe(200);
    expect(res1.body.success).toBe(true);

    // Second call with same key immediately
    const res2 = await request(app)
      .post('/transfers')
      .set('Authorization', `Bearer ${holderToken}`)
      .set('Idempotency-Key', key)
      .send({
        type: 'transfer',
        fromAccountId: accountAId,
        toAccountId: accountBId,
        amount,
        note: 'Idempotency replay test',
      });

    expect(res2.status).toBe(200);
    // Response bodies must be identical
    expect(res2.body).toEqual(res1.body);

    // Balance must have changed exactly once
    const accAfter = await prisma.account.findUnique({ where: { id: accountAId } });
    const balanceAfter = BigInt(accAfter!.balancePence);
    expect(balanceBefore - balanceAfter).toBe(BigInt(amount));
  });

  it('returns 409 request_in_flight on concurrent requests with identical key', async () => {
    const key = `concurrent-key-${Date.now()}`;
    const amount = 2500; // ₹25 in paise

    const accBefore = await prisma.account.findUnique({ where: { id: accountAId } });
    const balanceBefore = BigInt(accBefore!.balancePence);

    // Fire 2 concurrent requests with the identical key
    const [res1, res2] = await Promise.all([
      request(app)
        .post('/transfers')
        .set('Authorization', `Bearer ${holderToken}`)
        .set('Idempotency-Key', key)
        .set('x-test-delay', '150')
        .send({
          type: 'transfer',
          fromAccountId: accountAId,
          toAccountId: accountBId,
          amount,
          note: 'Concurrent idempotency race',
        }),
      request(app)
        .post('/transfers')
        .set('Authorization', `Bearer ${holderToken}`)
        .set('Idempotency-Key', key)
        .send({
          type: 'transfer',
          fromAccountId: accountAId,
          toAccountId: accountBId,
          amount,
          note: 'Concurrent idempotency race',
        }),
    ]);

    const statuses = [res1.status, res2.status].sort();
    // One must succeed (200) and the other must get 409 (or if fast-forwarded 200 replay)
    expect(statuses).toContain(200);
    expect(statuses).toContain(409);

    const conflictRes = res1.status === 409 ? res1 : res2;
    expect(conflictRes.body.error).toBe('request_in_flight');

    // Balance must have decremented by amount exactly once
    const accAfter = await prisma.account.findUnique({ where: { id: accountAId } });
    const balanceAfter = BigInt(accAfter!.balancePence);
    expect(balanceBefore - balanceAfter).toBe(BigInt(amount));
  });
});
