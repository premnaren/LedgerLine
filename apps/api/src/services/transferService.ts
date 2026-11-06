import { Prisma, Role, EntryType, EntryStatus } from '@prisma/client';
import { prisma } from '../config/db';
import {
  InsufficientFundsError,
  UnauthorizedAccountAccessError,
  OptimisticLockError,
  AccountNotFoundError,
  InvalidAmountError,
} from './errors';
import { AuthUser } from '../types/express';

export interface TransferParams {
  type: 'deposit' | 'withdrawal' | 'transfer';
  fromAccountId?: string;
  toAccountId: string;
  amount: bigint;
  user: AuthUser;
  note?: string;
  idempotencyKeyId?: string;
}

interface LockedAccount {
  id: string;
  balancePence: bigint;
  overdraftLimit: bigint;
  version: number;
}

const MAX_RETRIES = 3;

/**
 * Check if the user is authorized to debit the given account.
 * ADMIN can debit any account.
 * HOLDER can only debit accounts where they are a registered holder.
 * AUDITOR cannot initiate debit/credits.
 */
async function verifyDebitAuthorization(
  tx: Prisma.TransactionClient,
  accountId: string,
  user: AuthUser
) {
  if (user.role === Role.AUDITOR) {
    throw new UnauthorizedAccountAccessError('Auditors are read-only and cannot move money');
  }

  if (user.role === Role.ADMIN) {
    return true;
  }

  // HOLDER check: query AccountHolder inside the transaction/service
  const holder = await tx.accountHolder.findUnique({
    where: {
      userId_accountId: {
        userId: user.userId,
        accountId,
      },
    },
  });

  if (!holder) {
    throw new UnauthorizedAccountAccessError('Forbidden: You do not own the debit account');
  }

  return true;
}

/**
 * Core money movement function with retries on optimistic lock conflicts.
 */
