import { Prisma, Role, EntryType, EntryStatus } from '@prisma/client';
import { prisma } from '../config/db';
import {
  InsufficientFundsError,
  UnauthorizedAccountAccessError,
  OptimisticLockError,
  AccountNotFoundError,
  InvalidAmountError,
  ReversalAlreadyProcessedError,
  LedgerError,
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

const MAX_RETRIES = 25;

/**
 * In-process lock manager to prevent thundering-herd SSI abort storms
 * while preserving full database-level Serializable isolation & SELECT FOR UPDATE.
 */
class AccountLockManager {
  private locks = new Map<string, Promise<void>>();

  async acquire(accountIds: string[]): Promise<() => void> {
    const sorted = [...new Set(accountIds)].sort();
    const releaseFns: (() => void)[] = [];

    for (const id of sorted) {
      const currentLock = this.locks.get(id) || Promise.resolve();
      let releaseThisLock!: () => void;
      const nextLock = new Promise<void>((resolve) => {
        releaseThisLock = resolve;
      });
      this.locks.set(id, nextLock);
      await currentLock;
      releaseFns.push(() => {
        releaseThisLock();
        if (this.locks.get(id) === nextLock) {
          this.locks.delete(id);
        }
      });
    }

    return () => {
      while (releaseFns.length) {
        releaseFns.pop()!();
      }
    };
  }
}

const lockManager = new AccountLockManager();

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
 * Check if user is authorized to credit/deposit into given account.
 * ADMIN can deposit into any account.
 * HOLDER can only deposit into accounts where they are a registered holder.
 * AUDITOR is strictly read-only.
 */
async function verifyCreditAuthorization(
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
    throw new UnauthorizedAccountAccessError('Forbidden: You do not own the deposit account');
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
      if (err instanceof InsufficientFundsError) {
        const debitId = type === 'transfer' ? fromAccountId! : (fromAccountId || toAccountId);
        const creditId = type === 'transfer' ? toAccountId : null;
        await writeRefusedEntry(
          debitId,
          creditId,
          amount,
          user.userId,
          idempotencyKeyId,
          err.runningBalance,
          note || 'Insufficient funds'
        );
        throw err;
      }

      const isConflict =
        err instanceof OptimisticLockError ||
        err?.code === 'P2034' ||
        err?.code === 'P2010' ||
        err?.code === 'P2028' ||
        err?.message?.includes('could not serialize') ||
        err?.message?.includes('write conflict') ||
        err?.message?.includes('expired transaction') ||
        err?.message?.includes('Transaction already closed');

      if (isConflict && attempt < MAX_RETRIES - 1) {
        attempt++;
        // Exponential backoff with jitter
        const baseDelay = Math.min(20 * Math.pow(1.4, attempt), 200);
        const jitter = Math.floor(Math.random() * 50);
        await new Promise((resolve) => setTimeout(resolve, baseDelay + jitter));
        continue;
      }
      throw err;
    }
  }

  throw new OptimisticLockError('Transaction failed after maximum retries');
}

/**
 * Exported standalone helper for deposit
 */
export async function deposit(
  accountId: string,
  amount: bigint,
  user: AuthUser,
  note?: string,
  idempotencyKeyId?: string
) {
  return executeTransfer({
    type: 'deposit',
    toAccountId: accountId,
    amount,
    user,
    note,
    idempotencyKeyId,
  });
}

/**
 * Exported standalone helper for withdraw
 */
export async function withdraw(
  accountId: string,
  amount: bigint,
  user: AuthUser,
  note?: string,
  idempotencyKeyId?: string
) {
  return executeTransfer({
    type: 'withdrawal',
    toAccountId: accountId,
    amount,
    user,
    note,
    idempotencyKeyId,
  });
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
  const release = await lockManager.acquire([debitId, creditId]);
  try {
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
        throw new InsufficientFundsError(
          'Insufficient funds for transfer',
          BigInt(debitAccount.balancePence)
        );
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
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 15000,
      timeout: 25000,
    }
  );
  } finally {
    release();
  }
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
  const release = await lockManager.acquire([accountId]);
  try {
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
        throw new InsufficientFundsError(
          'Insufficient funds for withdrawal',
          BigInt(account.balancePence)
        );
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
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 15000,
      timeout: 25000,
    }
  );
  } finally {
    release();
  }
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

  const release = await lockManager.acquire([accountId]);
  try {
    return await prisma.$transaction(
    async (tx) => {
      // 0. Verify deposit authorization
      await verifyCreditAuthorization(tx, accountId, user);

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
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 15000,
      timeout: 25000,
    }
  );
  } finally {
    release();
  }
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

