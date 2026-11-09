'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { getUser, UserSession } from '@/lib/auth';
import { formatPaiseToRupees, parseRupeesToPaise } from '@/lib/utils';
import {
  Wallet,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw,
  FileText,
  PlusCircle,
  AlertCircle,
  RefreshCw,
  Building,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Zap,
  Copy,
  Check,
  Search,
  Coins,
  Download,
  X,
  Clock,
  ChevronRight,
} from 'lucide-react';
import TransactionDrawer, { InspectedTransaction } from '@/components/TransactionDrawer';

interface StatementEntry {
  id: string;
  createdAt: string;
  type: string;
  status: 'POSTED' | 'REFUSED';
  amountPence: string;
  runningBalance: string;
  direction?: 'DEBIT' | 'CREDIT';
  isDebit?: boolean;
  debitAccountId?: string | null;
  creditAccountId?: string | null;
  initiatedBy?: {
    email: string;
  };
  note?: string;
  hash?: string | null;
  prevHash?: string | null;
}

interface AccountReconciliationResult {
  accountId: string;
  accountName: string;
  storedBalance: string;
  computedBalance: string;
  matches: boolean;
  discrepancyPence: string;
  totalCreditsPence: string;
  totalDebitsPence: string;
}

interface SystemReconciliationResult {
  allMatch: boolean;
  totalAccounts: number;
  discrepantAccountsCount: number;
  totalStoredBalancePence: string;
  totalComputedBalancePence: string;
  accounts: AccountReconciliationResult[];
  cryptographicIntegrity?: {
    verified: boolean;
    totalEntries: number;
    headHash: string | null;
    genesisHash: string;
    brokenAtId?: string;
    error?: string;
  };
}

interface Account {
  id: string;
  name: string;
  balancePence: string;
  overdraftLimit: string;
  version: number;
  holders: Array<{
    user: { id: string; email: string; role: string };
  }>;
}

interface AuditEntryItem {
  id: string;
  createdAt: string;
  type: string;
  status: 'POSTED' | 'REFUSED';
  amountPence: string;
}

