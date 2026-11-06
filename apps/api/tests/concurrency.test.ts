import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/index';
import { prisma } from '../src/config/db';
import { EntryStatus } from '@prisma/client';

describe('Concurrency and Conservation Invariants', () => {
  let holderToken: string;
  let adminToken: string;
  let holderUserId: string;
  let adminUserId: string;

  beforeAll(async () => {
    // 1. Authenticate users
    const holderLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'holder@ledgerline.dev', password: 'Holder1234!' });
    expect(holderLogin.status).toBe(200);
    holderToken = holderLogin.body.accessToken;
    holderUserId = holderLogin.body.user.id;

    const adminLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@ledgerline.dev', password: 'Admin1234!' });
    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.accessToken;
    adminUserId = adminLogin.body.user.id;
  });

  /**
   * TEST 1 — Concurrent overdraw attempt:
   * - Account starts with ₹100 (10,000 paise).
   * - Fire 20 concurrent withdrawal requests of ₹10 each via Promise.all.
   * - After all settle: assert final balance === 0 (all 10 succeeded).
   * - Assert exactly 10 entries have status='POSTED' and 10 have status='REFUSED'.
   * - Assert no balance is negative.
   */
  it('TEST 1: prevents concurrent overdraw when 20 requests race for 10 withdrawal slots', async () => {
    // Create dedicated account with exactly ₹100 (10,000 paise)
    const initialBalance = 10000n; // 10,000 paise = ₹100
    const overdrawAccount = await prisma.account.create({
      data: {
        name: `Overdraw-Test-${Date.now()}`,
        balancePence: initialBalance,
        overdraftLimit: 0n,
        holders: {
          create: { userId: holderUserId },
        },
      },
    });

    const withdrawalAmount = 1000; // 1,000 paise = ₹10
    const totalRequests = 20;

    // Fire 20 concurrent withdrawal requests of ₹10 each via Promise.all
    const promises = Array.from({ length: totalRequests }).map((_, i) =>
      request(app)
        .post('/transfers')
        .set('Authorization', `Bearer ${holderToken}`)
        .set('Idempotency-Key', `overdraw-req-${overdrawAccount.id}-${i}`)
        .send({
          type: 'withdrawal',
          toAccountId: overdrawAccount.id,
          amount: withdrawalAmount,
          note: `Parallel withdrawal ${i}`,
        })
    );

    const responses = await Promise.all(promises);

    const succeeded = responses.filter((r) => r.status === 200);
    const refused = responses.filter((r) => r.status === 400);

    expect(succeeded.length).toBe(10);
    expect(refused.length).toBe(10);

    // Verify final balance is exactly 0
    const finalAccount = await prisma.account.findUnique({
      where: { id: overdrawAccount.id },
    });
    expect(finalAccount!.balancePence).toBe(0n);
    expect(finalAccount!.balancePence).toBeGreaterThanOrEqual(0n);

    // Verify DB ledger entries count
    const postedEntries = await prisma.ledgerEntry.count({
      where: {
        debitAccountId: overdrawAccount.id,
        status: EntryStatus.POSTED,
      },
    });
    const refusedEntries = await prisma.ledgerEntry.count({
      where: {
        debitAccountId: overdrawAccount.id,
        status: EntryStatus.REFUSED,
      },
    });

    expect(postedEntries).toBe(10);
    expect(refusedEntries).toBe(10);
  });

  /**
   * TEST 2 — Conservation invariant:
   * - Record total = SUM(balance_pence) across all accounts before the test.
   * - Run 50 concurrent internal transfers (random amounts, random account pairs).
   * - After all settle: assert SUM(balance_pence) === total (no paise created or lost).
   */
  it('TEST 2: preserves exact conservation of money across 50 concurrent transfers', async () => {
    // Create 4 test accounts with substantial balances
    const testAccounts = await Promise.all([
      prisma.account.create({
        data: {
          name: `Conserv-1-${Date.now()}`,
          balancePence: 200000n,
          holders: { create: { userId: adminUserId } },
        },
      }),
      prisma.account.create({
        data: {
          name: `Conserv-2-${Date.now()}`,
          balancePence: 200000n,
          holders: { create: { userId: adminUserId } },
        },
      }),
      prisma.account.create({
        data: {
          name: `Conserv-3-${Date.now()}`,
          balancePence: 200000n,
          holders: { create: { userId: adminUserId } },
        },
      }),
      prisma.account.create({
        data: {
          name: `Conserv-4-${Date.now()}`,
          balancePence: 200000n,
          holders: { create: { userId: adminUserId } },
        },
      }),
    ]);

    // Record total = SUM(balancePence) before the test across all accounts
    const initialSumResult = await prisma.$queryRaw<[{ sum: bigint }]>`
      SELECT COALESCE(SUM("balancePence"), 0) as sum FROM "Account"
    `;
    const totalBefore = BigInt(initialSumResult[0].sum);

    // Run 50 concurrent internal transfers between random account pairs
    const transferCount = 50;
    const transferPromises = Array.from({ length: transferCount }).map((_, i) => {
      // Pick two distinct accounts
      const fromIdx = Math.floor(Math.random() * testAccounts.length);
      let toIdx = Math.floor(Math.random() * testAccounts.length);
      while (toIdx === fromIdx) {
        toIdx = Math.floor(Math.random() * testAccounts.length);
      }

      const randomAmount = Math.floor(Math.random() * 500) + 1; // 1 to 500 paise

      return request(app)
        .post('/transfers')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Idempotency-Key', `conserv-tx-${Date.now()}-${i}`)
        .send({
          type: 'transfer',
          fromAccountId: testAccounts[fromIdx].id,
          toAccountId: testAccounts[toIdx].id,
          amount: randomAmount,
          note: `Conservation test transfer ${i}`,
        });
    });

    await Promise.all(transferPromises);

    // After all settle: assert SUM(balancePence) === totalBefore
    const finalSumResult = await prisma.$queryRaw<[{ sum: bigint }]>`
      SELECT COALESCE(SUM("balancePence"), 0) as sum FROM "Account"
    `;
    const totalAfter = BigInt(finalSumResult[0].sum);

    expect(totalAfter).toBe(totalBefore);
  });

  /**
   * TEST 3 — Double-spend via idempotency replay:
   * - Send a ₹500 transfer with key="pay-vendor-001".
   * - Send the same request again immediately.
   * - Assert balance decreased by exactly ₹500 (not ₹1,000).
   * - Assert the second response body === first response body.
   */
  it('TEST 3: prevents double-spend via idempotency replay with key="pay-vendor-001"', async () => {
    // Create sender and receiver accounts
    const sender = await prisma.account.create({
      data: {
        name: `ReplaySender-${Date.now()}`,
        balancePence: 100000n, // ₹1,000 = 100,000 paise
        holders: { create: { userId: holderUserId } },
      },
    });

    const vendor = await prisma.account.create({
      data: {
        name: `Vendor-${Date.now()}`,
        balancePence: 0n,
        holders: { create: { userId: adminUserId } },
      },
    });

    const transferAmount = 50000; // ₹500 in paise = 50,000 paise
    const idempotencyKey = `pay-vendor-001-${Date.now()}`;

    // Send the first transfer
    const res1 = await request(app)
      .post('/transfers')
      .set('Authorization', `Bearer ${holderToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        type: 'transfer',
        fromAccountId: sender.id,
        toAccountId: vendor.id,
        amount: transferAmount,
        note: 'Payment to vendor 001',
      });

    expect(res1.status).toBe(200);
    expect(res1.body.success).toBe(true);

    // Send the same request again immediately
    const res2 = await request(app)
      .post('/transfers')
      .set('Authorization', `Bearer ${holderToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        type: 'transfer',
        fromAccountId: sender.id,
        toAccountId: vendor.id,
        amount: transferAmount,
        note: 'Payment to vendor 001',
      });

    expect(res2.status).toBe(200);
    expect(res2.body).toEqual(res1.body);

    // Check sender and vendor balances
    const senderAfter = await prisma.account.findUnique({ where: { id: sender.id } });
    const vendorAfter = await prisma.account.findUnique({ where: { id: vendor.id } });

    // Assert balance decreased by exactly ₹500 (50,000 paise, not 100,000 paise)
    expect(senderAfter!.balancePence).toBe(50000n);
    expect(vendorAfter!.balancePence).toBe(50000n);
  });

  /**
   * TEST 4 — Cross-user block:
   * - Authenticate as HOLDER (owns Account A).
   * - Attempt to withdraw from Account B (owned by admin only).
   * - Assert 403 and balance of Account B unchanged.
   */
  it('TEST 4: blocks HOLDER attempting to withdraw from Account B (owned by admin only)', async () => {
    // Find Account B owned only by admin
    const accountB = await prisma.account.findFirst({
      where: { name: 'Account B' },
    });
    expect(accountB).not.toBeNull();
    const balanceBefore = accountB!.balancePence;

    const res = await request(app)
      .post('/transfers')
      .set('Authorization', `Bearer ${holderToken}`)
      .set('Idempotency-Key', `cross-user-unauth-${Date.now()}`)
      .send({
        type: 'withdrawal',
        toAccountId: accountB!.id,
        amount: 1000,
        note: 'Unauthorized withdrawal attempt',
      });

    expect(res.status).toBe(403);

    // Balance of Account B must remain completely unchanged
    const accountBAfter = await prisma.account.findUnique({
      where: { id: accountB!.id },
    });
    expect(accountBAfter!.balancePence).toBe(balanceBefore);
  });
});