/**
 * Reverses a posted ledger entry by appending compensating ADJUSTMENT entries
 * and restoring account balances inside a Serializable transaction with FOR UPDATE locks.
 * Guarantees that LedgerEntry remains 100% append-only and immutable.
 */
export async function reverseLedgerEntry(
  entryId: string,
  user: AuthUser,
  reason?: string,
  idempotencyKeyId?: string
) {
  // 1. Authorization: ADMIN only
  if (user.role !== Role.ADMIN) {
    throw new UnauthorizedAccountAccessError('Only ADMIN can perform ledger reversals');
  }

  // 2. Fetch original entry
  const originalEntry = await prisma.ledgerEntry.findUnique({
    where: { id: entryId },
  });

  if (!originalEntry) {
    throw new AccountNotFoundError('Ledger entry to reverse not found');
  }

  if (originalEntry.status !== EntryStatus.POSTED) {
    throw new LedgerError('Cannot reverse a non-POSTED entry', 400);
  }

  if (originalEntry.type === EntryType.ADJUSTMENT && originalEntry.note?.includes('Reversal of entry')) {
    throw new LedgerError('Cannot reverse a reversal adjustment entry directly', 400);
  }

  // 3. Double-reversal check: has this entry already been reversed?
  const existingReversal = await prisma.ledgerEntry.findFirst({
    where: {
      type: EntryType.ADJUSTMENT,
      note: { contains: `Reversal of entry ${entryId}` },
    },
  });

  if (existingReversal) {
    throw new ReversalAlreadyProcessedError(`Entry ${entryId} has already been reversed`);
  }

  // Also check if this entry was part of a paired transfer and its sibling was reversed
  let siblingEntryId: string | null = null;
  if (
    (originalEntry.type === EntryType.TRANSFER_DEBIT || originalEntry.type === EntryType.TRANSFER_CREDIT) &&
    originalEntry.debitAccountId &&
    originalEntry.creditAccountId
  ) {
    const siblingType =
      originalEntry.type === EntryType.TRANSFER_DEBIT
        ? EntryType.TRANSFER_CREDIT
        : EntryType.TRANSFER_DEBIT;

    const sibling = await prisma.ledgerEntry.findFirst({
      where: {
        type: siblingType,
        amountPence: originalEntry.amountPence,
        debitAccountId: originalEntry.debitAccountId,
        creditAccountId: originalEntry.creditAccountId,
        idempotencyKeyId: originalEntry.idempotencyKeyId,
        NOT: { id: originalEntry.id },
      },
    });

    if (sibling) {
      siblingEntryId = sibling.id;
      const siblingReversal = await prisma.ledgerEntry.findFirst({
        where: {
          type: EntryType.ADJUSTMENT,
          note: { contains: `Reversal of entry ${sibling.id}` },
        },
      });
      if (siblingReversal) {
        throw new ReversalAlreadyProcessedError(`Transfer for entry ${entryId} has already been reversed`);
      }
    }
  }

  const amount = BigInt(originalEntry.amountPence);
  const noteReference = `Reversal of entry ${entryId}${reason ? `: ${reason}` : ''}`;

  // 4. Handle based on original entry type
  if (
    (originalEntry.type === EntryType.TRANSFER_DEBIT || originalEntry.type === EntryType.TRANSFER_CREDIT) &&
    originalEntry.debitAccountId &&
    originalEntry.creditAccountId
  ) {
    const originalDebitId = originalEntry.debitAccountId;
    const originalCreditId = originalEntry.creditAccountId;

    const release = await lockManager.acquire([originalDebitId, originalCreditId]);
    try {
      return await prisma.$transaction(
        async (tx) => {
          const sortedIds = [originalDebitId, originalCreditId].sort();
          const rawAccounts = await tx.$queryRaw<LockedAccount[]>`
            SELECT id, "balancePence", "overdraftLimit", version
            FROM "Account"
            WHERE id IN (${sortedIds[0]}, ${sortedIds[1]})
            ORDER BY id ASC
            FOR UPDATE
          `;

          if (rawAccounts.length !== 2) {
            throw new AccountNotFoundError('One or both accounts could not be found');
          }

          const debitAccount = rawAccounts.find((a) => a.id === originalDebitId)!;
          const creditAccount = rawAccounts.find((a) => a.id === originalCreditId)!;

          // Reversal means:
          // Debit the account that originally received the credit (creditAccount)
          // Credit the account that originally was debited (debitAccount)
          const newCreditAccountBalance = BigInt(creditAccount.balancePence) - amount;
          const minAllowedBalance = -BigInt(creditAccount.overdraftLimit);

          if (newCreditAccountBalance < minAllowedBalance) {
            throw new InsufficientFundsError(
              'Insufficient funds in receiving account to process reversal',
              BigInt(creditAccount.balancePence)
            );
          }

          const newDebitAccountBalance = BigInt(debitAccount.balancePence) + amount;

          // Update balances
          await tx.account.update({
            where: { id: originalCreditId },
            data: {
              balancePence: { decrement: amount },
              version: { increment: 1 },
            },
          });

          await tx.account.update({
            where: { id: originalDebitId },
            data: {
              balancePence: { increment: amount },
              version: { increment: 1 },
            },
          });

          // Write compensating ADJUSTMENT entries
          const compensatingDebit = await tx.ledgerEntry.create({
            data: {
              type: EntryType.ADJUSTMENT,
              status: EntryStatus.POSTED,
              amountPence: amount,
              debitAccountId: originalCreditId,
              initiatedById: user.userId,
              idempotencyKeyId: idempotencyKeyId || null,
              runningBalance: newCreditAccountBalance,
              note: noteReference,
            },
          });

          const compensatingCredit = await tx.ledgerEntry.create({
            data: {
              type: EntryType.ADJUSTMENT,
              status: EntryStatus.POSTED,
              amountPence: amount,
              creditAccountId: originalDebitId,
              initiatedById: user.userId,
              idempotencyKeyId: idempotencyKeyId || null,
              runningBalance: newDebitAccountBalance,
              note: noteReference,
            },
          });

          return {
            success: true,
            reversedEntryId: entryId,
            siblingEntryId,
            compensatingDebitEntryId: compensatingDebit.id,
            compensatingCreditEntryId: compensatingCredit.id,
            amountPence: amount.toString(),
            message: 'Transfer reversed via compensating adjustment entries',
          };
        },
        { isolationLevel: 'Serializable', maxWait: 15000, timeout: 25000 }
      );
    } finally {
      release();
    }
  } else if (originalEntry.type === EntryType.DEPOSIT && originalEntry.creditAccountId) {
    // Reversal of DEPOSIT: debit the credit account
    const accountId = originalEntry.creditAccountId;
    const release = await lockManager.acquire([accountId]);
    try {
      return await prisma.$transaction(
        async (tx) => {
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
          if (newBalance < -BigInt(account.overdraftLimit)) {
            throw new InsufficientFundsError('Insufficient funds to reverse deposit', BigInt(account.balancePence));
          }

          await tx.account.update({
            where: { id: accountId },
            data: {
              balancePence: { decrement: amount },
              version: { increment: 1 },
            },
          });

          const compensatingEntry = await tx.ledgerEntry.create({
            data: {
              type: EntryType.ADJUSTMENT,
              status: EntryStatus.POSTED,
              amountPence: amount,
              debitAccountId: accountId,
              initiatedById: user.userId,
              idempotencyKeyId: idempotencyKeyId || null,
              runningBalance: newBalance,
              note: noteReference,
            },
          });

          return {
            success: true,
            reversedEntryId: entryId,
            compensatingEntryId: compensatingEntry.id,
            amountPence: amount.toString(),
            message: 'Deposit reversed via compensating adjustment entry',
          };
        },
        { isolationLevel: 'Serializable', maxWait: 15000, timeout: 25000 }
      );
    } finally {
      release();
    }
  } else if (originalEntry.type === EntryType.WITHDRAWAL && originalEntry.debitAccountId) {
    // Reversal of WITHDRAWAL: credit the debit account
    const accountId = originalEntry.debitAccountId;
    const release = await lockManager.acquire([accountId]);
    try {
      return await prisma.$transaction(
        async (tx) => {
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

          await tx.account.update({
            where: { id: accountId },
            data: {
              balancePence: { increment: amount },
              version: { increment: 1 },
            },
          });

          const compensatingEntry = await tx.ledgerEntry.create({
            data: {
              type: EntryType.ADJUSTMENT,
              status: EntryStatus.POSTED,
              amountPence: amount,
              creditAccountId: accountId,
              initiatedById: user.userId,
              idempotencyKeyId: idempotencyKeyId || null,
              runningBalance: newBalance,
              note: noteReference,
            },
          });

          return {
            success: true,
            reversedEntryId: entryId,
            compensatingEntryId: compensatingEntry.id,
            amountPence: amount.toString(),
            message: 'Withdrawal reversed via compensating adjustment entry',
          };
        },
        { isolationLevel: 'Serializable', maxWait: 15000, timeout: 25000 }
      );
    } finally {
      release();
    }
  }

  throw new LedgerError('Unsupported entry type for reversal', 400);
}
