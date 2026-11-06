'use client';

import React, { useEffect, useState, useCallback } from 'react';
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

    // Refresh on focus
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

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Accounts Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {user?.role === 'ADMIN' && 'System-wide ledger control: Viewing all accounts with full debit/credit authority.'}
            {user?.role === 'HOLDER' && 'Personal accounts overview: Viewing accounts where you are a registered holder.'}
            {user?.role === 'AUDITOR' && 'Auditor view: Read-only observation across all ledger accounts.'}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchAccounts()}
            className="p-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100 transition shadow-sm"
            title="Refresh on demand"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {(user?.role === 'ADMIN' || user?.role === 'AUDITOR') && (
            <button
              onClick={handleVerifyIntegrity}
              className="inline-flex items-center px-3.5 py-2 border border-emerald-300 rounded-lg shadow-sm text-sm font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 transition"
              title="Verify double-entry reconciliation across all accounts"
            >
              <ShieldCheck className="mr-1.5 h-4 w-4 text-emerald-600" />
              Verify Ledger Integrity
            </button>
          )}

          {user?.role === 'ADMIN' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 transition"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              New Account
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-3 text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Account Cards Grid */}
      {loading && accounts.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-white border border-slate-200 rounded-2xl p-6 animate-pulse"></div>
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((acc) => {
            const balanceNum = Number(acc.balancePence);
            const isNegative = balanceNum < 0;

            return (
              <div
                key={acc.id}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full font-mono">
                      ID: {acc.id.slice(0, 10)}...
                    </span>
                    <span className="text-xs text-slate-400">v{acc.version}</span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mb-1">{acc.name}</h3>

                  <div className="mt-3">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
                      Current Balance
                    </span>
                    <span
                      className={`text-2xl font-black tracking-tight ${
                        isNegative ? 'text-red-600' : 'text-slate-900'
                      }`}
                    >
                      {formatPaiseToRupees(acc.balancePence)}
                    </span>
                  </div>

                  {acc.overdraftLimit !== '0' && (
                    <p className="text-xs text-slate-500 mt-1">
                      Overdraft limit: {formatPaiseToRupees(acc.overdraftLimit)}
                    </p>
                  )}

                  {acc.holders && acc.holders.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                      <span className="font-medium text-slate-600">Holders:</span>{' '}
                      {acc.holders.map((h) => h.user.email).join(', ')}
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Link
                    href={`/accounts/${acc.id}`}
                    className="flex-1 inline-flex justify-center items-center py-2 px-3 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    <FileText className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
                    Statement
                  </Link>

                  {user?.role !== 'AUDITOR' && (
                    <Link
                      href={`/accounts/${acc.id}/transfer`}
                      className="flex-1 inline-flex justify-center items-center py-2 px-3 border border-transparent rounded-lg text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 transition"
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

      {/* Create Account Modal (Admin only) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Create New Ledger Account</h3>
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">
                  Account Name
                </label>
                <input
                  type="text"
                  required
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  placeholder="e.g. Treasury Operations"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Initial Balance (₹)
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 font-medium">
                    ₹
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newAccountBalance}
                    onChange={(e) => setNewAccountBalance(e.target.value)}
                    className="block w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Overdraft Limit (₹)
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 font-medium">
                    ₹
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newAccountOverdraft}
                    onChange={(e) => setNewAccountOverdraft(e.target.value)}
                    className="block w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition disabled:opacity-50"
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
                    Independent mathematical proof: <code>Account.balancePence</code> vs. <code>∑(Credits) - ∑(Debits)</code>
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
                  <p className="text-sm">Aggregating immutable ledger entries across all system accounts...</p>
                </div>
              ) : reconcileResult ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase block">Total Accounts</span>
                      <span className="text-xl font-bold text-slate-900">{reconcileResult.totalAccounts}</span>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase block">Unbalanced Accounts</span>
                      <span className="text-xl font-bold text-emerald-700">{reconcileResult.discrepantAccountsCount}</span>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase block">System Total</span>
                      <span className="text-xl font-bold text-slate-900">{formatPaiseToRupees(reconcileResult.totalStoredBalancePence)}</span>
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
                            <td className="px-4 py-2.5 font-medium text-slate-900">{acc.accountName}</td>
                            <td className="px-4 py-2.5 text-right font-mono">{formatPaiseToRupees(acc.storedBalance)}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-slate-700">{formatPaiseToRupees(acc.computedBalance)}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-emerald-700 font-bold">{formatPaiseToRupees(acc.discrepancyPence)}</td>
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
                className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition"
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

