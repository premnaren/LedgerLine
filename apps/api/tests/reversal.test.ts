import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/index';
import { prisma } from '../src/config/db';
import { resetDatabase } from './helpers/resetDb';

describe('Admin Compensating Reversal Workflow Suite', () => {
  let adminToken: string;
  let holderToken: string;
  let auditorToken: string;
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

    const auditorLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'auditor@ledgerline.dev', password: 'Audit1234!' });
    auditorToken = auditorLogin.body.accessToken;
  });

  it('rejects reversal attempts by non-ADMIN roles (HOLDER and AUDITOR) with 403 Forbidden', async () => {
    // Attempt with dummy entry ID
    const holderRes = await request(app)
      .post('/transfers/dummy-entry-id/reverse')
      .set('Authorization', `Bearer ${holderToken}`)
      .send({ reason: 'Holder attempted reversal' });

    expect(holderRes.status).toBe(403);

    const auditorRes = await request(app)
      .post('/transfers/dummy-entry-id/reverse')
      .set('Authorization', `Bearer ${auditorToken}`)
      .send({ reason: 'Auditor attempted reversal' });

    expect(auditorRes.status).toBe(403);
  });

  it('executes compensating-entry reversal of a transfer, restoring net-zero balance shift while preserving immutable entries', async () => {
    // 1. Capture initial balances
    const accABefore = await prisma.account.findUnique({ where: { id: accountAId } });
    const accBBefore = await prisma.account.findUnique({ where: { id: accountBId } });
    const initialBalanceA = BigInt(accABefore!.balancePence);
    const initialBalanceB = BigInt(accBBefore!.balancePence);

    const transferAmount = 25000; // ₹250.00 = 25,000 paise

    // 2. Perform a transfer from Account A to Account B
    const transferRes = await request(app)
      .post('/transfers')
      .set('Authorization', `Bearer ${holderToken}`)
      .set('Idempotency-Key', `transfer-for-reversal-${Date.now()}`)
      .send({
        type: 'transfer',
        fromAccountId: accountAId,
        toAccountId: accountBId,
        amount: transferAmount,
        note: 'Payment to reverse',
      });

    expect(transferRes.status).toBe(200);
    expect(transferRes.body.success).toBe(true);

    const debitEntryId = transferRes.body.debitEntryId;
    expect(debitEntryId).toBeDefined();

    // Verify post-transfer balances
    const accAMid = await prisma.account.findUnique({ where: { id: accountAId } });
    const accBMid = await prisma.account.findUnique({ where: { id: accountBId } });
    expect(BigInt(accAMid!.balancePence)).toBe(initialBalanceA - BigInt(transferAmount));
    expect(BigInt(accBMid!.balancePence)).toBe(initialBalanceB + BigInt(transferAmount));

    // 3. ADMIN initiates compensating reversal of the debit entry
    const reversalRes = await request(app)
      .post(`/transfers/${debitEntryId}/reverse`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Idempotency-Key', `reversal-key-${Date.now()}`)
      .send({ reason: 'Erroneous billing chargeback' });

    expect(reversalRes.status).toBe(200);
    expect(reversalRes.body.success).toBe(true);
    expect(reversalRes.body.reversedEntryId).toBe(debitEntryId);

    // 4. Net Zero Assertion: Balances must return EXACTLY to initial state
    const accAAfter = await prisma.account.findUnique({ where: { id: accountAId } });
    const accBAfter = await prisma.account.findUnique({ where: { id: accountBId } });
    expect(BigInt(accAAfter!.balancePence)).toBe(initialBalanceA);
    expect(BigInt(accBAfter!.balancePence)).toBe(initialBalanceB);

    // 5. Immutability Assertion: Original ledger entries must still exist unmodified!
    const originalDebit = await prisma.ledgerEntry.findUnique({ where: { id: debitEntryId } });
    expect(originalDebit).not.toBeNull();
    expect(originalDebit!.status).toBe('POSTED');
    expect(originalDebit!.amountPence).toBe(BigInt(transferAmount));

    // 6. Statement verification: statement includes both original transfer and linked reversal
    const statementRes = await request(app)
      .get(`/accounts/${accountAId}/statement`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(statementRes.status).toBe(200);
    const notes = statementRes.body.entries.map((e: any) => e.note);
    expect(notes.some((n: string) => n.includes('Payment to reverse'))).toBe(true);
    expect(notes.some((n: string) => n.includes(`Reversal of entry ${debitEntryId}`))).toBe(true);
  });

  it('rejects double-reversal of an already-reversed entry with 400 Bad Request', async () => {
    // 1. Perform a deposit
    const depositAmount = 10000; // ₹100
    const depositRes = await request(app)
      .post('/transfers')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Idempotency-Key', `deposit-for-double-rev-${Date.now()}`)
      .send({
        type: 'deposit',
        toAccountId: accountAId,
        amount: depositAmount,
        note: 'Deposit to test double reversal',
      });

    expect(depositRes.status).toBe(200);
    const entryId = depositRes.body.entryId;
    expect(entryId).toBeDefined();

    // 2. First reversal -> must succeed
    const firstRev = await request(app)
      .post(`/transfers/${entryId}/reverse`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Idempotency-Key', `first-rev-${Date.now()}`)
      .send({ reason: 'Initial reversal' });

    expect(firstRev.status).toBe(200);

    // 3. Second reversal of the same entry -> MUST fail with 400
    const secondRev = await request(app)
      .post(`/transfers/${entryId}/reverse`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Idempotency-Key', `second-rev-${Date.now()}`)
      .send({ reason: 'Duplicate reversal attempt' });

    expect(secondRev.status).toBe(400);
    expect(secondRev.body.error).toMatch(/already been reversed/i);
  });
});