export async function executeTransfer(params: TransferParams) {
  const { type, fromAccountId, toAccountId, amount, user, note, idempotencyKeyId } = params;

  if (amount <= 0n) {
    throw new InvalidAmountError('Amount must be positive');
  }

  if (amount > 10000000n && user.role !== Role.ADMIN) {
    throw new InvalidAmountError('Transfers over ₹100,000 (10,000,000 paise) require ADMIN role');
  }

  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    try {
      if (type === 'transfer') {
        if (!fromAccountId) {
          throw new InvalidAmountError('fromAccountId is required for transfer');
        }
        if (fromAccountId === toAccountId) {
          throw new InvalidAmountError('fromAccountId and toAccountId must be different');
        }
        return await executeInternalTransfer({
          debitId: fromAccountId,
          creditId: toAccountId,
          amount,
          user,
          note,
          idempotencyKeyId,
        });
      } else if (type === 'withdrawal') {
        const accountId = fromAccountId || toAccountId;
        return await executeWithdrawal({
          accountId,
          amount,
          user,
          note,
          idempotencyKeyId,
        });
      } else if (type === 'deposit') {
        return await executeDeposit({
          accountId: toAccountId,
          amount,
          user,
          note,
          idempotencyKeyId,
        });
      } else {
        throw new InvalidAmountError(`Unsupported transfer type: ${type}`);
      }
    } catch (err: any) {
      if (err instanceof OptimisticLockError && attempt < MAX_RETRIES - 1) {
        attempt++;
        // Jittered backoff (10-50ms)
        const delay = Math.floor(Math.random() * 40) + 10;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }

  throw new OptimisticLockError('Transaction failed after maximum retries');
}

/**
 * Double-entry transfer between two accounts
 */
async function executeInternalTransfer({
  debitId,
  creditId,
  amount,
  user,
  note,
  idempotencyKeyId,
}: {
  debitId: string;
  creditId: string;
  amount: bigint;
  user: AuthUser;
  note?: string;
  idempotencyKeyId?: string;
}) {
  return await prisma.$transaction(
    async (tx) => {
      // 0. Verify authorization inside service
      await verifyDebitAuthorization(tx, debitId, user);

      // 1. Lock both accounts in a consistent order (always lower ID first)
      // to prevent deadlocks between concurrent transfers
      const sortedIds = [debitId, creditId].sort();
      const firstId = sortedIds[0];
      const secondId = sortedIds[1];

      const rawAccounts = await tx.$queryRaw<LockedAccount[]>`
        SELECT id, "balancePence", "overdraftLimit", version
        FROM "Account"
        WHERE id IN (${firstId}, ${secondId})
        ORDER BY id ASC
        FOR UPDATE
      `;

      if (rawAccounts.length !== 2) {
        throw new AccountNotFoundError('One or both accounts could not be found');
      }

      const debitAccount = rawAccounts.find((a) => a.id === debitId)!;
      const creditAccount = rawAccounts.find((a) => a.id === creditId)!;

      // 2. Check balance (inside the lock — never outside)
      const newDebitBalance = BigInt(debitAccount.balancePence) - amount;
      const minAllowedBalance = -BigInt(debitAccount.overdraftLimit);

      if (newDebitBalance < minAllowedBalance) {
        // Write a REFUSED ledger entry in an isolated call or save before throwing
        // Note: within a rolled back txn, entry won't persist, so write outside or log
        await writeRefusedEntry(
          debitId,
          creditId,
          amount,
          user.userId,
          idempotencyKeyId,
          BigInt(debitAccount.balancePence),
          note || 'Insufficient funds'
        );
        throw new InsufficientFundsError('Insufficient funds for transfer');
      }

      // 3. Update balances using optimistic version increment
      const debitUpdate = await tx.account.updateMany({
        where: { id: debitId, version: debitAccount.version },
        data: {
          balancePence: { decrement: amount },
          version: { increment: 1 },
        },
      });

      const creditUpdate = await tx.account.updateMany({
        where: { id: creditId, version: creditAccount.version },
        data: {
          balancePence: { increment: amount },
          version: { increment: 1 },
        },
      });

      // 5. If version mismatch, throw OptimisticLockError
      if (debitUpdate.count === 0 || creditUpdate.count === 0) {
        throw new OptimisticLockError();
      }

      const newCreditBalance = BigInt(creditAccount.balancePence) + amount;

      // 4. Write two ledger entries: TRANSFER_DEBIT and TRANSFER_CREDIT
      const debitEntry = await tx.ledgerEntry.create({
        data: {
          type: EntryType.TRANSFER_DEBIT,
          status: EntryStatus.POSTED,
          amountPence: amount,
          debitAccountId: debitId,
          creditAccountId: creditId,
          initiatedById: user.userId,
          idempotencyKeyId: idempotencyKeyId || null,
          runningBalance: newDebitBalance,
          note: note || `Transfer to ${creditId}`,
        },
      });

      const creditEntry = await tx.ledgerEntry.create({
        data: {
          type: EntryType.TRANSFER_CREDIT,
          status: EntryStatus.POSTED,
          amountPence: amount,
          debitAccountId: debitId,
          creditAccountId: creditId,
          initiatedById: user.userId,
          idempotencyKeyId: idempotencyKeyId || null,
          runningBalance: newCreditBalance,
          note: note || `Transfer from ${debitId}`,
        },
      });

      return {
        success: true,
        type: 'transfer',
        debitAccountId: debitId,
        creditAccountId: creditId,
        amountPence: amount.toString(),
        debitRunningBalance: newDebitBalance.toString(),
        creditRunningBalance: newCreditBalance.toString(),
        debitEntryId: debitEntry.id,
        creditEntryId: creditEntry.id,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

/**
 * Withdrawal from single account
 */
async function executeWithdrawal({
  accountId,
  amount,
  user,
  note,
  idempotencyKeyId,
}: {
  accountId: string;
  amount: bigint;
  user: AuthUser;
  note?: string;
  idempotencyKeyId?: string;
}) {
  return await prisma.$transaction(
    async (tx) => {
      // 0. Verify authorization
      await verifyDebitAuthorization(tx, accountId, user);

      // 1. Lock account
      const rawAccounts = await tx.$queryRaw<LockedAccount[]>`
        SELECT id, "balancePence", "overdraftLimit", version
        FROM "Account"
        WHERE id = ${accountId}
        FOR UPDATE
      `;

      if (rawAccounts.length !== 1) {
        throw new AccountNotFoundError('Account not found');
      }

      const account = rawAccounts[0];
      const newBalance = BigInt(account.balancePence) - amount;
      const minAllowedBalance = -BigInt(account.overdraftLimit);

      // 2. Check balance
      if (newBalance < minAllowedBalance) {
        await writeRefusedEntry(
          accountId,
          null,
          amount,
          user.userId,
          idempotencyKeyId,
          BigInt(account.balancePence),
          note || 'Insufficient funds for withdrawal'
        );
        throw new InsufficientFundsError('Insufficient funds for withdrawal');
      }

      // 3. Update balance
      const updateResult = await tx.account.updateMany({
        where: { id: accountId, version: account.version },
        data: {
          balancePence: { decrement: amount },
          version: { increment: 1 },
        },
      });

      if (updateResult.count === 0) {
        throw new OptimisticLockError();
      }

      // 4. Ledger entry
      const entry = await tx.ledgerEntry.create({
        data: {
          type: EntryType.WITHDRAWAL,
          status: EntryStatus.POSTED,
          amountPence: amount,
          debitAccountId: accountId,
          initiatedById: user.userId,
          idempotencyKeyId: idempotencyKeyId || null,
          runningBalance: newBalance,
          note: note || 'Withdrawal',
        },
      });

      return {
        success: true,
        type: 'withdrawal',
        accountId,
        amountPence: amount.toString(),
        runningBalance: newBalance.toString(),
        entryId: entry.id,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

/**
 * Deposit into single account
 */
async function executeDeposit({
  accountId,
  amount,
  user,
  note,
  idempotencyKeyId,
}: {
  accountId: string;
  amount: bigint;
  user: AuthUser;
  note?: string;
  idempotencyKeyId?: string;
}) {
  if (user.role === Role.AUDITOR) {
    throw new UnauthorizedAccountAccessError('Auditors are read-only');
  }

  return await prisma.$transaction(
    async (tx) => {
      // 1. Lock account
      const rawAccounts = await tx.$queryRaw<LockedAccount[]>`
        SELECT id, "balancePence", "overdraftLimit", version
        FROM "Account"
        WHERE id = ${accountId}
        FOR UPDATE
      `;

      if (rawAccounts.length !== 1) {
        throw new AccountNotFoundError('Account not found');
      }

      const account = rawAccounts[0];
      const newBalance = BigInt(account.balancePence) + amount;

      // 2. Update balance
      const updateResult = await tx.account.updateMany({
        where: { id: accountId, version: account.version },
        data: {
          balancePence: { increment: amount },
          version: { increment: 1 },
        },
      });

      if (updateResult.count === 0) {
        throw new OptimisticLockError();
      }

      // 3. Ledger entry
      const entry = await tx.ledgerEntry.create({
        data: {
          type: EntryType.DEPOSIT,
          status: EntryStatus.POSTED,
          amountPence: amount,
          creditAccountId: accountId,
          initiatedById: user.userId,
          idempotencyKeyId: idempotencyKeyId || null,
          runningBalance: newBalance,
          note: note || 'Deposit',
        },
      });

      return {
        success: true,
        type: 'deposit',
        accountId,
        amountPence: amount.toString(),
        runningBalance: newBalance.toString(),
        entryId: entry.id,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

/**
 * Write a REFUSED ledger entry that persists even when the main transaction aborts.
 */
async function writeRefusedEntry(
  debitAccountId: string | null,
  creditAccountId: string | null,
  amountPence: bigint,
  initiatedById: string,
  idempotencyKeyId: string | undefined,
  runningBalance: bigint,
  note: string
) {
  try {
    await prisma.ledgerEntry.create({
      data: {
        type: debitAccountId && creditAccountId ? EntryType.TRANSFER_DEBIT : EntryType.WITHDRAWAL,
        status: EntryStatus.REFUSED,
        amountPence,
        debitAccountId,
        creditAccountId,
        initiatedById,
        idempotencyKeyId: idempotencyKeyId || null,
        runningBalance,
        note,
      },
    });
  } catch (err) {
    console.error('Failed to write REFUSED ledger entry:', err);
  }
}
