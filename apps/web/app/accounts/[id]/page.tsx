'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { getUser, UserSession } from '@/lib/auth';
import { formatPaiseToRupees } from '@/lib/utils';
import {
  ArrowLeft,
  ArrowRightLeft,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
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

// Client-side computed SVG line chart of balance over time with interactive scrubbing inspector
function BalanceHistoryChart({ entries, loading }: { entries?: StatementEntry[]; loading?: boolean }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const chartData = useMemo(() => {
    if (!entries || entries.length === 0) return null;
    const chronological = [...entries].reverse();
    const values = chronological.map((e) => Number(e.runningBalance) / 100);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 10;

    // Generous spacious dimensions to eliminate congestion
    const width = 800;
    const height = 200;
    const padTop = 24;
    const padBottom = 32;
    const padLeft = 85;
    const padRight = 35;

    const usableWidth = width - padLeft - padRight;
    const usableHeight = height - padTop - padBottom;

    const coords = chronological.map((e, idx) => {
      const val = Number(e.runningBalance) / 100;
      const x =
        chronological.length > 1
          ? padLeft + (idx / (chronological.length - 1)) * usableWidth
          : padLeft + usableWidth / 2;
      const y = padTop + (1 - (val - minVal) / range) * usableHeight;
      return { x, y, val, entry: e };
    });

    const pathD =
      coords.length > 0
        ? coords.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`, '')
        : '';

    const areaD =
      coords.length > 0
        ? `${pathD} L ${coords[coords.length - 1].x.toFixed(1)} ${(padTop + usableHeight).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(padTop + usableHeight).toFixed(1)} Z`
        : '';

    const firstDate = new Date(chronological[0].createdAt).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
    });
    const lastDate = new Date(chronological[chronological.length - 1].createdAt).toLocaleDateString(
      'en-IN',
      { month: 'short', day: 'numeric' }
    );

    return {
      coords,
      pathD,
      areaD,
      minVal,
      maxVal,
      midVal: (minVal + maxVal) / 2,
      firstDate,
      lastDate,
      width,
      height,
      padLeft,
      padTop,
      padRight,
      usableWidth,
      usableHeight,
    };
  }, [entries]);

  if (loading) {
    return (
      <div className="bg-surface border border-rule rounded-lg p-5 space-y-3 animate-pulse shadow-xs">
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 bg-rule/50 rounded" />
          <div className="h-3.5 w-20 bg-rule/40 rounded" />
        </div>
        <div className="h-52 bg-surface-secondary/70 border border-dashed border-rule rounded-lg flex items-center justify-center">
          <span className="mono-num text-xs text-ink-faint">Loading balance history stream...</span>
        </div>
      </div>
    );
  }

  if (!chartData || chartData.coords.length === 0) return null;

  const { coords, pathD, areaD, minVal, maxVal, midVal, firstDate, lastDate, width, height, padLeft, padTop, usableWidth, usableHeight } = chartData;
  const activePt = hoveredIdx !== null && coords[hoveredIdx] ? coords[hoveredIdx] : null;

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    const relX = ((e.clientX - rect.left) / rect.width) * width;
    let closestIdx = 0;
    let minDiff = Infinity;
    coords.forEach((pt, i) => {
      const diff = Math.abs(pt.x - relX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    });
    setHoveredIdx(closestIdx);
  };

  return (
    <div className="bg-surface border border-rule rounded-lg p-5 space-y-4 shadow-xs">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <span className="text-xs text-ink font-semibold">Balance over time</span>
          <span className="text-xs text-ink-muted">·</span>
          <span className="text-xs mono-num text-ink-muted">
            {coords.length} {coords.length === 1 ? 'record' : 'records'}
          </span>
        </div>
        {activePt && (
          <span className="text-xs mono-num text-primary font-semibold">
            Point #{hoveredIdx! + 1} of {coords.length}
          </span>
        )}
      </div>

      {/* Fixed-Height Scrubbing Ribbon (Guarantees ZERO layout shift / zero glitching on hover) */}
      <div className="min-h-[44px] h-[44px] bg-surface-secondary border border-rule rounded-lg px-3.5 flex items-center justify-between text-xs transition">
        {activePt ? (
          <div className="flex items-center justify-between w-full gap-3">
            <div className="flex items-center space-x-2 min-w-0">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  background:
                    activePt.entry.status === 'REFUSED'
                      ? 'var(--ink-faint)'
                      : activePt.entry.direction === 'DEBIT'
                      ? 'var(--danger)'
                      : 'var(--success)',
                }}
              />
              <span className="font-semibold text-ink truncate max-w-[280px]">
                {activePt.entry.note || activePt.entry.type}
              </span>
              <span className="text-ink-muted">·</span>
              <span className="mono-num text-xs text-ink-muted whitespace-nowrap">
                {new Date(activePt.entry.createdAt).toLocaleString('en-IN', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            <div className="flex items-center space-x-3 mono-num ml-auto shrink-0">
              <span
                className={`font-semibold ${
                  activePt.entry.status === 'REFUSED'
                    ? 'text-ink-muted line-through'
                    : activePt.entry.direction === 'DEBIT'
                    ? 'text-danger'
                    : 'text-success'
                }`}
              >
                {activePt.entry.status === 'REFUSED'
                  ? 'REFUSED'
                  : `${activePt.entry.direction === 'DEBIT' ? '−' : '+'}₹${(
                      Number(activePt.entry.amountPence) / 100
                    ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
              </span>
              <span className="text-ink-muted">→</span>
              <span className="font-bold text-ink bg-surface px-2.5 py-0.5 rounded-lg border border-rule">
                ₹{activePt.val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full text-ink-muted">
            <span className="flex items-center gap-1.5 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span>Hover anywhere across the chart to inspect balance transitions</span>
            </span>
            <span className="mono-num text-[11px] hidden sm:inline">
              Range: ₹{minVal.toLocaleString('en-IN', { minimumFractionDigits: 0 })} – ₹{maxVal.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </span>
          </div>
        )}
      </div>

      {/* SVG Canvas with Generous Breathing Room */}
      <div className="w-full relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-52 overflow-visible select-none cursor-crosshair"
          preserveAspectRatio="none"
          onMouseMove={handleSvgMouseMove}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            <linearGradient id="balanceAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.20" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Hairline Gridlines */}
          <line
            x1={padLeft}
            y1={padTop}
            x2={padLeft + usableWidth}
            y2={padTop}
            stroke="var(--rule)"
            strokeDasharray="3 3"
            opacity="0.6"
          />
          <line
            x1={padLeft}
            y1={padTop + usableHeight / 2}
            x2={padLeft + usableWidth}
            y2={padTop + usableHeight / 2}
            stroke="var(--rule)"
            strokeDasharray="3 3"
            opacity="0.6"
          />
          <line
            x1={padLeft}
            y1={padTop + usableHeight}
            x2={padLeft + usableWidth}
            y2={padTop + usableHeight}
            stroke="var(--rule)"
            strokeDasharray="3 3"
            opacity="0.6"
          />

          {/* Y-axis Labels with Clean Breathing Room */}
          <text
            x={padLeft - 12}
            y={padTop + 4}
            textAnchor="end"
            className="mono-num text-[11px]"
            fill="var(--ink-muted)"
          >
            ₹{maxVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </text>
          <text
            x={padLeft - 12}
            y={padTop + usableHeight / 2 + 4}
            textAnchor="end"
            className="mono-num text-[11px]"
            fill="var(--ink-muted)"
          >
            ₹{midVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </text>
          <text
            x={padLeft - 12}
            y={padTop + usableHeight + 4}
            textAnchor="end"
            className="mono-num text-[11px]"
            fill="var(--ink-muted)"
          >
            ₹{minVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </text>

          {/* Soft Gradient Area Fill */}
          {areaD && <path d={areaD} fill="url(#balanceAreaGrad)" />}

          {/* Active Vertical Guideline on Hover */}
          {activePt && (
            <line
              x1={activePt.x}
              y1={padTop}
              x2={activePt.x}
              y2={padTop + usableHeight}
              stroke="var(--primary)"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              opacity="0.75"
            />
          )}

          {/* Balance Path Line */}
          <path
            d={pathD}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Data Points */}
          {coords.map((pt, i) => {
            const isHovered = hoveredIdx === i;
            return (
              <g key={i}>
                {isHovered && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={9}
                    fill="var(--primary)"
                    fillOpacity="0.25"
                  />
                )}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 5.5 : 3}
                  fill="var(--surface)"
                  stroke="var(--primary)"
                  strokeWidth={isHovered ? 2.5 : 1.5}
                  className="transition-all duration-75"
                />
              </g>
            );
          })}

          {/* X-axis Date Labels */}
          <text
            x={padLeft}
            y={height - 8}
            textAnchor="start"
            className="mono-num text-[10px]"
            fill="var(--ink-muted)"
          >
            {firstDate}
          </text>
          <text
            x={padLeft + usableWidth}
            y={height - 8}
            textAnchor="end"
            className="mono-num text-[10px]"
            fill="var(--ink-muted)"
          >
            {lastDate}
          </text>
        </svg>
      </div>
    </div>
  );
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

  const handleExecuteReversal = async (reasonArg?: string | React.FormEvent): Promise<void> => {
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
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-rule">
        <div className="flex items-center space-x-3">
          <Link
            href="/dashboard"
            className="p-2 border border-rule rounded text-ink-muted hover:text-ink hover:bg-rule/30 transition pressable"
            title="Back to accounts"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight text-ink">
                {statement?.accountName || 'Account statement'}
              </h1>
              <span className="mono-num text-xs text-ink-faint border border-rule px-2 py-0.5 rounded">
                {accountId.slice(0, 10)}...
              </span>
            </div>
            <p className="text-xs text-ink-muted mt-0.5">
              Append-only audit trail with immutable balance tracking
            </p>
          </div>
        </div>

        {statement && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-right mr-1">
              <span className="text-xs text-ink-muted font-medium block">
                Current balance
              </span>
              <span className="mono-num text-2xl font-medium text-ink">
                {formatPaiseToRupees(statement.balancePence)}
              </span>
            </div>

            {(user?.role === 'ADMIN' || user?.role === 'AUDITOR') && (
              <button
                onClick={handleReconcileAccount}
                className="inline-flex items-center px-3 py-2 border border-rule rounded text-xs font-medium text-ink bg-paper hover:bg-rule/30 transition pressable"
                title="Verify double-entry reconciliation for this account"
              >
                <ShieldCheck className="mr-1.5 h-3.5 w-3.5 text-accent" />
                <span>Reconcile</span>
              </button>
            )}

            {user?.role !== 'AUDITOR' && (
              <Link
                href={`/accounts/${accountId}/transfer`}
                className="inline-flex items-center px-4 py-2 rounded text-xs font-semibold text-white bg-accent hover:opacity-95 transition pressable"
              >
                <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" />
                <span>Transfer</span>
              </Link>
            )}
          </div>
        )}
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

      {/* Balance Over Time Line Chart (Computed client-side from entries) */}
      {loading ? (
        <BalanceHistoryChart loading={true} />
      ) : statement?.entries && statement.entries.length > 0 ? (
        <BalanceHistoryChart entries={statement.entries} />
      ) : null}

      {/* Statement Table */}
      <div className="bg-surface border border-rule rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-rule text-xs">
            <thead className="sticky top-0 bg-surface-secondary text-ink font-semibold border-b border-rule z-10">
              <tr>
                <th scope="col" className="px-5 py-3 text-left font-semibold">
                  Date &amp; time
                </th>
                <th scope="col" className="px-5 py-3 text-left font-semibold">
                  Entry type
                </th>
                <th scope="col" className="px-5 py-3 text-right font-semibold">
                  Amount
                </th>
                <th scope="col" className="px-5 py-3 text-center font-semibold">
                  Status
                </th>
                <th scope="col" className="px-5 py-3 text-right font-semibold">
                  Running balance
                </th>
                <th scope="col" className="px-5 py-3 text-left font-semibold">
                  Initiated by
                </th>
                <th scope="col" className="px-5 py-3 text-left font-semibold">
                  Note
                </th>
                <th scope="col" className="px-5 py-3 text-right font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule bg-surface">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-3.5"><div className="h-3.5 w-32 bg-rule/50 rounded" /></td>
                    <td className="px-5 py-3.5"><div className="h-3.5 w-20 bg-rule/50 rounded" /></td>
                    <td className="px-5 py-3.5 text-right"><div className="h-3.5 w-20 bg-rule/50 rounded ml-auto" /></td>
                    <td className="px-5 py-3.5 text-center"><div className="h-3.5 w-16 bg-rule/40 rounded mx-auto" /></td>
                    <td className="px-5 py-3.5 text-right"><div className="h-3.5 w-24 bg-rule/50 rounded ml-auto" /></td>
                    <td className="px-5 py-3.5"><div className="h-3.5 w-28 bg-rule/40 rounded" /></td>
                    <td className="px-5 py-3.5"><div className="h-3.5 w-48 bg-rule/30 rounded" /></td>
                    <td className="px-5 py-3.5 text-right"><div className="h-3.5 w-14 bg-rule/40 rounded ml-auto" /></td>
                  </tr>
                ))
              ) : statement?.entries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-ink-muted">
                    No ledger entries found for this account.
                  </td>
                </tr>
              ) : (
                statement?.entries.map((entry) => {
                  const isPosted = entry.status === 'POSTED';
                  const isInspected = inspectedEntry?.id === entry.id;
                  const dateStr = new Date(entry.createdAt).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  });

                  return (
                    <tr
                      key={entry.id}
                      onClick={() => setInspectedEntry(entry as any)}
                      className={`cursor-pointer transition ${
                        isInspected
                          ? 'bg-rule/40 ring-1 ring-accent/30 font-medium'
                          : 'hover:bg-[#F3F2EE]'
                      }`}
                      title="Click row to inspect cryptographic seal & double-entry details"
                    >
                      <td className="px-5 py-3 whitespace-nowrap text-ink-muted mono-num">
                        {dateStr}
                      </td>

                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className="mono-num text-xs text-ink font-semibold">
                          {entry.type}
                        </span>
                      </td>

                      <td
                        className={`px-5 py-3 whitespace-nowrap text-right mono-num font-semibold ${
                          !isPosted
                            ? 'text-ink-muted line-through'
                            : entry.direction === 'DEBIT'
                            ? 'text-ledger-red'
                            : 'text-ledger-green'
                        }`}
                      >
                        {entry.direction === 'DEBIT' ? '-' : '+'}
                        {formatPaiseToRupees(entry.amountPence)}
                      </td>

                      {/* Status Column: 6px colored dot + plain text */}
                      <td className="px-5 py-3 whitespace-nowrap text-center">
                        <span
                          className="inline-flex items-center gap-1.5 font-semibold"
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

                      <td className="px-5 py-3 whitespace-nowrap text-right mono-num font-semibold text-ink">
                        {formatPaiseToRupees(entry.runningBalance)}
                      </td>

                      <td className="px-5 py-3 whitespace-nowrap text-ink-muted mono-num">
                        {entry.initiatedBy?.email || 'System'}
                      </td>

                      <td className="px-5 py-3 text-ink-muted max-w-xs truncate">
                        {entry.note || '—'}
                      </td>

                      <td className="px-5 py-3 whitespace-nowrap text-right">
                        {user?.role === 'ADMIN' && isPosted && entry.type !== 'ADJUSTMENT' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setInspectedEntry(null);
                              setReversingEntry(entry);
                              setReversalError(null);
                            }}
                            className="inline-flex items-center px-2.5 py-1 border border-rule rounded text-xs text-ink-muted hover:text-ink hover:bg-rule/30 transition"
                            title="Execute compensating-entry reversal"
                          >
                            <RotateCcw className="mr-1 h-3 w-3" />
                            Reverse
                          </button>
                        ) : entry.type === 'ADJUSTMENT' ? (
                          <span className="text-ink-muted mono-num text-xs">Compensating leg</span>
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

        {/* Pagination Footer: Plain text-sm text-ink-muted with chevron icons */}
        <div className="px-5 py-3 bg-paper border-t border-rule flex items-center justify-between">
          <span className="text-xs text-ink-muted mono-num">
            Page {currentPageIndex + 1}
          </span>

          <div className="flex items-center space-x-4">
            <button
              onClick={handlePreviousPage}
              disabled={currentPageIndex === 0 || loading}
              className="inline-flex items-center text-xs text-ink-muted hover:text-ink disabled:opacity-40 disabled:pointer-events-none transition"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              <span>Previous</span>
            </button>

            <button
              onClick={handleNextPage}
              disabled={!statement?.hasMore || loading}
              className="inline-flex items-center text-xs text-ink-muted hover:text-ink disabled:opacity-40 disabled:pointer-events-none transition"
            >
              <span>Next</span>
              <ChevronRight className="ml-1 h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Account Double-Entry Reconciliation Modal */}
      {showReconcileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-surface rounded-lg border border-rule max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-rule">
              <div>
                <h3 className="text-sm font-semibold text-ink">
                  Account reconciliation proof
                </h3>
                <p className="text-xs text-ink-muted">
                  {statement?.accountName} ({accountId.slice(0, 10)}...)
                </p>
              </div>

              {reconcileResult && (
                <span
                  className="flex items-center gap-1.5 text-xs font-medium"
                  style={{ color: reconcileResult.matches ? 'var(--ledger-green)' : 'var(--ledger-red)' }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: reconcileResult.matches ? 'var(--ledger-green)' : 'var(--ledger-red)' }}
                  />
                  {reconcileResult.matches ? 'Balanced' : 'Drift'}
                </span>
              )}
            </div>

            <div className="py-2">
              {reconcileLoading ? (
                <div className="py-6 text-center text-xs text-ink-muted">
                  Aggregating all immutable ledger credits and debits...
                </div>
              ) : reconcileResult ? (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-paper border border-rule rounded">
                      <span className="text-[11px] text-ink-muted block">Total posted credits</span>
                      <span className="mono-num text-sm font-medium text-ledger-green mt-0.5 block">
                        +{formatPaiseToRupees(reconcileResult.totalCreditsPence)}
                      </span>
                    </div>
                    <div className="p-3 bg-paper border border-rule rounded">
                      <span className="text-[11px] text-ink-muted block">Total posted debits</span>
                      <span className="mono-num text-sm font-medium text-ledger-red mt-0.5 block">
                        -{formatPaiseToRupees(reconcileResult.totalDebitsPence)}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-paper border border-rule rounded space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Computed net ledger:</span>
                      <span className="mono-num font-medium text-ink">{formatPaiseToRupees(reconcileResult.computedBalance)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Stored account balance:</span>
                      <span className="mono-num font-medium text-ink">{formatPaiseToRupees(reconcileResult.storedBalance)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-rule font-medium">
                      <span className="text-ink">Discrepancy:</span>
                      <span className="mono-num text-ledger-green">{formatPaiseToRupees(reconcileResult.discrepancyPence)}</span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex justify-end pt-3 border-t border-rule">
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
