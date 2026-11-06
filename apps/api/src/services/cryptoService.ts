import crypto from 'crypto';
import { Prisma, EntryType, EntryStatus } from '@prisma/client';

export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export interface EntryHashInput {
  prevHash: string;
  id: string;
  createdAt: Date;
  type: string;
  amountPence: bigint | string | number;
  debitAccountId?: string | null;
  creditAccountId?: string | null;
  runningBalance: bigint | string | number;
}

/**
 * Computes a deterministic SHA-256 seal for a ledger entry.
 * Links to prevHash to create a cryptographically tamper-evident block sequence.
 */
export function computeEntryHash(input: EntryHashInput): string {
  const amountStr = input.amountPence.toString();
  const runBalStr = input.runningBalance.toString();
  const debit = input.debitAccountId || 'null';
  const credit = input.creditAccountId || 'null';
  const timestamp = input.createdAt instanceof Date ? input.createdAt.toISOString() : new Date(input.createdAt).toISOString();

  const payload = `${input.prevHash}:${input.id}:${timestamp}:${input.type}:${amountStr}:${debit}:${credit}:${runBalStr}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

export interface ChainVerificationResult {
  verified: boolean;
  totalEntries: number;
  headHash: string | null;
  genesisHash: string;
  brokenAtId?: string;
  error?: string;
}

/**
 * Verifies the integrity of an ordered sequence of ledger entries.
 * Validates both the pointer continuity (prevHash matches previous entry's hash)
 * and the cryptographic payload integrity (hash matches recomputed SHA-256 seal).
 */
export function verifyLedgerHashChain(
  entries: Array<{
    id: string;
    createdAt: Date;
    type: string;
    amountPence: bigint | string | number;
    debitAccountId?: string | null;
    creditAccountId?: string | null;
    runningBalance: bigint | string | number;
    hash?: string | null;
    prevHash?: string | null;
  }>
): ChainVerificationResult {
  if (entries.length === 0) {
    return {
      verified: true,
      totalEntries: 0,
      headHash: GENESIS_HASH,
      genesisHash: GENESIS_HASH,
    };
  }

  let expectedPrevHash = GENESIS_HASH;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    // If an entry does not have a hash (legacy entries), continue checking once sealed entries start
    if (!entry.hash) {
      continue;
    }

    const entryPrevHash = entry.prevHash || GENESIS_HASH;

    // Check pointer continuity
    if (expectedPrevHash !== GENESIS_HASH && entryPrevHash !== expectedPrevHash) {
      return {
        verified: false,
        totalEntries: entries.length,
        headHash: null,
        genesisHash: GENESIS_HASH,
        brokenAtId: entry.id,
        error: `Broken hash chain pointer at entry ${entry.id}. Expected prevHash: ${expectedPrevHash}, found: ${entryPrevHash}`,
      };
    }

    // Verify cryptographic seal
    const recalculated = computeEntryHash({
      prevHash: entryPrevHash,
      id: entry.id,
      createdAt: entry.createdAt,
      type: entry.type,
      amountPence: entry.amountPence,
      debitAccountId: entry.debitAccountId,
      creditAccountId: entry.creditAccountId,
      runningBalance: entry.runningBalance,
    });

    if (recalculated !== entry.hash) {
      return {
        verified: false,
        totalEntries: entries.length,
        headHash: null,
        genesisHash: GENESIS_HASH,
        brokenAtId: entry.id,
        error: `Cryptographic seal mismatch at entry ${entry.id}. Recalculated: ${recalculated}, recorded: ${entry.hash}`,
      };
    }

    expectedPrevHash = entry.hash;
  }

  const latestEntry = entries[entries.length - 1];

  return {
    verified: true,
    totalEntries: entries.length,
    headHash: latestEntry?.hash || expectedPrevHash,
    genesisHash: GENESIS_HASH,
  };
}

export interface CreateSealedEntryData {
  id?: string;
  createdAt?: Date;
  type: EntryType;
  status?: EntryStatus;
  amountPence: bigint;
  debitAccountId?: string | null;
  creditAccountId?: string | null;
  initiatedById: string;
  idempotencyKeyId?: string | null;
  runningBalance: bigint;
  note?: string | null;
}

/**
 * Creates and cryptographically seals a ledger entry within a Prisma transaction or client.
 */
export async function createSealedLedgerEntry(
  client: Prisma.TransactionClient | Prisma.DefaultPrismaClient | any,
  data: CreateSealedEntryData
) {
  // Query for the latest entry hash to maintain cryptographic pointer continuity
  const latest = await client.ledgerEntry.findFirst({
    where: { hash: { not: null } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: { hash: true },
  });

  const prevHash = latest?.hash || GENESIS_HASH;
  const id = data.id || `entry_${crypto.randomUUID().replace(/-/g, '')}`;
  const createdAt = data.createdAt || new Date();
  const status = data.status || EntryStatus.POSTED;

  const hash = computeEntryHash({
    prevHash,
    id,
    createdAt,
    type: data.type,
    amountPence: data.amountPence,
    debitAccountId: data.debitAccountId,
    creditAccountId: data.creditAccountId,
    runningBalance: data.runningBalance,
  });

  return await client.ledgerEntry.create({
    data: {
      id,
      createdAt,
      type: data.type,
      status,
      amountPence: data.amountPence,
      debitAccountId: data.debitAccountId || null,
      creditAccountId: data.creditAccountId || null,
      initiatedById: data.initiatedById,
      idempotencyKeyId: data.idempotencyKeyId || null,
      runningBalance: data.runningBalance,
      note: data.note || null,
      prevHash,
      hash,
    },
  });
}
