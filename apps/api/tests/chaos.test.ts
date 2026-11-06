import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/index';
import { prisma } from '../src/config/db';
import { resetDatabase } from './helpers/resetDb';
import { reapStaleIdempotencyKeys } from '../src/services/idempotencyReaper';
import * as transferService from '../src/services/transferService';
import crypto from 'crypto';

describe('Chaos & Fault-Injection Invariant Suite', () => {
  let adminToken: string;
  let holderToken: string;
  let accountAId: string;
  let accountBId: string;

  beforeAll(async () => {
    const { accountA, accountB } = await resetDatabase();
    accountAId = accountA.id;
    accountBId = accountB.id;

    const adminLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@ledgerline.dev', password: 'Admin1234!' });
    adminToken = adminLogin.body.accessToken;

    const holderLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'holder@ledgerline.dev', password: 'Holder1234!' });
    holderToken = holderLogin.body.accessToken;
  });

  /**
   * 5.1 Simulated mid-transaction connection drop:
   * Assert rollback happens, zero ledger entries written, account balance untouched.
   */
  it('5.1: guarantees atomic rollback and zero balance mutation on mid-transaction connection drop', async () => {
    const accABefore = await prisma.account.findUnique({ where: { id: accountAId } });
    const accBBefore = await prisma.account.findUnique({ where: { id: accountBId } });
    const ledgerCountBefore = await prisma.ledgerEntry.count();

    const transferAmount = 5000n; // 5000 paise = ₹50

    // Simulate an unexpected connection drop or network partition right after balance deduction inside the transaction
    let transactionFailedAsExpected = false;
    try {
      await prisma.$transaction(
        async (tx) => {
          // 1. Deduct balance from A
          await tx.account.update({
            where: { id: accountAId },
            data: { balancePence: { decrement: transferAmount } },
          });

          // 2. Mid-transaction crash / connection severance
          throw new Error('CHAOS_SIMULATION: TCP socket connection abruptly terminated by peer');
        },
        { isolationLevel: 'Serializable' }
      );
    } catch (err: any) {
      if (err.message.includes('CHAOS_SIMULATION')) {
        transactionFailedAsExpected = true;
      }
    }

    expect(transactionFailedAsExpected).toBe(true);

    // Verify ACID Rollback: Balances must be 100% untouched
    const accAAfter = await prisma.account.findUnique({ where: { id: accountAId } });
    const accBAfter = await prisma.account.findUnique({ where: { id: accountBId } });
    const ledgerCountAfter = await prisma.ledgerEntry.count();

    expect(accAAfter!.balancePence).toBe(accABefore!.balancePence);
    expect(accBAfter!.balancePence).toBe(accBBefore!.balancePence);
    expect(ledgerCountAfter).toBe(ledgerCountBefore);
  });

  /**
   * 5.2 Simulated serialization failure storm:
   * Fire 100 concurrent transfers across 3 accounts with random delays.
   * Verify every request either succeeds or returns 409/retryable error (no 500, no corrupted balances),
   * and final sum across all accounts equals initial sum.
   */
  it('5.2: survives serialization failure storm under heavy concurrent load, preserving system-wide sum invariant', async () => {
    // Create Account C so we have a triangle topology (A -> B, B -> C, C -> A)
    const adminUser = await prisma.user.findUnique({ where: { email: 'admin@ledgerline.dev' } });
    const accountC = await prisma.account.create({
      data: {
        name: 'Chaos Triad Account C',
        balancePence: 500000n, // ₹5,000
        overdraftLimit: 0n,
        holders: {
          create: {
            userId: adminUser!.id,
          },
        },
      },
    });

    // Also write deposit ledger entry for Account C so it is double-entry consistent
    await prisma.ledgerEntry.create({
      data: {
        type: 'DEPOSIT',
        status: 'POSTED',
        amountPence: 500000n,
        creditAccountId: accountC.id,
        initiatedById: adminUser!.id,
        runningBalance: 500000n,
        note: 'Initial deposit for Chaos Account C',
      },
    });

    const accounts = [accountAId, accountBId, accountC.id];

    // Read initial sum across the 3 accounts
    const initialAccounts = await prisma.account.findMany({
      where: { id: { in: accounts } },
    });
    const initialSum = initialAccounts.reduce((acc, a) => acc + BigInt(a.balancePence), 0n);

    // Prepare 100 concurrent transfers between random pairs
    const TOTAL_TRANSFERS = 100;
    const transferPromises = Array.from({ length: TOTAL_TRANSFERS }, async (_, i) => {
      // Small random jitter between 0 and 25ms to induce unpredictable serialization collisions
      const jitter = Math.floor(Math.random() * 25);
      if (jitter > 0) {
        await new Promise((r) => setTimeout(r, jitter));
      }

      const fromIdx = i % accounts.length;
      const toIdx = (i + 1) % accounts.length;
      const fromAccountId = accounts[fromIdx];
      const toAccountId = accounts[toIdx];
      const idempotencyKey = `chaos-storm-${i}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

      return request(app)
        .post('/transfers')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          type: 'transfer',
          fromAccountId,
          toAccountId,
          amount: 100 + (i % 50), // ₹1 to ₹1.49 in paise
          note: `Storm txn #${i}`,
        });
    });

    const results = await Promise.all(transferPromises);

    // Validate that no unhandled server crash occurred (no 500)
    let successCount = 0;
    let conflictOrRateLimitCount = 0;

    for (const res of results) {
      if (res.status === 200) {
        successCount++;
        expect(res.body.success).toBe(true);
      } else if (res.status === 409 || res.status === 400 || res.status === 429) {
        conflictOrRateLimitCount++;
      } else {
        // Any status other than 200, 409, 400, or 429 is a defect under serialization storm
        expect([200, 409, 400, 429]).toContain(res.status);
      }
    }

    expect(successCount).toBeGreaterThan(0);

    // Crucial Conservation Check: The sum of balances MUST be 100% conserved
    const finalAccounts = await prisma.account.findMany({
      where: { id: { in: accounts } },
    });
    const finalSum = finalAccounts.reduce((acc, a) => acc + BigInt(a.balancePence), 0n);

    expect(finalSum).toBe(initialSum);
  }, 35000);

  /**
   * 5.3 Idempotency key reaper correctness:
   * Insert an idempotency key directly with status='PROCESSING' and createdAt = 10 minutes ago;
   * call reaper; assert status changed to 'FAILED'; call transfer endpoint with that key;
   * assert it succeeds rather than returning 409.
   */
  it('5.3: reaps stale PROCESSING key older than threshold to FAILED, allowing subsequent retry to succeed', async () => {
    const staleKey = `stale-reap-${Date.now()}`;
    const user = await prisma.user.findUnique({ where: { email: 'admin@ledgerline.dev' } });
    const keyId = crypto.randomUUID();

    // 1. Insert key with status='PROCESSING' and createdAt = 10 minutes ago
    await prisma.$executeRaw`
      INSERT INTO "IdempotencyKey" (id, "userId", key, status, "createdAt")
      VALUES (${keyId}, ${user!.id}, ${staleKey}, 'PROCESSING'::"IdempotencyStatus", NOW() - INTERVAL '10 minutes')
    `;

    // 2. Verify it is initially PROCESSING
    const initialKey = await prisma.idempotencyKey.findUnique({ where: { id: keyId } });
    expect(initialKey!.status).toBe('PROCESSING');

    // 3. Trigger reaper (stale threshold = 5 min)
    const reapedCount = await reapStaleIdempotencyKeys(5);
    expect(reapedCount).toBeGreaterThanOrEqual(1);

    // 4. Assert status changed to FAILED in database
    const reapedKey = await prisma.idempotencyKey.findUnique({ where: { id: keyId } });
    expect(reapedKey!.status).toBe('FAILED');
    expect(reapedKey!.httpStatus).toBe(504);

    // 5. Retrying with that exact same Idempotency-Key must succeed rather than returning 409
    const retryRes = await request(app)
      .post('/transfers')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Idempotency-Key', staleKey)
      .send({
        type: 'transfer',
        fromAccountId: accountAId,
        toAccountId: accountBId,
        amount: 1500, // ₹15
        note: 'Retry after reaper swept stuck processing key',
      });

    expect(retryRes.status).toBe(200);
    expect(retryRes.body.success).toBe(true);
    expect(retryRes.body.amountPence).toBe('1500');

    // Key should now be finalized to COMPLETE
    const finalizedKey = await prisma.idempotencyKey.findUnique({ where: { id: keyId } });
    expect(finalizedKey!.status).toBe('COMPLETE');
    expect(finalizedKey!.httpStatus).toBe(200);
  });

  /**
   * 5.4 Reconciliation drift detection:
   * Corrupt an account balance directly via raw SQL; call GET /accounts/:id/reconcile;
   * assert isBalanced is false, discrepancy is 1000; fix it via SQL; assert isBalanced is true again.
   */
  it('5.4: detects balance drift on raw SQL corruption and confirms restoration upon fix', async () => {
    // 1. Verify initially balanced
    const initialCheck = await request(app)
      .get(`/accounts/${accountAId}/reconcile`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(initialCheck.status).toBe(200);
    expect(initialCheck.body.matches).toBe(true);
    expect(initialCheck.body.discrepancyPence).toBe('0');

    // 2. Corrupt account balance directly via raw SQL by injecting 1000 paise (₹10)
    await prisma.$executeRaw`
      UPDATE "Account"
      SET "balancePence" = "balancePence" + 1000
      WHERE id = ${accountAId}
    `;

    // 3. Call reconcile endpoint -> must flag discrepancy
    const corruptedCheck = await request(app)
      .get(`/accounts/${accountAId}/reconcile`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(corruptedCheck.status).toBe(200);
    expect(corruptedCheck.body.matches).toBe(false);
    expect(corruptedCheck.body.isBalanced).toBe(false);
    expect(corruptedCheck.body.discrepancyPence).toBe('1000');

    // 4. Fix via SQL by subtracting 1000 paise
    await prisma.$executeRaw`
      UPDATE "Account"
      SET "balancePence" = "balancePence" - 1000
      WHERE id = ${accountAId}
    `;

    // 5. Re-check reconcile endpoint -> must be balanced again
    const restoredCheck = await request(app)
      .get(`/accounts/${accountAId}/reconcile`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(restoredCheck.status).toBe(200);
    expect(restoredCheck.body.matches).toBe(true);
    expect(restoredCheck.body.isBalanced).toBe(true);
    expect(restoredCheck.body.discrepancyPence).toBe('0');
  });
});
