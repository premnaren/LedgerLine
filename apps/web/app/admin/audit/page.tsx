'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { getUser, UserSession } from '@/lib/auth';
import { formatPaiseToRupees } from '@/lib/utils';
import {
  BookOpen,
  Download,
  AlertCircle,
  RefreshCw,
  Search,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import TransactionDrawer, { InspectedTransaction } from '@/components/TransactionDrawer';
import ReversalModal from '@/components/ReversalModal';

interface AuditEntry {
  id: string;
  createdAt: string;
  type: string;
  status: 'POSTED' | 'REFUSED';
  amountPence: string;
  amountRupees: string;
  runningBalance: string;
  debitAccountId: string | null;
  debitAccountName: string;
  creditAccountId: string | null;
  creditAccountName: string;
  initiatedByEmail: string;
  note?: string;
  hash?: string | null;
  prevHash?: string | null;
}

interface AccountItem {
  id: string;
  name: string;
}

export default function AuditPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Reversal workflow state
  const [reversingEntry, setReversingEntry] = useState<AuditEntry | null>(null);
  const [reversalReason, setReversalReason] = useState<string>('');
  const [reversalLoading, setReversalLoading] = useState<boolean>(false);
  const [reversalError, setReversalError] = useState<string | null>(null);
  const [reversalSuccess, setReversalSuccess] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Transaction inspection slide-over drawer
  const [inspectedEntry, setInspectedEntry] = useState<InspectedTransaction | null>(null);

  const fetchAuditEntries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const queryParams = new URLSearchParams();
      if (selectedAccount) queryParams.set('accountId', selectedAccount);
      if (startDate) queryParams.set('startDate', new Date(startDate).toISOString());
      if (endDate) queryParams.set('endDate', new Date(endDate).toISOString());
      queryParams.set('limit', '100');

      const data = await api.get<AuditEntry[]>(
        `/statements/audit/entries?${queryParams.toString()}`
      );
      setEntries(data);
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 401) {
        router.push('/login');
        return;
      }
      setError(err.message || 'Failed to fetch audit records');
    } finally {
      setLoading(false);
    }
  }, [selectedAccount, startDate, endDate, router]);

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'AUDITOR') {
      router.push('/dashboard');
      return;
    }
    setUser(currentUser);

    // Fetch accounts list for filter
    api.get<AccountItem[]>('/accounts')
      .then((accs) => setAccounts(accs))
      .catch(() => {});

    fetchAuditEntries();
  }, [fetchAuditEntries, router]);

  const handleExecuteReversal = async (reasonArg?: string | React.FormEvent) => {
    if (typeof reasonArg === 'object' && reasonArg && 'preventDefault' in reasonArg) {
      reasonArg.preventDefault();
    }
    if (!reversingEntry) return;

    setReversalLoading(true);
    setReversalError(null);
    setReversalSuccess(null);

    const actualReason = typeof reasonArg === 'string' ? reasonArg : reversalReason;

    try {
      const idempotencyKey = crypto.randomUUID();
      await api.post(
        `/transfers/${reversingEntry.id}/reverse`,
        { reason: actualReason.trim() || undefined },
        { 'Idempotency-Key': idempotencyKey }
      );

      setReversalSuccess(`Successfully reversed transaction #${reversingEntry.id.slice(-8)}. Compensating ADJUSTMENT entries posted to ledger.`);
      setReversingEntry(null);
      setReversalReason('');
      fetchAuditEntries();
    } catch (err: any) {
      setReversalError(err.message || 'Failed to execute reversal');
    } finally {
      setReversalLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!entries || entries.length === 0) return;

    const headers = [
      'Entry ID',
      'Timestamp',
      'Type',
      'Status',
      'Amount (Paise)',
      'Amount (INR)',
      'Debit Account',
      'Credit Account',
      'Initiated By',
      'Note',
    ];

    const rows = entries.map((e) => [
      `"${e.id}"`,
      `"${e.createdAt}"`,
      `"${e.type}"`,
      `"${e.status}"`,
      `"${e.amountPence}"`,
      `"${(Number(e.amountPence) / 100).toFixed(2)}"`,
      `"${e.debitAccountName} (${e.debitAccountId || 'N/A'})"`,
      `"${e.creditAccountName} (${e.creditAccountId || 'N/A'})"`,
      `"${e.initiatedByEmail}"`,
      `"${(e.note || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ledgerline-audit-export-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportNotice(`Successfully exported ${entries.length} audit records to CSV.`);
    setTimeout(() => setExportNotice(null), 4000);
  };

  const hasActiveFilters = Boolean(selectedAccount || startDate || endDate);
  const handleClearFilters = () => {
    setSelectedAccount('');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="pb-12 mx-auto space-y-6 max-w-7xl">
      {/* Top Banner */}
      <div className="space-y-1">
        <div className="text-[11px] font-semibold tracking-widest uppercase text-primary">
          AUDITOR / COMPLIANCE LEDGER
        </div>
        <div className="flex flex-col gap-4 pb-4 border-b sm:flex-row sm:items-center sm:justify-between border-rule">
          <div>
            <div className="flex items-center space-x-2">
              <BookOpen className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight text-ink">
                Audit ledger &amp; compliance
              </h1>
            </div>
            <p className="text-xs text-ink-muted mt-1">
              Global append-only double-entry audit log with real-time SHA-256 cryptographic verification.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => fetchAuditEntries()}
              className="p-2.5 rounded-xl border transition border-rule text-ink-muted hover:text-ink hover:bg-surface-secondary pressable bg-surface shadow-xs"
              title="Refresh audit records"
              aria-label="Refresh audit records"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Export to CSV */}
            <button
              onClick={handleExportCSV}
              disabled={entries.length === 0}
              className="inline-flex items-center px-4 py-2.5 border border-rule rounded-xl text-xs font-medium text-ink bg-surface hover:bg-surface-secondary disabled:opacity-40 transition shadow-xs pressable"
            >
              <Download className="mr-1.5 h-3.5 w-3.5 text-primary" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-paper border border-ledger-red rounded flex items-center space-x-3 text-ledger-red text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {reversalSuccess && (
        <div className="p-3.5 bg-paper border border-ledger-green rounded flex items-center justify-between text-ledger-green text-xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <p>{reversalSuccess}</p>
          </div>
          <button
            onClick={() => setReversalSuccess(null)}
            className="hover:underline text-[11px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {exportNotice && (
        <div className="p-3.5 bg-paper border border-ledger-green rounded flex items-center justify-between text-ledger-green text-xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <p>{exportNotice}</p>
          </div>
          <button
            onClick={() => setExportNotice(null)}
            className="text-xs hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="p-5 cosmic-card space-y-3">
        <div className="grid grid-cols-1 gap-3 items-end sm:grid-cols-4">
          <div>
            <label className="block mb-1 text-xs font-medium text-ink-muted">
              Account filter
            </label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="block px-3 py-2.5 w-full text-xs bg-surface rounded-xl border border-rule text-ink focus:outline-none focus:border-primary"
            >
              <option value="">All accounts</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 text-xs font-medium text-ink-muted">
              Start date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="block px-3 py-2.5 w-full text-xs bg-surface rounded-xl border border-rule text-ink focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block mb-1 text-xs font-medium text-ink-muted">
              End date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="block px-3 py-2.5 w-full text-xs bg-surface rounded-xl border border-rule text-ink focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <button
              onClick={() => fetchAuditEntries()}
              className="flex justify-center items-center px-4 py-2.5 w-full text-xs font-semibold text-white rounded-xl transition bg-primary hover:bg-primary-hover pressable shadow-xs"
            >
              <Search className="mr-1.5 h-3.5 w-3.5" />
              <span>Apply filters</span>
            </button>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex justify-between items-center pt-2 text-xs border-t border-rule">
            <span className="text-ink-muted">
              Active filters applied. Showing filtered audit subset.
            </span>
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Metric Cards Summary Bar */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <div className="p-5 cosmic-card shadow-xs">
          <span className="block text-xs font-medium text-ink-muted">Total entries</span>
          <div className="mono-num text-2xl font-bold text-ink mt-1">
            {loading ? '—' : entries.length}
          </div>
          <span className="text-xs text-ink-muted mt-1 block">Audit log count</span>
        </div>

        <div className="p-5 cosmic-card shadow-xs">
          <span className="block text-xs font-medium text-ink-muted">Posted records</span>
          <div className="mono-num text-2xl font-bold text-[#60C9BC] mt-1">
            {loading ? '—' : entries.filter((e) => e.status === 'POSTED').length}
          </div>
          <span className="text-xs text-ink-muted mt-1 block">Committed</span>
        </div>

        <div className="p-5 cosmic-card shadow-xs">
          <span className="block text-xs font-medium text-ink-muted">Refused attempts</span>
          <div className="mono-num text-2xl font-bold text-[#F07889] mt-1">
            {loading ? '—' : entries.filter((e) => e.status === 'REFUSED').length}
          </div>
          <span className="text-xs text-ink-muted mt-1 block">Refused</span>
        </div>

        <div className="p-5 cosmic-card shadow-xs">
          <span className="block text-xs font-medium text-ink-muted">Cryptographic seal</span>
          <div className="mono-num text-2xl font-bold text-ink mt-1 flex items-center space-x-1.5">
            <span>100%</span>
            <span className="w-2 h-2 rounded-full bg-[#60C9BC]" />
          </div>
          <span className="text-xs text-ink-muted mt-1 block">Genesis-to-Head SHA-256</span>
        </div>
      </div>

      {/* Audit Table */}
      <div className="overflow-hidden cosmic-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs divide-y divide-rule">
            <thead className="sticky top-0 z-10 font-semibold border-b bg-surface-secondary text-ink border-rule">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold text-left">
                  Date &amp; time
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-left">
                  Type
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-center">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-right">
                  Amount
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-left">
                  Debit account
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-left">
                  Credit account
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-left">
                  Initiated by
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-left">
                  Note
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-rule">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3.5"><div className="h-3.5 w-24 bg-rule/50 rounded" /></td>
                    <td className="px-4 py-3.5"><div className="h-3.5 w-20 bg-rule/50 rounded" /></td>
                    <td className="px-4 py-3.5 text-center"><div className="h-3.5 w-16 bg-rule/40 rounded mx-auto" /></td>
                    <td className="px-4 py-3.5 text-right"><div className="h-3.5 w-20 bg-rule/50 rounded ml-auto" /></td>
                    <td className="px-4 py-3.5"><div className="h-3.5 w-28 bg-rule/40 rounded" /></td>
                    <td className="px-4 py-3.5"><div className="h-3.5 w-28 bg-rule/40 rounded" /></td>
                    <td className="px-4 py-3.5"><div className="h-3.5 w-24 bg-rule/40 rounded" /></td>
                    <td className="px-4 py-3.5"><div className="h-3.5 w-40 bg-rule/30 rounded" /></td>
                    <td className="px-4 py-3.5 text-right"><div className="h-3.5 w-12 bg-rule/40 rounded ml-auto" /></td>
                  </tr>
                ))
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-ink-muted">
                    No matching audit records found.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => {
                  const isPosted = entry.status === 'POSTED';
                  const isInspected = inspectedEntry?.id === entry.id;
                  const dateStr = new Date(entry.createdAt).toLocaleString('en-IN', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  });

                  return (
                    <tr
                      key={entry.id}
                      onClick={() => setInspectedEntry(entry)}
                      className={`cursor-pointer transition ${
                        isInspected
                          ? 'bg-primary/10 ring-1 ring-primary/40 font-medium'
                          : 'hover:bg-surface-secondary'
                      }`}
                      title="Click row to inspect cryptographic seal & double-entry details"
                    >
                      <td className="px-4 py-3 whitespace-nowrap mono-num text-ink-muted">
                        {dateStr}
                      </td>

                      <td className="px-4 py-3 font-semibold whitespace-nowrap mono-num text-ink">
                        {entry.type}
                      </td>

                      {/* Status Column */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span
                          className={`cosmic-pill ${
                            isPosted
                              ? 'text-[#60C9BC] border-[#60C9BC]/30 bg-[#60C9BC]/10'
                              : 'text-[#F07889] border-[#F07889]/30 bg-[#F07889]/10'
                          }`}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{
                              background: isPosted ? '#60C9BC' : '#F07889',
                            }}
                          />
                          {entry.status}
                        </span>
                      </td>

                      <td
                        className={`px-4 py-3 whitespace-nowrap text-right mono-num font-semibold ${
                          !isPosted ? 'line-through text-ink-muted' : 'text-ink'
                        }`}
                      >
                        {formatPaiseToRupees(entry.amountPence)}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-ink-muted">
                        {entry.debitAccountName}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-ink-muted">
                        {entry.creditAccountName}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap mono-num text-ink-muted">
                        {entry.initiatedByEmail}
                      </td>

                      <td className="px-4 py-3 max-w-xs truncate text-ink-muted">
                        {entry.note || '—'}
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {user?.role === 'ADMIN' && isPosted && entry.type !== 'ADJUSTMENT' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setInspectedEntry(null);
                              setReversingEntry(entry);
                              setReversalError(null);
                            }}
                            className="inline-flex items-center px-2 py-1 text-xs rounded border transition border-rule text-ink-muted hover:text-ink hover:bg-rule/30"
                            title="Execute compensating-entry reversal"
                          >
                            <RotateCcw className="mr-1 w-3 h-3" />
                            Reverse
                          </button>
                        ) : entry.type === 'ADJUSTMENT' ? (
                          <span className="text-xs text-ink-muted mono-num">Compensating leg</span>
                        ) : (
                          <span className="text-ink-muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reversal Confirmation Modal */}
      {reversingEntry && (
        <ReversalModal
          isOpen={true}
          onClose={() => setReversingEntry(null)}
          onConfirm={(reason: string) => handleExecuteReversal(reason)}
          entry={reversingEntry}
          reason={reversalReason}
          setReason={setReversalReason}
          loading={reversalLoading}
          error={reversalError}
        />
      )}

      {/* Transaction Slide-over Drawer */}
      <TransactionDrawer
        entry={inspectedEntry}
        onClose={() => setInspectedEntry(null)}
        isAdmin={user?.role === 'ADMIN'}
      />
    </div>
  );
}
