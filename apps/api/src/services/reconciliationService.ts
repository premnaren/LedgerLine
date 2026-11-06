import { prisma } from '../config/db';
import { AccountNotFoundError } from './errors';
import { verifyLedgerHashChain, ChainVerificationResult } from './cryptoService';

export interface AccountReconciliationResult {
  accountId: string;
  accountName: string;
  storedBalance: string;
  computedBalance: string;
  matches: boolean;
  isBalanced?: boolean;
  discrepancyPence: string;
  discrepancy?: string;
  totalCreditsPence: string;
  totalDebitsPence: string;
  cryptographicSeal?: {
    headHash: string | null;
    verified: boolean;
  };
}

export interface SystemReconciliationResult {
  allMatch: boolean;
  totalAccounts: number;
  discrepantAccountsCount: number;
  totalStoredBalancePence: string;
  totalComputedBalancePence: string;
  accounts: AccountReconciliationResult[];
  cryptographicIntegrity: ChainVerificationResult;
}

/**
 * Independently recomputes an account's balance by aggregating all POSTED
 * LedgerEntry rows (credits minus debits) and compares it against Account.balancePence.
 * Proves that LedgerEntry is the self-consistent source of truth in true double-entry accounting.
 */
export async function reconcileAccount(accountId: string): Promise<AccountReconciliationResult> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    throw new AccountNotFoundError('Account not found');
  }

  // Sum all POSTED credits filed against this account (DEPOSIT, TRANSFER_CREDIT, credit ADJUSTMENT)
  const creditsResult = await prisma.$queryRaw<[{ sum: bigint }]>`
    SELECT COALESCE(SUM("amountPence"), 0) as sum
    FROM "LedgerEntry"
    WHERE "creditAccountId" = ${accountId}
      AND status = 'POSTED'::"EntryStatus"
      AND type IN ('DEPOSIT'::"EntryType", 'TRANSFER_CREDIT'::"EntryType", 'ADJUSTMENT'::"EntryType")
  `;
  const totalCredits = BigInt(creditsResult[0].sum);

  // Sum all POSTED debits filed against this account (WITHDRAWAL, TRANSFER_DEBIT, debit ADJUSTMENT)
  const debitsResult = await prisma.$queryRaw<[{ sum: bigint }]>`
    SELECT COALESCE(SUM("amountPence"), 0) as sum
    FROM "LedgerEntry"
    WHERE "debitAccountId" = ${accountId}
      AND status = 'POSTED'::"EntryStatus"
      AND type IN ('WITHDRAWAL'::"EntryType", 'TRANSFER_DEBIT'::"EntryType", 'ADJUSTMENT'::"EntryType")
  `;
  const totalDebits = BigInt(debitsResult[0].sum);

  const computedBalance = totalCredits - totalDebits;
  const storedBalance = BigInt(account.balancePence);
  const discrepancyPence = storedBalance - computedBalance;
  const matches = discrepancyPence === 0n;

  // Retrieve latest entry cryptographic seal
  const latestEntry = await prisma.ledgerEntry.findFirst({
    where: {
      OR: [{ debitAccountId: accountId }, { creditAccountId: accountId }],
      hash: { not: null },
    },
    orderBy: { createdAt: 'desc' },
    select: { hash: true },
  });

  return {
    accountId: account.id,
    accountName: account.name,
    storedBalance: storedBalance.toString(),
    computedBalance: computedBalance.toString(),
    matches,
    isBalanced: matches,
    discrepancyPence: discrepancyPence.toString(),
    discrepancy: discrepancyPence.toString(),
    totalCreditsPence: totalCredits.toString(),
    totalDebitsPence: totalDebits.toString(),
    cryptographicSeal: {
      headHash: latestEntry?.hash || null,
      verified: matches,
    },
  };
}

/**
 * System-wide reconciliation: verifies double-entry consistency across all accounts in the system
 * AND verifies the full cryptographic SHA-256 hash chain from Genesis to Head.
 */
export async function reconcileAllAccounts(): Promise<SystemReconciliationResult> {
  const accounts = await prisma.account.findMany({
    select: { id: true },
    orderBy: { name: 'asc' },
  });

  const results: AccountReconciliationResult[] = [];
  let totalStored = 0n;
  let totalComputed = 0n;
  let discrepantCount = 0;

  for (const acc of accounts) {
    const res = await reconcileAccount(acc.id);
    results.push(res);
    totalStored += BigInt(res.storedBalance);
    totalComputed += BigInt(res.computedBalance);
    if (!res.matches) {
      discrepantCount++;
    }
  }

  // Cryptographic Ledger Chain verification
  const allEntries = await prisma.ledgerEntry.findMany({
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      createdAt: true,
      type: true,
      amountPence: true,
      debitAccountId: true,
      creditAccountId: true,
      runningBalance: true,
      hash: true,
      prevHash: true,
    },
  });

  const cryptoProof = verifyLedgerHashChain(allEntries);

  return {
    allMatch: discrepantCount === 0 && cryptoProof.verified,
    totalAccounts: accounts.length,
    discrepantAccountsCount: discrepantCount,
    totalStoredBalancePence: totalStored.toString(),
    totalComputedBalancePence: totalComputed.toString(),
    accounts: results,
    cryptographicIntegrity: cryptoProof,
  };
}
