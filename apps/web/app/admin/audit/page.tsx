'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { getUser, UserSession } from '@/lib/auth';
import { formatPaiseToRupees } from '@/lib/utils';
import {
  BookOpen,
  Download,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
} from 'lucide-react';

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
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <BookOpen className="h-6 w-6 text-sky-600" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Auditor & Compliance Ledger
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Global append-only audit view: Showing all ledger postings including REFUSED attempts.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchAuditEntries()}
            className="p-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100 transition shadow-sm"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            disabled={entries.length === 0}
            className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg shadow-sm text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 transition"
          >
            <Download className="mr-2 h-4 w-4 text-slate-500" />
            Export to CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-3 text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
            Filter Account
          </label>
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
          >
            <option value="">All Accounts</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
          />
        </div>

        <div>
          <button
            onClick={() => fetchAuditEntries()}
            className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 transition"
          >
            <Search className="mr-2 h-4 w-4" />
            Apply Filters
          </button>
        </div>
      </div>

      {/* Global Audit Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th scope="col" className="px-5 py-3.5 text-left">
                  Date
                </th>
                <th scope="col" className="px-5 py-3.5 text-left">
                  Type
                </th>
                <th scope="col" className="px-5 py-3.5 text-center">
                  Status
                </th>
                <th scope="col" className="px-5 py-3.5 text-right">
                  Amount (₹)
                </th>
                <th scope="col" className="px-5 py-3.5 text-left">
                  Debit Account
                </th>
                <th scope="col" className="px-5 py-3.5 text-left">
                  Credit Account
                </th>
                <th scope="col" className="px-5 py-3.5 text-left">
                  Initiated By
                </th>
                <th scope="col" className="px-5 py-3.5 text-left">
                  Note
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    Loading global audit entries...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
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
                      className={
                        !isPosted
                          ? 'bg-red-50/60 hover:bg-red-50 transition'
                          : 'hover:bg-slate-50 transition'
                      }
                    >
                      <td className="px-5 py-3 whitespace-nowrap text-xs font-mono text-slate-600">
                        {dateStr}
                      </td>

                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-800">
                          {entry.type}
                        </span>
                      </td>

                      <td className="px-5 py-3 whitespace-nowrap text-center">
                        {isPosted ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            POSTED
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
                            <XCircle className="mr-1 h-3 w-3" />
                            REFUSED
                          </span>
                        )}
                      </td>

                      <td
                        className={`px-5 py-3 whitespace-nowrap text-right font-mono font-bold ${
                          !isPosted ? 'text-red-500 line-through' : 'text-slate-900'
                        }`}
                      >
                        {formatPaiseToRupees(entry.amountPence)}
                      </td>

                      <td className="px-5 py-3 whitespace-nowrap text-xs text-slate-700">
                        {entry.debitAccountName}
                      </td>

                      <td className="px-5 py-3 whitespace-nowrap text-xs text-slate-700">
                        {entry.creditAccountName}
                      </td>

                      <td className="px-5 py-3 whitespace-nowrap text-xs text-slate-600">
                        {entry.initiatedByEmail}
                      </td>

                      <td className="px-5 py-3 text-xs text-slate-500 max-w-xs truncate">
                        {entry.note || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

