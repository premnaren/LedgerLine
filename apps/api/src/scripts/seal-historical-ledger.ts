import { prisma } from '../config/db';
import crypto from 'crypto';

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

async function sealExisting() {
  const entries = await prisma.ledgerEntry.findMany({
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });
  console.log('Total entries to check:', entries.length);
  if (entries.length === 0) return;

  await prisma.$executeRawUnsafe('ALTER TABLE "LedgerEntry" DISABLE TRIGGER prevent_ledger_mutation');
  let prevHash = GENESIS_HASH;
  for (const entry of entries) {
    const amountStr = entry.amountPence.toString();
    const runBalStr = entry.runningBalance.toString();
    const debit = entry.debitAccountId || 'null';
    const credit = entry.creditAccountId || 'null';
    const timestamp = entry.createdAt.toISOString();
    const payload = `${prevHash}:${entry.id}:${timestamp}:${entry.type}:${amountStr}:${debit}:${credit}:${runBalStr}`;
    const hash = crypto.createHash('sha256').update(payload).digest('hex');

    await prisma.ledgerEntry.update({
      where: { id: entry.id },
      data: { prevHash, hash },
    });
    prevHash = hash;
  }
  await prisma.$executeRawUnsafe('ALTER TABLE "LedgerEntry" ENABLE TRIGGER prevent_ledger_mutation');
  console.log('Successfully sealed existing entries! Latest head hash:', prevHash);
  await prisma.$disconnect();
}

sealExisting().catch(console.error);
