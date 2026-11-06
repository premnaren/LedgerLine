import { prisma } from '../../src/config/db';
import { Role, EntryType, EntryStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

/**
 * Resets the PostgreSQL database to a clean, deterministic seed state.
 * Called in beforeAll of integration test suites so every suite executes against
 * known balances and seeded accounts, eliminating cross-suite state leakage.
 */
export async function resetDatabase() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "LedgerEntry", "AccountHolder", "Account", "IdempotencyKey", "RefreshToken" CASCADE;'
  );

  const adminPasswordHash = await bcrypt.hash('Admin1234!', 10);
  const holderPasswordHash = await bcrypt.hash('Holder1234!', 10);
  const auditorPasswordHash = await bcrypt.hash('Audit1234!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@ledgerline.dev' },
    update: { passwordHash: adminPasswordHash, role: Role.ADMIN },
    create: {
      email: 'admin@ledgerline.dev',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });

  const holder = await prisma.user.upsert({
    where: { email: 'holder@ledgerline.dev' },
    update: { passwordHash: holderPasswordHash, role: Role.HOLDER },
    create: {
      email: 'holder@ledgerline.dev',
      passwordHash: holderPasswordHash,
      role: Role.HOLDER,
    },
  });

  const auditor = await prisma.user.upsert({
    where: { email: 'auditor@ledgerline.dev' },
    update: { passwordHash: auditorPasswordHash, role: Role.AUDITOR },
    create: {
      email: 'auditor@ledgerline.dev',
      passwordHash: auditorPasswordHash,
      role: Role.AUDITOR,
    },
  });

  const accountA = await prisma.account.create({
    data: {
      name: 'Account A',
      balancePence: 1000000n, // ₹10,000.00
      overdraftLimit: 0n,
      version: 1,
      holders: {
        create: {
          userId: holder.id,
        },
      },
    },
  });

  await prisma.ledgerEntry.create({
    data: {
      type: EntryType.DEPOSIT,
      status: EntryStatus.POSTED,
      amountPence: 1000000n,
      creditAccountId: accountA.id,
      initiatedById: admin.id,
      runningBalance: 1000000n,
      note: 'Initial deposit for Account A',
    },
  });

  const accountB = await prisma.account.create({
    data: {
      name: 'Account B',
      balancePence: 500000n, // ₹5,000.00
      overdraftLimit: 0n,
      version: 1,
      holders: {
        create: {
          userId: admin.id,
        },
      },
    },
  });

  await prisma.ledgerEntry.create({
    data: {
      type: EntryType.DEPOSIT,
      status: EntryStatus.POSTED,
      amountPence: 500000n,
      creditAccountId: accountB.id,
      initiatedById: admin.id,
      runningBalance: 500000n,
      note: 'Initial deposit for Account B',
    },
  });

  return {
    admin,
    holder,
    auditor,
    accountA,
    accountB,
  };
}
