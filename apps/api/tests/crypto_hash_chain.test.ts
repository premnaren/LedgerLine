import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/index';
import { prisma } from '../src/config/db';
import {
  computeEntryHash,
  verifyLedgerHashChain,
  GENESIS_HASH,
} from '../src/services/cryptoService';
import { reconcileAllAccounts } from '../src/services/reconciliationService';

describe('Cryptographic Hash Chain & Tamper-Evident Ledger', () => {
  let adminToken: string;
  let accountAId: string;
  let accountBId: string;

  beforeEach(async () => {
    // Authenticate as ADMIN
    const loginRes = await request(app).post('/auth/login').send({
      email: 'admin@ledgerline.dev',
      password: 'Admin1234!',
    });
    adminToken = loginRes.body.accessToken;

    const accs = await prisma.account.findMany({ take: 2, orderBy: { name: 'asc' } });
    accountAId = accs[0].id;
    accountBId = accs[1].id;
  });

  it('computes deterministic SHA-256 seal from entry attributes', () => {
    const fixedDate = new Date('2026-11-06T12:00:00.000Z');
    const hash1 = computeEntryHash({
      prevHash: GENESIS_HASH,
      id: 'entry_test_01',
      createdAt: fixedDate,
      type: 'TRANSFER_DEBIT',
      amountPence: 50000n,
      debitAccountId: 'acc_01',
      creditAccountId: 'acc_02',
      runningBalance: 950000n,
    });

    const hash2 = computeEntryHash({
      prevHash: GENESIS_HASH,
      id: 'entry_test_01',
      createdAt: fixedDate,
      type: 'TRANSFER_DEBIT',
      amountPence: 50000n,
      debitAccountId: 'acc_01',
      creditAccountId: 'acc_02',
      runningBalance: 950000n,
    });

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex string length
  });

  it('detects tampering when any attribute in a sealed entry is manipulated', () => {
    const date1 = new Date('2026-11-06T12:00:00.000Z');
    const date2 = new Date('2026-11-06T12:01:00.000Z');

    const entry1 = {
      id: 'e1',
      createdAt: date1,
      type: 'DEPOSIT',
      amountPence: 100000n,
      debitAccountId: null,
      creditAccountId: 'accA',
      runningBalance: 100000n,
      prevHash: GENESIS_HASH,
      hash: '',
    };
    entry1.hash = computeEntryHash(entry1);

    const entry2 = {
      id: 'e2',
      createdAt: date2,
      type: 'TRANSFER_DEBIT',
      amountPence: 20000n,
      debitAccountId: 'accA',
      creditAccountId: 'accB',
      runningBalance: 80000n,
      prevHash: entry1.hash,
      hash: '',
    };
    entry2.hash = computeEntryHash(entry2);

    // Initial valid chain
    const validResult = verifyLedgerHashChain([entry1, entry2]);
    expect(validResult.verified).toBe(true);
    expect(validResult.headHash).toBe(entry2.hash);

    // Tamper with entry1 amount (e.g. attacker modified 100000 to 150000)
    const tamperedEntry1 = { ...entry1, amountPence: 150000n };
    const tamperedResult = verifyLedgerHashChain([tamperedEntry1, entry2]);
    expect(tamperedResult.verified).toBe(false);
    expect(tamperedResult.brokenAtId).toBe('e1');
    expect(tamperedResult.error).toContain('Cryptographic seal mismatch');
  });

  it('detects broken pointer when an intermediate entry is deleted or skipped', () => {
    const date1 = new Date('2026-11-06T12:00:00.000Z');
    const date2 = new Date('2026-11-06T12:01:00.000Z');
    const date3 = new Date('2026-11-06T12:02:00.000Z');

    const e1 = {
      id: 'e1',
      createdAt: date1,
      type: 'DEPOSIT',
      amountPence: 100000n,
      debitAccountId: null,
      creditAccountId: 'accA',
      runningBalance: 100000n,
      prevHash: GENESIS_HASH,
      hash: '',
    };
    e1.hash = computeEntryHash(e1);

    const e2 = {
      id: 'e2',
      createdAt: date2,
      type: 'TRANSFER_DEBIT',
      amountPence: 10000n,
      debitAccountId: 'accA',
      creditAccountId: 'accB',
      runningBalance: 90000n,
      prevHash: e1.hash,
      hash: '',
    };
    e2.hash = computeEntryHash(e2);

    const e3 = {
      id: 'e3',
      createdAt: date3,
      type: 'TRANSFER_CREDIT',
      amountPence: 10000n,
      debitAccountId: 'accA',
      creditAccountId: 'accB',
      runningBalance: 10000n,
      prevHash: e2.hash,
      hash: '',
    };
    e3.hash = computeEntryHash(e3);

    // Skip e2 (simulating missing intermediate row)
    const skippedResult = verifyLedgerHashChain([e1, e3]);
    expect(skippedResult.verified).toBe(false);
    expect(skippedResult.brokenAtId).toBe('e3');
    expect(skippedResult.error).toContain('Broken hash chain pointer');
  });

  it('live transfer writes cryptographically sealed entries and verifies in reconcileAllAccounts', async () => {
    // Execute a live transfer via API
    const idempotencyKey = `crypto-test-${Date.now()}`;
    const transferRes = await request(app)
      .post('/transfers')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        type: 'transfer',
        fromAccountId: accountAId,
        toAccountId: accountBId,
        amount: '2500', // ₹25.00
        note: 'Cryptographic test transfer',
      });

    expect(transferRes.status).toBe(200);
    expect(transferRes.body.success).toBe(true);

    // Check system reconciliation with cryptographic verification
    const recon = await reconcileAllAccounts();
    expect(recon.allMatch).toBe(true);
    expect(recon.cryptographicIntegrity.verified).toBe(true);
    expect(recon.cryptographicIntegrity.headHash).toBeTruthy();
    expect(recon.cryptographicIntegrity.totalEntries).toBeGreaterThan(0);
  });
});
