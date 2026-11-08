import { Role, EntryType, EntryStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import prisma from '../config/db';
import logger from '../config/logger';

export async function autoSeedIfEmpty(): Promise<void> {
  try {
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      logger.info({ userCount }, 'Database already seeded. Skipping auto-seed.');
      return;
    }

    logger.info('Empty database detected. Running initial seed...');

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

    await prisma.user.upsert({
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
        balancePence: 1000000n, // ₹10,000 = 1,000,000 paise
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
        balancePence: 500000n, // ₹5,000 = 500,000 paise
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

    logger.info('Auto-seeding complete: Admin, Holder, Auditor and initial accounts created.');
  } catch (error) {
    logger.error({ err: error }, 'Error during database auto-seed');
  }
}
