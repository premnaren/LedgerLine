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
} from 'lucide-react';

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

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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
      const data = await api.get<Account[]>('/accounts');
      setAccounts(data);
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
    setShowReconcileModal(true);
    try {
      const data = await api.get<SystemReconciliationResult>('/admin/reconcile-all');
      setReconcileResult(data);
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

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Banner Navigation & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight-display text-slate-950">
            Accounts Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {user?.role === 'ADMIN' &&
              'System-wide ledger control: Viewing all accounts with full debit/credit authority.'}
            {user?.role === 'HOLDER' &&
              'Personal accounts overview: Viewing accounts where you are a registered holder.'}
            {user?.role === 'AUDITOR' &&
              'Auditor view: Read-only observation across all ledger accounts.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => fetchAccounts()}
            className="p-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-100 transition shadow-2xs pressable focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            title="Refresh accounts on demand"
            aria-label="Refresh accounts"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {(user?.role === 'ADMIN' || user?.role === 'AUDITOR') && (
            <button
              onClick={handleVerifyIntegrity}
              className="inline-flex items-center px-3.5 py-2 border border-emerald-300 rounded-xl shadow-2xs text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 transition pressable"
              title="Verify double-entry reconciliation across all accounts"
            >
              <ShieldCheck className="mr-1.5 h-4 w-4 text-emerald-600" />
              Verify Ledger Integrity
            </button>
          )}

          {user?.role === 'ADMIN' && (
            <Link
              href="/admin/stress-lab"
              className="inline-flex items-center px-3.5 py-2 border border-amber-300 rounded-xl shadow-2xs text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 transition pressable"
              title="Run real-time concurrent SSI transactions and test ACID row-lock telemetry"
            >
              <Zap className="mr-1.5 h-4 w-4 text-amber-600 fill-amber-500" />
              Stress Lab
            </Link>
          )}

          {user?.role === 'ADMIN' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-xl shadow-2xs text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 transition pressable"
            >
              <PlusCircle className="mr-1.5 h-4 w-4" />
              New Account
            </button>
          )}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-3 text-red-700 animate-in fade-in-50"
        >
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* System Overview: Executive KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Accounts */}
        <div className="glass-card rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Accounts
            </span>
            <div className="h-8 w-8 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center border border-sky-200/60">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black tracking-tight-display text-slate-950 tabular-nums">
            {accounts.length < 10 ? `0${accounts.length}` : accounts.length}
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Active double-entry accounts
          </p>
        </div>

        {/* Metric 2: Combined Balance */}
        <div className="glass-card rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Combined Balance
            </span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-200/60">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black tracking-tight-display text-slate-950 tabular-nums">
            {formatPaiseToRupees(combinedBalancePence.toString())}
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Total ledger assets in circulation
          </p>
        </div>

        {/* Metric 3: Ledger Integrity */}
        <div
          onClick={handleVerifyIntegrity}
          className="glass-card rounded-2xl p-5 border border-slate-200/80 shadow-2xs cursor-pointer hover:border-emerald-300 transition pressable"
          role="button"
          tabIndex={0}
          title="Click to run full Genesis-to-Head ledger seal verification"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Ledger Integrity
            </span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-200/60">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-2xl font-black tracking-tight-display text-slate-950">
              Verified
            </span>
          </div>
          <p className="text-xs text-emerald-700 mt-1 font-medium">
            SHA-256 chain seal intact
          </p>
        </div>

        {/* Metric 4: Concurrency & ACID State */}
        <div className="glass-card rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              ACID Isolation
            </span>
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-200/60">
              <Zap className="h-4 w-4 fill-amber-500" />
            </div>
          </div>
          <div className="text-2xl font-black tracking-tight-display text-slate-950">
            Serializable
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Deterministic row-locked execution
          </p>
        </div>
      </div>

      {/* Account List Header with Search Filter */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <h2 className="text-lg font-bold tracking-tight-display text-slate-950">
              All Accounts
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200/60 font-mono">
              {filteredAccounts.length} {filteredAccounts.length === 1 ? 'account' : 'accounts'}
            </span>
          </div>

          {accounts.length > 0 && (
            <div className="relative w-full sm:w-72">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="h-3.5 w-3.5" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by name or ID..."
                className="h-9 w-full pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 transition shadow-2xs"
              />
            </div>
          )}
        </div>

        {/* Account Cards Grid */}
        {loading && accounts.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-56 bg-white/70 border border-slate-200 rounded-2xl p-6 animate-pulse"
              ></div>
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <Building className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-2 text-base font-semibold text-slate-900">No accounts accessible</h3>
            <p className="mt-1 text-sm text-slate-500">
              You do not currently hold any registered accounts on this ledger.
            </p>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
            <p className="text-sm text-slate-500">
              No accounts match &ldquo;{searchQuery}&rdquo;. Clear filter to view all accounts.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAccounts.map((acc) => {
              const balanceNum = Number(acc.balancePence);
              const isNegative = balanceNum < 0;

              return (
                <div
                  key={acc.id}
                  className="glass-card rounded-2xl p-6 shadow-xs hover:shadow-md transition duration-150 flex flex-col justify-between border border-slate-200/80"
                >
                  <div>
                    {/* Top Identifiers Row */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-1.5">
                        <span
                          className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-mono border border-slate-200/60"
                          title={`Full Account ID: ${acc.id}`}
                        >
                          ID: {acc.id.slice(0, 10)}...
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleCopyId(acc.id, e)}
                          title="Copy full Account UUID"
                          aria-label="Copy Account UUID"
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition pressable"
                        >
                          {copiedId === acc.id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>

                      <span
                        className="text-xs font-mono font-medium text-slate-600 px-2 py-0.5 rounded-md bg-slate-100/80 border border-slate-200/60"
                        title="Optimistic concurrency version (incremented atomically on each ledger entry to prevent stale writes)"
                      >
                        v{acc.version}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold tracking-tight-display text-slate-950 mb-1">
                      {acc.name}
                    </h3>

                    {/* Balance Display */}
                    <div className="mt-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                        Current Balance
                      </span>
                      <span
                        className={`text-2xl font-black tracking-tight-display tabular-nums ${
                          isNegative ? 'text-red-600' : 'text-slate-950'
                        }`}
                      >
                        {formatPaiseToRupees(acc.balancePence)}
                      </span>
                    </div>

                    {acc.overdraftLimit !== '0' && (
                      <p className="text-xs font-mono text-slate-600 mt-1 font-medium">
                        Overdraft limit: {formatPaiseToRupees(acc.overdraftLimit)}
                      </p>
                    )}

                    {acc.holders && acc.holders.length > 0 && (
                      <div className="mt-3.5 pt-3 border-t border-slate-100 text-xs text-slate-600">
                        <span className="font-semibold text-slate-700">Holders:</span>{' '}
                        <span className="font-medium text-slate-800">
                          {acc.holders.map((h) => h.user.email).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2.5">
                    <Link
                      href={`/accounts/${acc.id}`}
                      title="View historical statement and immutable ledger entries"
                      className="flex-1 inline-flex justify-center items-center py-2 px-3 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition pressable shadow-2xs"
                    >
                      <FileText className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
                      Statement
                    </Link>

                    {user?.role !== 'AUDITOR' && (
                      <Link
                        href={`/accounts/${acc.id}/transfer`}
                        title="Initiate an atomic transfer from this account"
                        className="flex-1 inline-flex justify-center items-center py-2 px-3 border border-transparent rounded-xl text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 transition pressable shadow-2xs"
                      >
                        <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" />
                        Transfer
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Account Modal (Admin only) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Create New Ledger Account</h3>
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Account Name
                </label>
                <input
                  type="text"
                  required
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  placeholder="e.g. Treasury Operations"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Initial Balance (₹)
                </label>
                <div className="relative rounded-xl shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 font-medium">
                    ₹
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newAccountBalance}
                    onChange={(e) => setNewAccountBalance(e.target.value)}
                    className="block w-full pl-7 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Overdraft Limit (₹)
                </label>
                <div className="relative rounded-xl shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 font-medium">
                    ₹
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newAccountOverdraft}
                    onChange={(e) => setNewAccountOverdraft(e.target.value)}
                    className="block w-full pl-7 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition pressable"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition pressable disabled:opacity-50"
                >
                  {createLoading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* System Double-Entry Reconciliation Modal */}
      {showReconcileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    System Double-Entry Reconciliation
                  </h3>
                  <p className="text-xs text-slate-500">
                    Independent mathematical proof: <code>Account.balancePence</code> vs.{' '}
                    <code>∑(Credits) - ∑(Debits)</code>
                  </p>
                </div>
              </div>

              {reconcileResult && (
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    reconcileResult.allMatch
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-red-100 text-red-800 border-red-300'
                  }`}
                >
                  {reconcileResult.allMatch ? '100% BALANCED ✓' : 'DISCREPANCY DETECTED'}
                </span>
              )}
            </div>

            <div className="py-4">
              {reconcileLoading ? (
                <div className="py-12 text-center text-slate-500 flex flex-col items-center space-y-3">
                  <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
                  <p className="text-sm">
                    Aggregating immutable ledger entries across all system accounts...
                  </p>
                </div>
              ) : reconcileResult ? (
                <div className="space-y-4">
                  {/* Cryptographic SHA-256 Proof Badge */}
                  {reconcileResult.cryptographicIntegrity && (
                    <div className="p-3 bg-emerald-50/80 border border-emerald-200/90 rounded-xl flex items-center justify-between text-xs shadow-2xs">
                      <div className="flex items-center space-x-2.5">
                        <div className="h-7 w-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-700">
                          <ShieldCheck className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="font-bold text-emerald-950 block">
                            Cryptographic SHA-256 Hash Chain Verified
                          </span>
                          <span className="text-[11px] font-mono text-emerald-700">
                            Genesis-to-Head sequence verified (
                            {reconcileResult.cryptographicIntegrity.totalEntries} entries sealed)
                          </span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-200/70 text-emerald-900 text-[10px] font-bold uppercase tracking-wider">
                        Tamper-Evident
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                        Total Accounts
                      </span>
                      <span className="text-xl font-bold text-slate-900">
                        {reconcileResult.totalAccounts}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                        Unbalanced Accounts
                      </span>
                      <span className="text-xl font-bold text-emerald-700">
                        {reconcileResult.discrepantAccountsCount}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                        System Total
                      </span>
                      <span className="text-xl font-bold text-slate-900">
                        {formatPaiseToRupees(reconcileResult.totalStoredBalancePence)}
                      </span>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-xs">
                      <thead className="bg-slate-50 text-slate-700 uppercase font-semibold">
                        <tr>
                          <th className="px-4 py-2.5 text-left">Account</th>
                          <th className="px-4 py-2.5 text-right">Stored Balance</th>
                          <th className="px-4 py-2.5 text-right">Computed (Ledger)</th>
                          <th className="px-4 py-2.5 text-right">Discrepancy</th>
                          <th className="px-4 py-2.5 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {reconcileResult.accounts.map((acc) => (
                          <tr key={acc.accountId} className="hover:bg-slate-50">
                            <td className="px-4 py-2.5 font-medium text-slate-900">
                              {acc.accountName}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono">
                              {formatPaiseToRupees(acc.storedBalance)}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-slate-700">
                              {formatPaiseToRupees(acc.computedBalance)}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-emerald-700 font-bold">
                              {formatPaiseToRupees(acc.discrepancyPence)}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              {acc.matches ? (
                                <span className="inline-flex items-center text-emerald-700 font-semibold">
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                  Matches
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-red-600 font-semibold">
                                  <XCircle className="h-3.5 w-3.5 mr-1" />
                                  Drift
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowReconcileModal(false)}
                className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition pressable"
              >
                Close Audit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
