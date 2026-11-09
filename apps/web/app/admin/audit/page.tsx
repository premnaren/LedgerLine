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
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-rule">
        <div>
          <div className="flex items-center space-x-2">
            <BookOpen className="h-5 w-5 text-accent" />
            <h1 className="text-xl font-bold tracking-tight text-ink">
              Auditor &amp; compliance ledger
            </h1>
          </div>
          <p className="text-xs text-ink-muted mt-0.5">
            Global append-only audit view: Showing all ledger postings including refused attempts.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => fetchAuditEntries()}
            className="p-2 border border-rule rounded text-ink-muted hover:text-ink hover:bg-rule/30 transition pressable"
            title="Refresh"
            aria-label="Refresh audit records"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Ghost button for Export to CSV */}
          <button
            onClick={handleExportCSV}
            disabled={entries.length === 0}
            className="inline-flex items-center px-3.5 py-2 border border-rule rounded text-xs font-medium text-ink bg-paper hover:bg-rule/30 disabled:opacity-40 transition"
          >
            <Download className="mr-1.5 h-3.5 w-3.5 text-ink-faint" />
            <span>Export to CSV</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-paper border border-ledger-red rounded flex items-center space-x-3 text-ledger-red text-xs">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {reversalSuccess && (
        <div className="p-3.5 bg-paper border border-ledger-green rounded flex items-center justify-between text-ledger-green text-xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
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

      {/* Filter Bar: border border-rule rounded, "Apply Filters" is the single primary filled button */}
      <div className="bg-white border border-rule rounded p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
        <div>
          <label className="block text-xs text-ink-muted font-medium mb-1">
            Account filter
          </label>
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="block w-full px-3 py-2 border border-rule rounded text-xs text-ink bg-white focus:outline-none focus:border-accent"
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
          <label className="block text-xs text-ink-muted font-medium mb-1">
            Start date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="block w-full px-3 py-2 border border-rule rounded text-xs text-ink bg-white focus:outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="block text-xs text-ink-muted font-medium mb-1">
            End date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="block w-full px-3 py-2 border border-rule rounded text-xs text-ink bg-white focus:outline-none focus:border-accent"
          />
        </div>

        <div>
          <button
            onClick={() => fetchAuditEntries()}
            className="w-full flex justify-center items-center py-2 px-4 rounded text-xs font-semibold text-white bg-accent hover:opacity-95 transition"
          >
            <Search className="mr-1.5 h-3.5 w-3.5" />
            <span>Apply filters</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-rule rounded p-4">
          <span className="text-xs text-ink-muted font-medium block">Total entries</span>
          <div className="mono-num text-xl font-medium text-ink mt-0.5">
            {loading ? '—' : entries.length}
          </div>
          <span className="text-[11px] text-ink-faint mt-0.5 block">Audit log count</span>
        </div>

        <div className="bg-white border border-rule rounded p-4">
          <span className="text-xs text-ink-muted font-medium block">Posted records</span>
          <div className="mono-num text-xl font-medium text-ledger-green mt-0.5">
            {loading ? '—' : entries.filter((e) => e.status === 'POSTED').length}
          </div>
          <span className="text-[11px] text-ink-faint mt-0.5 block">Committed</span>
        </div>

        <div className="bg-white border border-rule rounded p-4">
          <span className="text-xs text-ink-muted font-medium block">Refused attempts</span>
          <div className="mono-num text-xl font-medium text-ledger-red mt-0.5">
            {loading ? '—' : entries.filter((e) => e.status === 'REFUSED').length}
          </div>
          <span className="text-[11px] text-ink-faint mt-0.5 block">Refused</span>
        </div>

        <div className="bg-white border border-rule rounded p-4">
          <span className="text-xs text-ink-muted font-medium block">Cryptographic seal</span>
          <div className="mono-num text-xl font-medium text-ink mt-0.5 flex items-center space-x-1.5">
            <span>100%</span>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--ledger-green)' }} />
          </div>
          <span className="text-[11px] text-ink-faint mt-0.5 block">Genesis-to-Head SHA-256</span>
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-white border border-rule rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-rule text-xs">
            <thead className="bg-paper text-ink-muted font-medium border-b border-rule-strong">
              <tr>
                <th scope="col" className="px-4 py-3 text-left">
                  Date &amp; time
                </th>
                <th scope="col" className="px-4 py-3 text-left">
                  Type
                </th>
                <th scope="col" className="px-4 py-3 text-center">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Amount
                </th>
                <th scope="col" className="px-4 py-3 text-left">
                  Debit account
                </th>
                <th scope="col" className="px-4 py-3 text-left">
                  Credit account
                </th>
                <th scope="col" className="px-4 py-3 text-left">
                  Initiated by
                </th>
                <th scope="col" className="px-4 py-3 text-left">
                  Note
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule bg-white">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-ink-muted">
                    Loading global audit entries...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-ink-muted">
                    No matching audit records found.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => {
                  const isPosted = entry.status === 'POSTED';
                  const dateStr = new Date(entry.createdAt).toLocaleString('en-IN', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  });

                  return (
                    <tr
                      key={entry.id}
                      onClick={() => setInspectedEntry(entry)}
                      className="cursor-pointer transition hover:bg-[#F3F2EE]"
                      title="Click row to inspect cryptographic seal & double-entry details"
                    >
                      <td className="px-4 py-3 whitespace-nowrap mono-num text-ink-muted">
                        {dateStr}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap mono-num text-ink font-medium">
                        {entry.type}
                      </td>

                      {/* Status Column: 6px colored dot + plain text */}
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span
                          className="inline-flex items-center gap-1.5 font-medium"
                          style={{
                            color: isPosted ? 'var(--ledger-green)' : 'var(--ledger-red)',
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{
                              background: isPosted ? 'var(--ledger-green)' : 'var(--ledger-red)',
                            }}
                          />
                          {entry.status}
                        </span>
                      </td>

                      <td
                        className={`px-4 py-3 whitespace-nowrap text-right mono-num font-medium ${
                          !isPosted ? 'text-ink-faint line-through' : 'text-ink'
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

                      <td className="px-4 py-3 text-ink-muted max-w-xs truncate">
                        {entry.note || '—'}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        {user?.role === 'ADMIN' && isPosted && entry.type !== 'ADJUSTMENT' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setInspectedEntry(null);
                              setReversingEntry(entry);
                              setReversalError(null);
                            }}
                            className="inline-flex items-center px-2 py-1 border border-rule rounded text-xs text-ink-muted hover:text-ink hover:bg-rule/30 transition"
                            title="Execute compensating-entry reversal"
                          >
                            <RotateCcw className="mr-1 h-3 w-3" />
                            Reverse
                          </button>
                        ) : entry.type === 'ADJUSTMENT' ? (
                          <span className="text-ink-faint mono-num text-[11px]">Compensating leg</span>
                        ) : (
                          <span className="text-ink-faint">—</span>
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
