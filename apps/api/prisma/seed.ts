import { PrismaClient, Role, EntryType, EntryStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const adminPasswordHash = await bcrypt.hash('Admin1234!', 10);
  const holderPasswordHash = await bcrypt.hash('Holder1234!', 10);
  const auditorPasswordHash = await bcrypt.hash('Audit1234!', 10);

  // 1. Create or upsert users
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

  console.log('Users created:');
  console.log(`- ADMIN: ${admin.email}`);
  console.log(`- HOLDER: ${holder.email}`);
  console.log(`- AUDITOR: ${auditor.email}`);

  // 2. Check if accounts already exist
  let accountA = await prisma.account.findFirst({
    where: { name: 'Account A' },
  });

  if (!accountA) {
    accountA = await prisma.account.create({
      data: {
        name: 'Account A',
        balancePence: 1000000n, // ₹10,000 = 1,000,000 paise
        overdraftLimit: 0n,
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
    console.log(`Created Account A: ₹10,000 owned by ${holder.email}`);
  }

  let accountB = await prisma.account.findFirst({
    where: { name: 'Account B' },
  });

  if (!accountB) {
    accountB = await prisma.account.create({
      data: {
        name: 'Account B',
        balancePence: 500000n, // ₹5,000 = 500,000 paise
        overdraftLimit: 0n,
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
    console.log(`Created Account B: ₹5,000 owned by ${admin.email}`);
  }

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
