'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
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
} from 'lucide-react';

interface StatementEntry {
  id: string;
  createdAt: string;
  type: string;
  status: 'POSTED' | 'REFUSED';
  amountPence: string;
  runningBalance: string;
  direction: 'DEBIT' | 'CREDIT';
  isDebit: boolean;
  initiatedBy: {
    email: string;
  };
  note?: string;
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
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <span className="text-xs text-slate-500 uppercase font-semibold block">
                Current Balance
              </span>
              <span className="text-2xl font-black text-slate-900">
                {formatPaiseToRupees(statement.balancePence)}
              </span>
            </div>

            <Link
              href={`/accounts/${accountId}/transfer`}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 transition"
            >
              <ArrowRightLeft className="mr-1.5 h-4 w-4" />
              Transfer
            </Link>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-3 text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Statement Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th scope="col" className="px-6 py-3.5 text-left">
                  Date & Time
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    Loading statement ledger entries...
                  </td>
                </tr>
              ) : statement?.entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No ledger entries found for this account.
                  </td>
                </tr>
              ) : (
                statement?.entries.map((entry) => {
                  const isPosted = entry.status === 'POSTED';
                  const dateStr = new Date(entry.createdAt).toLocaleString('en-IN', {
                    dateStyle: 'medium',
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
                      <td className="px-6 py-4 whitespace-nowrap text-slate-700 font-mono text-xs">
                        {dateStr}
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
    </div>
  );
}

