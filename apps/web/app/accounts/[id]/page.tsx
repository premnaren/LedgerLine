'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { getUser, UserSession } from '@/lib/auth';
import { formatPaiseToRupees } from '@/lib/utils';
import {
  ArrowLeft,
  ArrowRightLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Clock,
  ShieldCheck,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import TransactionDrawer, { InspectedTransaction } from '@/components/TransactionDrawer';
import ReversalModal from '@/components/ReversalModal';

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

interface StatementEntry {
  id: string;
  createdAt: string;
  type: string;
  status: 'POSTED' | 'REFUSED';
  amountPence: string;
  runningBalance: string;
  direction: 'DEBIT' | 'CREDIT';
  isDebit: boolean;
  debitAccountId?: string | null;
  creditAccountId?: string | null;
  initiatedBy: {
    email: string;
  };
  note?: string;
  hash?: string | null;
  prevHash?: string | null;
}

interface StatementResponse {
  accountId: string;
  accountName: string;
  balancePence: string;
  entries: StatementEntry[];
  nextCursor: string | null;
  hasMore: boolean;
}

export default function AccountStatementPage() {
  const params = useParams();
  const router = useRouter();
  const accountId = params.id as string;

  const [statement, setStatement] = useState<StatementResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([null]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const [user, setUser] = useState<UserSession | null>(null);
  const [reconcileResult, setReconcileResult] = useState<AccountReconciliationResult | null>(null);
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [reconcileLoading, setReconcileLoading] = useState(false);

  // Reversal workflow
  const [reversingEntry, setReversingEntry] = useState<StatementEntry | null>(null);
  const [reversalReason, setReversalReason] = useState<string>('');
  const [reversalLoading, setReversalLoading] = useState<boolean>(false);
  const [reversalError, setReversalError] = useState<string | null>(null);
  const [reversalSuccess, setReversalSuccess] = useState<string | null>(null);

  // Transaction inspection slide-over drawer
  const [inspectedEntry, setInspectedEntry] = useState<InspectedTransaction | null>(null);

  useEffect(() => {
    setUser(getUser());
  }, []);

  const fetchStatement = useCallback(
    async (cursor?: string | null) => {
      try {
        setLoading(true);
        setError(null);
        const queryParams = new URLSearchParams({ limit: '15' });
        if (cursor) {
          queryParams.set('cursor', cursor);
        }

        const data = await api.get<StatementResponse>(
          `/accounts/${accountId}/statement?${queryParams.toString()}`
        );
        setStatement(data);
      } catch (err: any) {
        if (err instanceof ApiError && err.status === 401) {
          router.push('/login');
          return;
        }
        setError(err.message || 'Failed to fetch statement');
      } finally {
        setLoading(false);
      }
    },
    [accountId, router]
  );

  useEffect(() => {
    fetchStatement(cursorHistory[currentPageIndex]);
  }, [fetchStatement, cursorHistory, currentPageIndex]);

  const handleNextPage = () => {
    if (statement?.nextCursor) {
      setCursorHistory((prev) => [...prev, statement.nextCursor]);
      setCurrentPageIndex((prev) => prev + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex((prev) => prev - 1);
    }
  };

  const handleReconcileAccount = async () => {
    setReconcileLoading(true);
    setShowReconcileModal(true);
    try {
      const data = await api.get<AccountReconciliationResult>(`/accounts/${accountId}/reconcile`);
      setReconcileResult(data);
    } catch (err: any) {
      setError(err.message || 'Account reconciliation failed');
    } finally {
      setReconcileLoading(false);
    }
  };

  const handleExecuteReversal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversingEntry) return;

    setReversalLoading(true);
    setReversalError(null);
    setReversalSuccess(null);

    try {
      const idempotencyKey = crypto.randomUUID();
      await api.post(
        `/transfers/${reversingEntry.id}/reverse`,
        { reason: reversalReason.trim() || undefined },
        { 'Idempotency-Key': idempotencyKey }
      );

      setReversalSuccess(`Successfully reversed entry #${reversingEntry.id.slice(-8)}. Compensating ADJUSTMENT posted.`);
      setReversingEntry(null);
      setReversalReason('');
      fetchStatement(cursorHistory[currentPageIndex]);
    } catch (err: any) {
      setReversalError(err.message || 'Failed to execute reversal');
    } finally {
      setReversalLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard"
            className="p-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100 transition shadow-sm"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {statement?.accountName || 'Account Statement'}
              </h1>
              <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full">
                {accountId}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Append-only audit trail with immutable balance tracking
            </p>
          </div>
        </div>

        {statement && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-right mr-2">
              <span className="text-xs text-slate-500 uppercase font-semibold block">
                Current Balance
              </span>
              <span className="text-2xl font-black text-slate-900">
                {formatPaiseToRupees(statement.balancePence)}
              </span>
            </div>

            {(user?.role === 'ADMIN' || user?.role === 'AUDITOR') && (
              <button
                onClick={handleReconcileAccount}
                className="inline-flex items-center px-3.5 py-2 border border-emerald-300 rounded-lg shadow-sm text-sm font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 transition"
                title="Verify double-entry reconciliation for this account"
              >
                <ShieldCheck className="mr-1.5 h-4 w-4 text-emerald-600" />
                Reconcile
              </button>
            )}

            {user?.role !== 'AUDITOR' && (
              <Link
                href={`/accounts/${accountId}/transfer`}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 transition"
              >
                <ArrowRightLeft className="mr-1.5 h-4 w-4" />
                Transfer
              </Link>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-3 text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {reversalSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-800">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <p className="text-sm font-medium">{reversalSuccess}</p>
          </div>
          <button
            onClick={() => setReversalSuccess(null)}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Statement Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th scope="col" className="px-6 py-3.5 text-left">
                  Date &amp; Time ↓ Newest first
                </th>
                <th scope="col" className="px-6 py-3.5 text-left">
                  Entry Type
                </th>
                <th scope="col" className="px-6 py-3.5 text-right">
                  Amount (₹)
                </th>
                <th scope="col" className="px-6 py-3.5 text-center">
                  Status
                </th>
                <th scope="col" className="px-6 py-3.5 text-right">
                  Running Balance (₹)
                </th>
                <th scope="col" className="px-6 py-3.5 text-left">
                  Initiated By
                </th>
                <th scope="col" className="px-6 py-3.5 text-left">
                  Note
                </th>
                <th scope="col" className="px-6 py-3.5 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    Loading statement ledger entries...
                  </td>
                </tr>
              ) : statement?.entries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    No ledger entries found for this account.
                  </td>
                </tr>
              ) : (
                statement?.entries.map((entry) => {
                  const isPosted = entry.status === 'POSTED';
                  const isSelected = inspectedEntry?.id === entry.id;
                  const dateStr = new Date(entry.createdAt).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  });

                  return (
                    <tr
                      key={entry.id}
                      onClick={() => setInspectedEntry(entry as any)}
                      className={`cursor-pointer transition border-l-4 ${
                        isSelected
                          ? 'bg-sky-50/90 border-l-sky-600 font-medium ring-1 ring-inset ring-sky-300/80 shadow-2xs'
                          : !isPosted
                          ? 'bg-red-50/60 hover:bg-red-100/60 border-l-transparent'
                          : 'hover:bg-sky-50/50 border-l-transparent'
                      }`}
                      title="Click row to inspect cryptographic seal & double-entry T-account details"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-slate-700 font-mono text-xs">
                        <div className="flex items-center space-x-1.5">
                          {isSelected && (
                            <span className="inline-block w-2 h-2 rounded-full bg-sky-600 shrink-0 animate-pulse" />
                          )}
                          <span>{dateStr}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800">
                          {entry.type}
                        </span>
                      </td>

                      <td
                        className={`px-6 py-4 whitespace-nowrap text-right font-bold font-mono ${
                          !isPosted
                            ? 'text-red-600 line-through'
                            : entry.direction === 'DEBIT'
                            ? 'text-red-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        {entry.direction === 'DEBIT' ? '-' : '+'}
                        {formatPaiseToRupees(entry.amountPence)}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {isPosted ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                            POSTED
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
                            <XCircle className="mr-1 h-3.5 w-3.5" />
                            REFUSED
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right font-mono font-semibold text-slate-900">
                        {formatPaiseToRupees(entry.runningBalance)}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-slate-600 text-xs">
                        {entry.initiatedBy.email}
                      </td>

                      <td className="px-6 py-4 text-slate-500 text-xs max-w-xs truncate">
                        {entry.note || '—'}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                        {user?.role === 'ADMIN' && isPosted && entry.type !== 'ADJUSTMENT' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setInspectedEntry(null);
                              setReversingEntry(entry);
                              setReversalError(null);
                            }}
                            className="inline-flex items-center px-2.5 py-1 border border-amber-300 rounded-md text-amber-800 bg-amber-50 hover:bg-amber-100 font-medium transition shadow-xs"
                            title="Execute compensating-entry reversal"
                          >
                            <RotateCcw className="mr-1 h-3 w-3" />
                            Reverse
                          </button>
                        ) : entry.type === 'ADJUSTMENT' ? (
                          <span className="text-slate-400 font-mono text-[11px]">Compensating Leg</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Page {currentPageIndex + 1}
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePreviousPage}
              disabled={currentPageIndex === 0 || loading}
              className="inline-flex items-center px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </button>

            <button
              onClick={handleNextPage}
              disabled={!statement?.hasMore || loading}
              className="inline-flex items-center px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 transition"
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Account Double-Entry Reconciliation Modal */}
      {showReconcileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Account Reconciliation Proof
                  </h3>
                  <p className="text-xs text-slate-500">
                    {statement?.accountName} ({accountId})
                  </p>
                </div>
              </div>

              {reconcileResult && (
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    reconcileResult.matches
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-red-100 text-red-800 border-red-300'
                  }`}
                >
                  {reconcileResult.matches ? 'BALANCED ✓' : 'DRIFT'}
                </span>
              )}
            </div>

            <div className="py-4">
              {reconcileLoading ? (
                <div className="py-8 text-center text-slate-500">
                  Aggregating all immutable ledger credits and debits...
                </div>
              ) : reconcileResult ? (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[11px] text-slate-500 uppercase font-semibold block">Total Posted Credits</span>
                      <span className="text-base font-bold text-emerald-700 font-mono">
                        +{formatPaiseToRupees(reconcileResult.totalCreditsPence)}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[11px] text-slate-500 uppercase font-semibold block">Total Posted Debits</span>
                      <span className="text-base font-bold text-red-600 font-mono">
                        -{formatPaiseToRupees(reconcileResult.totalDebitsPence)}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Net Ledger Sum (Credits - Debits):</span>
                      <span className="font-bold font-mono text-slate-900">{formatPaiseToRupees(reconcileResult.computedBalance)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Stored Account Balance:</span>
                      <span className="font-bold font-mono text-slate-900">{formatPaiseToRupees(reconcileResult.storedBalance)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-200">
                      <span className="font-semibold text-slate-700">Discrepancy Delta:</span>
                      <span className="font-bold font-mono text-emerald-700">{formatPaiseToRupees(reconcileResult.discrepancyPence)}</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Proves that the account balance is 100% derived from and matches the net sum of all immutable ledger entries.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowReconcileModal(false)}
                className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reversal Confirmation Modal */}
      <ReversalModal
        entry={reversingEntry}
        onClose={() => setReversingEntry(null)}
        onConfirm={async (reason) => {
          if (!reversingEntry) return;
          setReversalLoading(true);
          setReversalError(null);
          setReversalSuccess(null);

          try {
            const idempotencyKey = crypto.randomUUID();
            await api.post(
              `/transfers/${reversingEntry.id}/reverse`,
              { reason },
              { 'Idempotency-Key': idempotencyKey }
            );

            setReversalSuccess(
              `Successfully reversed transaction #${reversingEntry.id.slice(-8)}. Compensating ADJUSTMENT entries posted to ledger.`
            );
            setReversingEntry(null);
            fetchStatement(cursorHistory[currentPageIndex]);
          } catch (err: any) {
            setReversalError(err.message || 'Failed to execute reversal');
          } finally {
            setReversalLoading(false);
          }
        }}
        loading={reversalLoading}
        error={reversalError}
      />

      {/* Slide-Over Transaction Inspection Drawer - Suppressed when Reversal Modal is active */}
      {(() => {
        const currentInspectedIndex = statement?.entries
          ? statement.entries.findIndex((e) => e.id === inspectedEntry?.id)
          : -1;

        return (
          <TransactionDrawer
            entry={reversingEntry ? null : inspectedEntry}
            onClose={() => setInspectedEntry(null)}
            onReverse={(e) => {
              setInspectedEntry(null);
              setReversingEntry(e as any);
            }}
            isAdmin={user?.role === 'ADMIN'}
            onNavigatePrevious={() => {
              if (currentInspectedIndex > 0 && statement?.entries) {
                setInspectedEntry(statement.entries[currentInspectedIndex - 1] as any);
              }
            }}
            onNavigateNext={() => {
              if (
                currentInspectedIndex >= 0 &&
                statement?.entries &&
                currentInspectedIndex < statement.entries.length - 1
              ) {
                setInspectedEntry(statement.entries[currentInspectedIndex + 1] as any);
              }
            }}
            hasPrevious={currentInspectedIndex > 0}
            hasNext={
              currentInspectedIndex >= 0 &&
              !!statement?.entries &&
              currentInspectedIndex < statement.entries.length - 1
            }
          />
        );
      })()}
    </div>
  );
}

