import { prisma } from '../config/db';
import { AccountNotFoundError } from './errors';

export interface AccountReconciliationResult {
  accountId: string;
  accountName: string;
  storedBalance: string;
  computedBalance: string;
  matches: boolean;
  discrepancyPence: string;
  totalCreditsPence: string;
  totalDebitsPence: string;
}

export interface SystemReconciliationResult {
  allMatch: boolean;
  totalAccounts: number;
  discrepantAccountsCount: number;
  totalStoredBalancePence: string;
  totalComputedBalancePence: string;
  accounts: AccountReconciliationResult[];
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
      AND status = 'POSTED'
  `;
  const totalCredits = BigInt(creditsResult[0].sum);

  // Sum all POSTED debits filed against this account (WITHDRAWAL, TRANSFER_DEBIT, debit ADJUSTMENT)
  const debitsResult = await prisma.$queryRaw<[{ sum: bigint }]>`
    SELECT COALESCE(SUM("amountPence"), 0) as sum
    FROM "LedgerEntry"
    WHERE "debitAccountId" = ${accountId}
      AND status = 'POSTED'
  `;
  const totalDebits = BigInt(debitsResult[0].sum);

  const computedBalance = totalCredits - totalDebits;
  const storedBalance = BigInt(account.balancePence);
  const discrepancyPence = storedBalance - computedBalance;
  const matches = discrepancyPence === 0n;

  return {
    accountId: account.id,
    accountName: account.name,
    storedBalance: storedBalance.toString(),
    computedBalance: computedBalance.toString(),
    matches,
    discrepancyPence: discrepancyPence.toString(),
    totalCreditsPence: totalCredits.toString(),
    totalDebitsPence: totalDebits.toString(),
  };
}

/**
 * System-wide reconciliation: verifies double-entry consistency across all accounts in the system.
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

  return {
    allMatch: discrepantCount === 0,
    totalAccounts: accounts.length,
    discrepantAccountsCount: discrepantCount,
    totalStoredBalancePence: totalStored.toString(),
    totalComputedBalancePence: totalComputed.toString(),
    accounts: results,
  };
}