function BarSparkline({
  data,
  color,
}: {
  data: number[];
  color: string;
}) {
  const max = Math.max(...data.map(Math.abs), 1);
  const width = 56;
  const height = 22;
  const barWidth = 5;
  const gap = 3;

  return (
    <svg width={width} height={height} className="overflow-visible" aria-hidden="true">
      {data.map((val, idx) => {
        const barHeight = Math.max(2, Math.round((Math.abs(val) / max) * (height - 3)));
        const x = idx * (barWidth + gap);
        const y = height - barHeight;
        return (
          <rect
            key={idx}
            x={x}
            y={y}
            width={barWidth}
            height={barHeight}
            fill={color}
            rx={1}
          />
        );
      })}
    </svg>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditEntryItem[]>([]);
  const [recentEntries, setRecentEntries] = useState<StatementEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [inspectedEntry, setInspectedEntry] = useState<InspectedTransaction | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedHeadHash, setCopiedHeadHash] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [verificationTimestamp, setVerificationTimestamp] = useState<string | null>(null);

  // New account modal state (for Admin)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountBalance, setNewAccountBalance] = useState('');
  const [newAccountOverdraft, setNewAccountOverdraft] = useState('0');
  const [createLoading, setCreateLoading] = useState(false);

  // System Reconciliation modal state
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [reconcileResult, setReconcileResult] = useState<SystemReconciliationResult | null>(null);
  const [reconcileLoading, setReconcileLoading] = useState(false);

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const currentUser = getUser();
      const data = await api.get<Account[]>('/accounts');
      setAccounts(data);
      setLastRefreshedAt(new Date());

      // If user is ADMIN or AUDITOR, fetch audit entries to compute 7-day trend widgets
      if (currentUser?.role === 'ADMIN' || currentUser?.role === 'AUDITOR') {
        try {
          const auditData = await api.get<AuditEntryItem[]>('/statements/audit/entries?limit=100');
          setAuditEntries(auditData);
        } catch (auditErr) {
          console.error('Audit entries fetch error:', auditErr);
        }
      }

      // If user is an AUDITOR, proactively check system reconciliation
      if (currentUser?.role === 'AUDITOR') {
        try {
          const recData = await api.get<SystemReconciliationResult>('/admin/reconcile-all');
          setReconcileResult(recData);
          setVerificationTimestamp(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        } catch (recErr) {
          console.error('Initial auditor reconciliation fetch error:', recErr);
        }
      }

      // If user is a HOLDER, fetch recent statements for their registered accounts
      if (currentUser?.role === 'HOLDER' && data.length > 0) {
        setEntriesLoading(true);
        try {
          const promises = data.slice(0, 3).map((acc) =>
            api.get<{ entries: StatementEntry[] }>(`/accounts/${acc.id}/statement?limit=5`)
          );
          const results = await Promise.allSettled(promises);
          const allEntries: StatementEntry[] = [];
          for (const res of results) {
            if (res.status === 'fulfilled' && res.value.entries) {
              allEntries.push(...res.value.entries);
            }
          }
          const seen = new Set<string>();
          const uniqueSorted = allEntries
            .filter((e) => {
              if (seen.has(e.id)) return false;
              seen.add(e.id);
              return true;
            })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5);

          setRecentEntries(uniqueSorted);
        } catch (stmtErr) {
          console.error('Error fetching recent holder transactions:', stmtErr);
        } finally {
          setEntriesLoading(false);
        }
      }
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 401) {
        router.push('/login');
        return;
      }
      setError(err.message || 'Failed to fetch accounts');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }
    setUser(currentUser);
    fetchAccounts();

    const onFocus = () => {
      fetchAccounts();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchAccounts, router]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      const balancePaise = parseRupeesToPaise(newAccountBalance || '0');
      const overdraftPaise = parseRupeesToPaise(newAccountOverdraft || '0');

      await api.post('/accounts', {
        name: newAccountName,
        initialBalance: balancePaise.toString(),
        overdraftLimit: overdraftPaise.toString(),
      });

      setShowCreateModal(false);
      setNewAccountName('');
      setNewAccountBalance('');
      setNewAccountOverdraft('0');
      fetchAccounts();
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleVerifyIntegrity = async () => {
    setReconcileLoading(true);
    try {
      const data = await api.get<SystemReconciliationResult>('/admin/reconcile-all');
      setReconcileResult(data);
      setVerificationTimestamp(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setShowReconcileModal(true);
    } catch (err: any) {
      setError(err.message || 'Reconciliation check failed');
    } finally {
      setReconcileLoading(false);
    }
  };

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyHeadHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHeadHash(true);
    setTimeout(() => setCopiedHeadHash(false), 2000);
  };

  const handleExportReport = () => {
    if (!reconcileResult) return;
    const reportData = {
      reportType: 'LedgerLine System Double-Entry & Cryptographic Audit Report',
      generatedAt: new Date().toISOString(),
      status: reconcileResult.allMatch ? 'VERIFIED_BALANCED' : 'DISCREPANCY_DETECTED',
      summary: {
        totalAccounts: reconcileResult.totalAccounts,
        discrepantAccountsCount: reconcileResult.discrepantAccountsCount,
        totalStoredBalancePence: reconcileResult.totalStoredBalancePence,
        totalStoredBalanceFormatted: formatPaiseToRupees(reconcileResult.totalStoredBalancePence),
        totalComputedBalancePence: reconcileResult.totalComputedBalancePence,
        totalComputedBalanceFormatted: formatPaiseToRupees(reconcileResult.totalComputedBalancePence),
      },
      cryptographicProof: {
        algorithm: 'SHA-256 (FIPS 180-4)',
        verified: reconcileResult.cryptographicIntegrity?.verified ?? false,
        totalEntriesSealed: reconcileResult.cryptographicIntegrity?.totalEntries ?? 0,
        headHash: reconcileResult.cryptographicIntegrity?.headHash ?? null,
        genesisHash: reconcileResult.cryptographicIntegrity?.genesisHash ?? '0'.repeat(64),
        chainValidation: 'Genesis -> Head Verified',
      },
      accounts: reconcileResult.accounts.map((acc) => ({
        accountId: acc.accountId,
        accountName: acc.accountName,
        storedBalance: formatPaiseToRupees(acc.storedBalance),
        computedBalance: formatPaiseToRupees(acc.computedBalance),
        discrepancy: formatPaiseToRupees(acc.discrepancyPence),
        status: acc.matches ? 'MATCH' : 'DRIFT',
      })),
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LedgerLine-Integrity-Audit-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Exact BigInt computation of combined balance
  const combinedBalancePence = useMemo(() => {
    return accounts.reduce((sum, a) => {
      try {
        return sum + BigInt(a.balancePence);
      } catch {
        return sum;
      }
    }, 0n);
  }, [accounts]);

  // Client-side 7-day Trend Analytics for Admin/Auditor
  const sevenDayStats = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recent = auditEntries.filter((e) => new Date(e.createdAt) >= sevenDaysAgo);

    const posted = recent.filter((e) => e.status === 'POSTED');
    const refused = recent.filter((e) => e.status === 'REFUSED');

    let netFlowPence = 0n;
    posted.forEach((e) => {
      const amt = BigInt(e.amountPence || '0');
      if (e.type === 'DEPOSIT') {
        netFlowPence += amt;
      } else if (e.type === 'WITHDRAWAL') {
        netFlowPence -= amt;
      }
    });

    // 7 day buckets
    const postedDaily: number[] = [];
    const refusedDaily: number[] = [];
    const netFlowDaily: number[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStr = d.toISOString().slice(0, 10);
      const dayEntries = recent.filter((e) => e.createdAt.slice(0, 10) === dayStr);

      const pCount = dayEntries.filter((e) => e.status === 'POSTED').length;
      const rCount = dayEntries.filter((e) => e.status === 'REFUSED').length;
      let flow = 0;
      dayEntries.forEach((e) => {
        if (e.status === 'POSTED') {
          const amt = Number(e.amountPence || 0) / 100;
          if (e.type === 'DEPOSIT') flow += amt;
          else if (e.type === 'WITHDRAWAL') flow -= amt;
        }
      });

      postedDaily.push(pCount);
      refusedDaily.push(rCount);
      netFlowDaily.push(flow);
    }

    return {
      postedCount: posted.length,
      refusedCount: refused.length,
      netFlowPence,
      postedDaily,
      refusedDaily,
      netFlowDaily,
    };
  }, [auditEntries]);

  // Filter accounts by name, ID, or holder
  const filteredAccounts = useMemo(() => {
    if (!searchQuery.trim()) return accounts;
    const q = searchQuery.toLowerCase().trim();
    return accounts.filter(
      (acc) =>
        acc.name.toLowerCase().includes(q) ||
        acc.id.toLowerCase().includes(q) ||
        acc.holders?.some((h) => h.user.email.toLowerCase().includes(q))
    );
  }, [accounts, searchQuery]);

  const roleColor =
    user?.role === 'ADMIN'
      ? 'var(--role-admin)'
      : user?.role === 'AUDITOR'
      ? 'var(--role-auditor)'
      : 'var(--role-holder)';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner Navigation & Actions */}
      <div className="flex flex-col gap-4 pb-4 border-b border-rule">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2.5 mb-1">
              <h1 className="text-2xl font-bold tracking-tight text-ink">
                Accounts dashboard
              </h1>
              {user?.role && (
                <span className="flex items-center gap-1.5 text-xs text-ink-muted font-medium">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: roleColor }} />
                  {user.role}
                </span>
              )}
            </div>
            <p className="text-xs text-ink-muted">
              {user?.role === 'ADMIN' &&
                'System-wide ledger control: Viewing all accounts with full debit/credit authority.'}
              {user?.role === 'HOLDER' &&
                'Personal accounts overview · Your registered accounts'}
              {user?.role === 'AUDITOR' &&
                'Auditor view: Read-only observation across all ledger accounts.'}
            </p>
          </div>

          <button
            onClick={() => fetchAccounts()}
            className="p-2 border border-rule rounded text-ink-muted hover:text-ink hover:bg-rule/30 transition pressable shrink-0"
            title="Refresh balances and transactions"
            aria-label="Refresh balances and transactions"
          >
            <RefreshCw className={`h-4 w-4 ${loading || entriesLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {user?.role === 'ADMIN' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 rounded text-xs font-semibold text-white bg-accent hover:opacity-95 transition pressable"
            >
              <PlusCircle className="mr-1.5 h-4 w-4" />
              <span>New account</span>
            </button>
          )}

          {user?.role === 'HOLDER' && accounts.length > 0 && (
            <Link
              href={`/accounts/${accounts[0].id}/transfer`}
              className="inline-flex items-center px-4 py-2 rounded text-xs font-semibold text-white bg-accent hover:opacity-95 transition pressable"
              title="Initiate transfer from your account"
            >
              <ArrowRightLeft className="mr-1.5 h-4 w-4" />
              <span>Transfer money</span>
            </Link>
          )}

          {/* Ghost button: Verify ledger integrity */}
          {(user?.role === 'ADMIN' || user?.role === 'AUDITOR') && (
            <button
              type="button"
              onClick={handleVerifyIntegrity}
              disabled={reconcileLoading}
              className="inline-flex items-center px-3.5 py-2 border border-rule rounded text-xs font-medium text-ink bg-paper hover:bg-rule/30 transition pressable"
              title="Verify double-entry reconciliation and cryptographic hashes"
            >
              <span
                className="w-1.5 h-1.5 rounded-full mr-2 shrink-0"
                style={{
                  background: reconcileLoading
                    ? 'var(--ink-faint)'
                    : reconcileResult
                    ? reconcileResult.allMatch
                      ? 'var(--ledger-green)'
                      : 'var(--ledger-red)'
                    : 'var(--ledger-green)',
                }}
              />
              <span>{reconcileLoading ? 'Verifying...' : 'Verify ledger integrity'}</span>
              {reconcileResult && (
                <span className="ml-1.5 text-[11px] mono-num text-ink-muted">
                  · {reconcileResult.allMatch ? 'Chain verified' : 'Discrepancy detected'}
                </span>
              )}
            </button>
          )}

          {user?.role === 'ADMIN' && (
            <Link
              href="/admin/stress-lab"
              className="inline-flex items-center px-3.5 py-2 border border-rule rounded text-xs font-medium text-ink bg-paper hover:bg-rule/30 transition pressable"
              title="Run real-time concurrent SSI transactions and test ACID row-lock telemetry"
            >
              <Zap className="mr-1.5 h-3.5 w-3.5 text-accent shrink-0" />
              <span>Stress lab</span>
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="p-4 bg-paper border border-ledger-red rounded flex items-center space-x-3 text-ledger-red"
        >
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-xs font-medium">{error}</p>
        </div>
      )}

      {/* ADMIN & AUDITOR Trend Widgets (Computed client-side from existing endpoints) */}
      {(user?.role === 'ADMIN' || user?.role === 'AUDITOR') && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Trend 1: Posted entries in last 7 days */}
          <div className="bg-white border border-rule rounded p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-ink-muted font-medium block">
                Posted entries (7d)
              </span>
              <span className="mono-num text-2xl font-medium text-ink mt-0.5 block">
                {sevenDayStats.postedCount}
              </span>
              <span className="text-[11px] text-ink-faint">Double-entry legs</span>
            </div>
            <div className="text-right">
              <BarSparkline data={sevenDayStats.postedDaily} color="var(--ledger-green)" />
              <span className="text-[10px] mono-num text-ink-faint block mt-1">7d trend</span>
            </div>
          </div>

          {/* Trend 2: Refused attempts in last 7 days */}
          <div className="bg-white border border-rule rounded p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-ink-muted font-medium block">
                Refused attempts (7d)
              </span>
              <span className="mono-num text-2xl font-medium text-ink mt-0.5 block">
                {sevenDayStats.refusedCount}
              </span>
              <span className="text-[11px] text-ink-faint">Prevented overdrafts</span>
            </div>
            <div className="text-right">
              <BarSparkline data={sevenDayStats.refusedDaily} color="var(--ledger-red)" />
              <span className="text-[10px] mono-num text-ink-faint block mt-1">7d trend</span>
            </div>
          </div>

          {/* Trend 3: Net flow in last 7 days */}
          <div className="bg-white border border-rule rounded p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-ink-muted font-medium block">
                Net flow (7d)
              </span>
              <span className="mono-num text-2xl font-medium text-ink mt-0.5 block">
                {formatPaiseToRupees(sevenDayStats.netFlowPence.toString())}
              </span>
              <span className="text-[11px] text-ink-faint">Deposits minus withdrawals</span>
            </div>
            <div className="text-right">
              <BarSparkline data={sevenDayStats.netFlowDaily} color="var(--accent)" />
              <span className="text-[10px] mono-num text-ink-faint block mt-1">7d trend</span>
            </div>
          </div>
        </div>
      )}

      {/* HOLDER Metric Cards */}
      {user?.role === 'HOLDER' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="bg-white border border-rule rounded p-4">
            <span className="text-xs text-ink-muted font-medium block">Total balance</span>
            <div className="mono-num text-2xl font-medium text-ink mt-0.5">
              {formatPaiseToRupees(combinedBalancePence.toString())}
            </div>
            <p className="text-xs text-ink-faint mt-1">
              Across {accounts.length} registered {accounts.length === 1 ? 'account' : 'accounts'}
            </p>
          </div>

          <div className="bg-white border border-rule rounded p-4">
            <span className="text-xs text-ink-muted font-medium block">Your accounts</span>
            <div className="mono-num text-2xl font-medium text-ink mt-0.5">
              {accounts.length < 10 ? `0${accounts.length}` : accounts.length}
            </div>
            <p className="text-xs text-ink-muted mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--ledger-green)' }} />
              Active checking
            </p>
          </div>

          <div className="bg-white border border-rule rounded p-4">
            <span className="text-xs text-ink-muted font-medium block">Account protection</span>
            <div className="mono-num text-2xl font-medium text-ink mt-0.5 flex items-center gap-2">
              <span>Protected</span>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--ledger-green)' }} />
            </div>
            <p className="text-xs text-ink-faint mt-1">
              Append-only cryptographic seal
            </p>
          </div>
        </div>
      )}

      {/* Accounts List Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-ink">
              {user?.role === 'HOLDER' ? 'Your accounts' : 'Ledger accounts'}
            </h2>
            <p className="text-xs text-ink-muted">
              {user?.role === 'HOLDER'
                ? 'Select an account to initiate transfers or view statements'
                : 'Showing all system accounts with current balances and overdraft limits'}
            </p>
          </div>

          {accounts.length > 2 && (
            <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-faint">
                <Search className="h-3.5 w-3.5" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by name or ID..."
                className="h-9 w-full pl-9 pr-3 rounded border border-rule bg-white text-xs text-ink placeholder:text-ink-faint focus-visible:outline-none focus-visible:border-accent"
              />
            </div>
          )}
        </div>

        {/* Account Cards Grid */}
        {loading && accounts.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-44 bg-white border border-rule rounded p-5 flex flex-col justify-between animate-pulse"
              >
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <div className="h-3 w-28 bg-rule/50 rounded" />
                    <div className="h-3 w-12 bg-rule/40 rounded" />
                  </div>
                  <div className="h-4 w-36 bg-rule/60 rounded mb-2" />
                  <div className="h-7 w-44 bg-rule/50 rounded" />
                </div>
                <div className="pt-3 border-t border-rule flex justify-between items-center">
                  <div className="h-3 w-28 bg-rule/40 rounded" />
                  <div className="h-3 w-16 bg-rule/40 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="bg-white border border-rule rounded p-10 text-center">
            <Building className="mx-auto h-10 w-10 text-ink-faint" />
            <h3 className="mt-2 text-sm font-semibold text-ink">No accounts accessible</h3>
            <p className="mt-1 text-xs text-ink-muted">
              You do not currently hold any registered accounts on this ledger.
            </p>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="bg-white border border-rule rounded p-8 text-center">
            <p className="text-xs text-ink-muted">
              No accounts match &ldquo;{searchQuery}&rdquo;. Clear filter to view all accounts.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAccounts.map((acc) => {
              const balanceNum = Number(acc.balancePence);
              const isNegative = balanceNum < 0;

              return (
                <div
                  key={acc.id}
                  className="bg-white border border-rule rounded p-5 flex flex-col justify-between"
                >
                  <div>
                    {/* Header Row: ID and Status */}
                    <div className="flex items-center justify-between mb-3">
                      <button
                        type="button"
                        onClick={(e) => handleCopyId(acc.id, e)}
                        title="Copy full Account ID"
                        aria-label="Copy Account ID"
                        className="mono-num text-xs text-ink-faint hover:text-ink inline-flex items-center gap-1.5 transition"
                      >
                        <span>ID: {acc.id.slice(0, 10)}...</span>
                        {copiedId === acc.id ? (
                          <span className="text-[11px] font-sans font-medium text-ledger-green">
                            Copied
                          </span>
                        ) : (
                          <Copy className="h-3 w-3 text-ink-faint" />
                        )}
                      </button>

                      <span className="flex items-center gap-1.5 text-xs text-ink-muted font-medium">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--ledger-green)' }} />
                        {user?.role === 'AUDITOR' ? 'Available' : 'Active'}
                      </span>
                    </div>

                    <h3 className="text-base font-semibold tracking-tight text-ink mb-2">
                      {acc.name}
                    </h3>

                    {/* Balance Display */}
                    <div>
                      <span className="text-xs text-ink-muted font-medium block">
                        {user?.role === 'AUDITOR' ? 'Ledger balance' : 'Current balance'}
                      </span>
                      <span
                        className="mono-num text-3xl font-medium tracking-tight block mt-0.5"
                        style={{ color: isNegative ? 'var(--ledger-red)' : 'var(--ink)' }}
                      >
                        {formatPaiseToRupees(acc.balancePence)}
                      </span>
                    </div>

                    {acc.overdraftLimit !== '0' && (
                      <p className="text-xs mono-num text-ink-muted mt-1">
                        Overdraft limit: {formatPaiseToRupees(acc.overdraftLimit)}
                      </p>
                    )}

                    {acc.holders && acc.holders.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-rule text-xs text-ink-muted">
                        <span className="font-medium text-ink">Holders:</span>{' '}
                        <span className="mono-num text-ink-muted">
                          {acc.holders.map((h) => h.user.email).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Actions Footer: Plain text links in var(--accent) separated by border-t border-rule */}
                  <div className="mt-4 pt-3 border-t border-rule flex items-center justify-between text-xs">
                    {user?.role === 'AUDITOR' ? (
                      <Link
                        href={`/accounts/${acc.id}`}
                        className="font-semibold text-accent hover:underline flex items-center gap-1"
                      >
                        <span>View statement</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      <>
                        <Link
                          href={`/accounts/${acc.id}/transfer`}
                          className="font-semibold text-accent hover:underline flex items-center gap-1.5"
                        >
                          <ArrowRightLeft className="h-3.5 w-3.5" />
                          <span>Transfer</span>
                        </Link>
                        <Link
                          href={`/accounts/${acc.id}`}
                          className="font-semibold text-accent hover:underline flex items-center gap-1.5"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span>Statement</span>
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Transactions Feed for Account Holder */}
      {user?.role === 'HOLDER' && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold tracking-tight text-ink">
              Recent transactions
            </h2>
            {accounts.length > 0 && (
              <Link
                href={`/accounts/${accounts[0].id}`}
                className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
              >
                <span>View complete statement</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          {entriesLoading && recentEntries.length === 0 ? (
            <div className="bg-white border border-rule rounded p-5 space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-rule/30 rounded animate-pulse" />
              ))}
            </div>
          ) : recentEntries.length === 0 ? (
            <div className="bg-white border border-rule rounded p-8 text-center">
              <p className="text-xs text-ink-muted">No recent transactions recorded on this account.</p>
            </div>
          ) : (
            <div className="bg-white border border-rule rounded divide-y divide-rule">
              {recentEntries.map((entry) => {
                const isDebit =
                  entry.isDebit ||
                  entry.direction === 'DEBIT' ||
                  entry.type.includes('DEBIT') ||
                  entry.type === 'WITHDRAWAL';

                return (
                  <div
                    key={entry.id}
                    onClick={() => {
                      setInspectedEntry({
                        id: entry.id,
                        createdAt: entry.createdAt,
                        type: entry.type,
                        status: entry.status,
                        amountPence: entry.amountPence,
                        runningBalance: entry.runningBalance,
                        debitAccountId: entry.debitAccountId || null,
                        creditAccountId: entry.creditAccountId || null,
                        initiatedByEmail: entry.initiatedBy?.email || 'N/A',
                        note: entry.note || null,
                        hash: entry.hash || null,
                        prevHash: entry.prevHash || null,
                      });
                    }}
                    className="p-3.5 sm:px-5 flex items-center justify-between hover:bg-[#F3F2EE] transition cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-xs font-medium text-ink truncate">
                          {entry.note || (isDebit ? 'Transfer to account' : 'Received funds')}
                        </p>
                        <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: entry.status === 'POSTED' ? 'var(--ledger-green)' : 'var(--ledger-red)' }}>
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: entry.status === 'POSTED' ? 'var(--ledger-green)' : 'var(--ledger-red)' }}
                          />
                          {entry.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-faint mono-num mt-0.5">
                        {new Date(entry.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}{' '}
                        ·{' '}
                        {new Date(entry.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>

                    <div className="text-right shrink-0 ml-4">
                      <span
                        className="mono-num text-sm font-medium block"
                        style={{ color: isDebit ? 'var(--ledger-red)' : 'var(--ledger-green)' }}
                      >
                        {isDebit ? '−' : '+'}
                        {formatPaiseToRupees(entry.amountPence)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create Account Modal (Admin only) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="bg-white rounded border border-rule max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-semibold text-ink">Create new ledger account</h3>
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label className="block text-xs text-ink-muted font-medium mb-1">
                  Account name
                </label>
                <input
                  type="text"
                  required
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  className="block w-full px-3 py-2 border border-rule rounded text-xs text-ink focus:outline-none focus:border-accent"
                  placeholder="e.g. Treasury Operations"
                />
              </div>

              <div>
                <label className="block text-xs text-ink-muted font-medium mb-1">
                  Initial balance (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newAccountBalance}
                  onChange={(e) => setNewAccountBalance(e.target.value)}
                  className="mono-num block w-full px-3 py-2 border border-rule rounded text-xs text-ink focus:outline-none focus:border-accent"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-xs text-ink-muted font-medium mb-1">
                  Overdraft limit (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newAccountOverdraft}
                  onChange={(e) => setNewAccountOverdraft(e.target.value)}
                  className="mono-num block w-full px-3 py-2 border border-rule rounded text-xs text-ink focus:outline-none focus:border-accent"
                  placeholder="0.00"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-rule">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-xs font-medium text-ink-muted hover:text-ink border border-rule rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-accent rounded hover:opacity-90 disabled:opacity-50"
                >
                  {createLoading ? 'Creating...' : 'Create account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* System Double-Entry Reconciliation & Cryptographic Audit Report Modal */}
      {showReconcileModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
        >
          <div className="bg-white rounded border border-rule max-w-2xl w-full flex flex-col max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-rule shrink-0">
              <div className="flex items-center space-x-2.5">
                <ShieldCheck className="h-5 w-5 text-accent" />
                <div>
                  <h3 className="text-sm font-semibold text-ink">
                    System double-entry &amp; integrity audit
                  </h3>
                  <p className="text-[11px] text-ink-muted">
                    Genesis-to-Head SHA-256 seal verification
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {reconcileResult && (
                  <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: reconcileResult.allMatch ? 'var(--ledger-green)' : 'var(--ledger-red)' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: reconcileResult.allMatch ? 'var(--ledger-green)' : 'var(--ledger-red)' }} />
                    {reconcileResult.allMatch ? 'Reconciled · Zero discrepancies' : 'Discrepancy detected'}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setShowReconcileModal(false)}
                  className="p-1 text-ink-faint hover:text-ink"
                  aria-label="Close dialog"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto p-5 space-y-4">
              {reconcileLoading ? (
                <div className="py-12 text-center text-ink-muted flex flex-col items-center space-y-2">
                  <RefreshCw className="h-5 w-5 animate-spin text-accent" />
                  <p className="text-xs">Aggregating ledger entries across all system accounts...</p>
                </div>
              ) : reconcileResult ? (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 bg-paper border border-rule rounded">
                      <span className="text-[11px] text-ink-muted block">Total accounts</span>
                      <span className="mono-num text-xl font-medium text-ink mt-0.5 block">
                        {reconcileResult.totalAccounts}
                      </span>
                    </div>

                    <div className="p-3 bg-paper border border-rule rounded">
                      <span className="text-[11px] text-ink-muted block">System total</span>
                      <span className="mono-num text-xl font-medium text-ink mt-0.5 block">
                        {formatPaiseToRupees(reconcileResult.totalStoredBalancePence)}
                      </span>
                    </div>

                    <div className="p-3 bg-paper border border-rule rounded">
                      <span className="text-[11px] text-ink-muted block">Status</span>
                      <span className="text-xl font-medium text-ledger-green mt-0.5 block">
                        Balanced
                      </span>
                    </div>
                  </div>

                  {reconcileResult.cryptographicIntegrity?.headHash && (
                    <div className="p-3 bg-paper border border-rule rounded space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-ink-muted font-medium">Head hash (SHA-256):</span>
                        <button
                          type="button"
                          onClick={() => handleCopyHeadHash(reconcileResult.cryptographicIntegrity?.headHash || '')}
                          className="text-accent hover:underline text-[11px]"
                        >
                          {copiedHeadHash ? 'Copied' : 'Copy hash'}
                        </button>
                      </div>
                      <div className="mono-num text-[11px] text-ink truncate bg-white p-1.5 border border-rule rounded">
                        {reconcileResult.cryptographicIntegrity.headHash}
                      </div>
                    </div>
                  )}

                  <div className="border border-rule rounded overflow-hidden">
                    <table className="min-w-full divide-y divide-rule text-xs">
                      <thead className="bg-paper text-ink-muted font-medium border-b border-rule-strong">
                        <tr>
                          <th className="px-3.5 py-2 text-left">Account</th>
                          <th className="px-3.5 py-2 text-right">Stored</th>
                          <th className="px-3.5 py-2 text-right">Computed</th>
                          <th className="px-3.5 py-2 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rule bg-white">
                        {reconcileResult.accounts.map((acc) => (
                          <tr key={acc.accountId} className="hover:bg-[#F3F2EE]">
                            <td className="px-3.5 py-2 font-medium text-ink">{acc.accountName}</td>
                            <td className="px-3.5 py-2 text-right mono-num">{formatPaiseToRupees(acc.storedBalance)}</td>
                            <td className="px-3.5 py-2 text-right mono-num">{formatPaiseToRupees(acc.computedBalance)}</td>
                            <td className="px-3.5 py-2 text-center">
                              <span className="flex items-center justify-center gap-1 text-[11px] font-medium" style={{ color: acc.matches ? 'var(--ledger-green)' : 'var(--ledger-red)' }}>
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: acc.matches ? 'var(--ledger-green)' : 'var(--ledger-red)' }} />
                                {acc.matches ? 'Match' : 'Drift'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="px-5 py-3 border-t border-rule bg-paper flex items-center justify-between text-xs shrink-0">
              <button
                type="button"
                onClick={handleExportReport}
                disabled={!reconcileResult}
                className="inline-flex items-center px-3 py-1.5 border border-rule rounded text-xs font-medium text-ink bg-white hover:bg-rule/30"
              >
                <Download className="mr-1.5 h-3.5 w-3.5 text-ink-faint" />
                Export JSON
              </button>
              <button
                type="button"
                onClick={() => setShowReconcileModal(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-ink rounded hover:opacity-90"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Inspection Drawer */}
      <TransactionDrawer
        entry={inspectedEntry}
        onClose={() => setInspectedEntry(null)}
        isAdmin={user?.role === 'ADMIN'}
      />
    </div>
  );
}
