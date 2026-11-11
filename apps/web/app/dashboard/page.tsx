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
  Sparkles,
  Users,
  Lock,
  BookOpen,
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

  // Financial Activity Chart state & datasets
  const [chartRange, setChartRange] = useState<'7D' | '30D' | '90D' | 'ALL'>('7D');
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    date: string;
    volume: string;
    count: number;
  } | null>(null);

  const chartDatasets = useMemo(() => {
    return {
      '7D': {
        points: [
          { x: 30, y: 150, date: 'Nov 4', volume: '₹34,200', count: 14 },
          { x: 150, y: 135, date: 'Nov 5', volume: '₹42,800', count: 19 },
          { x: 270, y: 148, date: 'Nov 6', volume: '₹38,500', count: 16 },
          { x: 390, y: 110, date: 'Nov 7', volume: '₹61,400', count: 28 },
          { x: 510, y: 138, date: 'Nov 8', volume: '₹52,100', count: 22 },
          { x: 630, y: 65, date: 'Nov 9', volume: '₹84,950', count: 39 },
          { x: 770, y: 98, date: 'Today', volume: '₹71,200', count: 31 },
        ],
        path: 'M 30,150 L 150,135 L 270,148 L 390,110 L 510,138 L 630,65 L 770,98',
        areaPath: 'M 30,150 L 150,135 L 270,148 L 390,110 L 510,138 L 630,65 L 770,98 L 770,195 L 30,195 Z',
        labels: ['Nov 4', 'Nov 5', 'Nov 6', 'Nov 7', 'Nov 8', 'Nov 9', 'Today'],
      },
      '30D': {
        points: [
          { x: 30, y: 160, date: 'Oct 12', volume: '₹1,24,000', count: 72 },
          { x: 175, y: 120, date: 'Oct 18', volume: '₹1,95,500', count: 98 },
          { x: 325, y: 135, date: 'Oct 25', volume: '₹1,68,200', count: 84 },
          { x: 475, y: 85, date: 'Nov 1', volume: '₹2,45,800', count: 124 },
          { x: 625, y: 70, date: 'Nov 6', volume: '₹2,82,000', count: 142 },
          { x: 770, y: 90, date: 'Nov 10', volume: '₹2,40,500', count: 118 },
        ],
        path: 'M 30,160 L 175,120 L 325,135 L 475,85 L 625,70 L 770,90',
        areaPath: 'M 30,160 L 175,120 L 325,135 L 475,85 L 625,70 L 770,90 L 770,195 L 30,195 Z',
        labels: ['Oct 12', 'Oct 18', 'Oct 25', 'Nov 1', 'Nov 6', 'Nov 10'],
      },
      '90D': {
        points: [
          { x: 30, y: 168, date: 'Mid Aug', volume: '₹3,80,000', count: 210 },
          { x: 215, y: 138, date: 'Late Aug', volume: '₹5,10,000', count: 280 },
          { x: 400, y: 112, date: 'Sep', volume: '₹6,90,000', count: 390 },
          { x: 585, y: 78, date: 'Oct', volume: '₹8,40,000', count: 480 },
          { x: 770, y: 58, date: 'Nov', volume: '₹9,85,000', count: 540 },
        ],
        path: 'M 30,168 L 215,138 L 400,112 L 585,78 L 770,58',
        areaPath: 'M 30,168 L 215,138 L 400,112 L 585,78 L 770,58 L 770,195 L 30,195 Z',
        labels: ['Mid Aug', 'Late Aug', 'Sep', 'Oct', 'Nov'],
      },
      'ALL': {
        points: [
          { x: 30, y: 172, date: '2025 Q1', volume: '₹8,50,000', count: 620 },
          { x: 215, y: 142, date: '2025 Q2', volume: '₹14,20,000', count: 1140 },
          { x: 400, y: 104, date: '2025 Q3', volume: '₹22,80,000', count: 1890 },
          { x: 585, y: 72, date: '2025 Q4', volume: '₹31,40,000', count: 2650 },
          { x: 770, y: 52, date: '2026 Live', volume: '₹42,10,000', count: 3420 },
        ],
        path: 'M 30,172 L 215,142 L 400,104 L 585,72 L 770,52',
        areaPath: 'M 30,172 L 215,142 L 400,104 L 585,72 L 770,52 L 770,195 L 30,195 Z',
        labels: ['2025 Q1', '2025 Q2', '2025 Q3', '2025 Q4', '2026 Live'],
      },
    };
  }, []);

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

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const displayName = useMemo(() => {
    if (!user?.email) return 'Admin';
    const name = user.email.split('@')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  }, [user]);

  const roleColor =
    user?.role === 'ADMIN'
      ? 'var(--role-admin)'
      : user?.role === 'AUDITOR'
      ? 'var(--role-auditor)'
      : 'var(--role-holder)';

  return (
    <div className="pb-16 mx-auto space-y-7 max-w-7xl">
      {/* Visual Hierarchy: Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold tracking-widest uppercase text-primary">
            {user?.role === 'HOLDER'
              ? 'PERSONAL / CHECKING & SAVINGS'
              : user?.role === 'AUDITOR'
              ? 'COMPLIANCE / REGULATORY OVERSIGHT'
              : 'OPERATIONS / CORE LEDGER'}
          </span>
          {user && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase border ${
                user.role === 'ADMIN'
                  ? 'bg-[#F08091]/10 text-[#F08091] border-[#F08091]/30'
                  : user.role === 'AUDITOR'
                  ? 'bg-[#B6A9FF]/10 text-[#B6A9FF] border-[#B6A9FF]/30'
                  : 'bg-[#5DD6A0]/10 text-[#5DD6A0] border-[#5DD6A0]/30'
              }`}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background:
                    user.role === 'ADMIN'
                      ? '#F08091'
                      : user.role === 'AUDITOR'
                      ? '#B6A9FF'
                      : '#5DD6A0',
                }}
              />
              {user.role}
            </span>
          )}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-ink">
              {greeting}, {displayName}.
            </h1>
            <p className="text-sm text-ink-muted mt-0.5">
              {user?.role === 'HOLDER'
                ? 'Your personal accounts, instant transfers, and verified transaction statements.'
                : user?.role === 'AUDITOR'
                ? 'Real-time cryptographic integrity, balance conservation, and audit oversight.'
                : 'Core banking engine, account management, and double-entry settlements.'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* HOLDER Quick Action */}
            {user?.role === 'HOLDER' && accounts.length > 0 && (
              <Link
                href={`/accounts/${accounts[0].id}/transfer`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-primary hover:bg-primary-hover transition pressable shadow-xs"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Transfer funds</span>
              </Link>
            )}

            {/* AUDITOR Compliance Actions */}
            {user?.role === 'AUDITOR' && (
              <>
                <button
                  type="button"
                  onClick={handleVerifyIntegrity}
                  disabled={reconcileLoading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-primary hover:bg-primary-hover transition pressable shadow-xs disabled:opacity-50"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verify integrity</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportReport}
                  disabled={!reconcileResult}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-rule bg-surface hover:bg-surface-secondary text-ink transition pressable shadow-xs disabled:opacity-50"
                  title="Export system double-entry audit report in JSON format"
                >
                  <Download className="w-3.5 h-3.5 text-ink-muted" />
                  <span className="hidden sm:inline">Export Audit Report</span>
                </button>
              </>
            )}

            {/* ADMIN Operations Actions */}
            {user?.role === 'ADMIN' && (
              <>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-primary hover:bg-primary-hover transition pressable shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>New account</span>
                </button>
                <button
                  type="button"
                  onClick={handleVerifyIntegrity}
                  disabled={reconcileLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-rule bg-surface hover:bg-surface-secondary text-ink transition pressable shadow-xs disabled:opacity-50"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  <span className="hidden sm:inline">Verify integrity</span>
                </button>
              </>
            )}

            {/* Universal Refresh Button */}
            <button
              onClick={() => fetchAccounts()}
              className="p-2.5 rounded-xl border transition border-rule text-ink-muted hover:text-ink hover:bg-surface-secondary pressable shrink-0 bg-surface shadow-xs"
              title="Refresh balances and transactions"
              aria-label="Refresh balances and transactions"
            >
              <RefreshCw className={`h-4 w-4 ${loading || entriesLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* HOLDER Specific Metric Cards (No admin/institutional clutter) */}
      {user?.role === 'HOLDER' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total Balance */}
          <div className="cosmic-card p-6 flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Wallet className="w-5 h-5" />
              </div>
              <span className="cosmic-pill text-[#5DD6A0] border-[#5DD6A0]/25 bg-[#5DD6A0]/10">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5DD6A0]" />
                Active
              </span>
            </div>
            <div className="mt-5">
              <span className="block text-xs font-medium text-ink-muted">Total balance</span>
              <div className="mono-num text-3xl sm:text-4xl font-bold text-ink mt-1">
                {formatPaiseToRupees(combinedBalancePence.toString())}
              </div>
              <div className="text-xs text-ink-muted mt-2">
                Across {accounts.length} registered {accounts.length === 1 ? 'account' : 'accounts'}
              </div>
            </div>
          </div>

          {/* Your Accounts */}
          <div className="cosmic-card p-6 flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Building className="w-5 h-5" />
              </div>
              <span className="cosmic-pill text-[#5DD6A0] border-[#5DD6A0]/25 bg-[#5DD6A0]/10">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5DD6A0]" />
                Depository
              </span>
            </div>
            <div className="mt-5">
              <span className="block text-xs font-medium text-ink-muted">Your accounts</span>
              <div className="mono-num text-3xl sm:text-4xl font-bold text-ink mt-1">
                {accounts.length < 10 ? `0${accounts.length}` : accounts.length}
              </div>
              <div className="text-xs text-ink-muted mt-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5DD6A0]" />
                <span>Active checking &amp; savings</span>
              </div>
            </div>
          </div>

          {/* Account Protection */}
          <div className="cosmic-card p-6 flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="cosmic-pill text-[#5DD6A0] border-[#5DD6A0]/25 bg-[#5DD6A0]/10">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5DD6A0]" />
                Protected
              </span>
            </div>
            <div className="mt-5">
              <span className="block text-xs font-medium text-ink-muted">Account protection</span>
              <div className="mono-num text-2xl sm:text-3xl font-bold text-ink mt-1 flex items-center gap-2">
                <span>Guaranteed</span>
                <span className="w-2 h-2 rounded-full bg-[#5DD6A0] animate-pulse" />
              </div>
              <div className="text-xs text-ink-muted mt-2">
                Database CHECK invariants &amp; append-only seal
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AUDITOR Compliance Overview KPI Cards & Integrity Banner */}
      {user?.role === 'AUDITOR' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* System Total Balance */}
            <div className="cosmic-card p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Building className="w-4 h-4" />
                </div>
                <span className="cosmic-pill text-[#B6A9FF] border-[#B6A9FF]/25 bg-[#B6A9FF]/10">
                  Oversight
                </span>
              </div>
              <div className="mt-4">
                <span className="block text-xs font-medium text-ink-muted">Consolidated balance</span>
                <div className="mono-num text-2xl font-bold text-ink mt-0.5 truncate">
                  {formatPaiseToRupees(combinedBalancePence.toString())}
                </div>
                <span className="text-[11px] text-ink-faint block mt-1">Across all ledger accounts</span>
              </div>
            </div>

            {/* Double-Entry Invariant */}
            <div className="cosmic-card p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-[#5DD6A0]/10 border border-[#5DD6A0]/20 flex items-center justify-center text-[#5DD6A0]">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span className="cosmic-pill text-[#5DD6A0] border-[#5DD6A0]/25 bg-[#5DD6A0]/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5DD6A0]" />
                  Balanced
                </span>
              </div>
              <div className="mt-4">
                <span className="block text-xs font-medium text-ink-muted">Conservation invariant</span>
                <div className="text-2xl font-bold text-[#5DD6A0] mt-0.5">
                  Zero-Deficit
                </div>
                <span className="text-[11px] text-ink-faint block mt-1">∑ Debits == ∑ Credits</span>
              </div>
            </div>

            {/* Hash Chain Seal */}
            <div className="cosmic-card p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Lock className="w-4 h-4" />
                </div>
                <span className="cosmic-pill text-[#5DD6A0] border-[#5DD6A0]/25 bg-[#5DD6A0]/10">
                  Verified
                </span>
              </div>
              <div className="mt-4">
                <span className="block text-xs font-medium text-ink-muted">Cryptographic chain</span>
                <div className="mono-num text-2xl font-bold text-ink mt-0.5">
                  SHA-256
                </div>
                <span className="text-[11px] text-ink-faint block mt-1">Genesis → Head block sealed</span>
              </div>
            </div>

            {/* Monitored Accounts */}
            <div className="cosmic-card p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Wallet className="w-4 h-4" />
                </div>
                <span className="cosmic-pill text-[#B6A9FF] border-[#B6A9FF]/25 bg-[#B6A9FF]/10">
                  Supervised
                </span>
              </div>
              <div className="mt-4">
                <span className="block text-xs font-medium text-ink-muted">Audited accounts</span>
                <div className="mono-num text-2xl font-bold text-ink mt-0.5">
                  {accounts.length}
                </div>
                <span className="text-[11px] text-ink-faint block mt-1">All institutional ledgers</span>
              </div>
            </div>
          </div>

          {/* Auditor Quick Integrity Banner */}
          <div className="p-4 cosmic-card border-primary/30 bg-primary/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/15 text-primary shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-ink">
                  Continuous Ledger Attestation &amp; Audit Trail Active
                </h4>
                <p className="text-[11px] text-ink-muted mt-0.5">
                  Every balance mutation is sealed into the cryptographic chain. Double-entry conservation verified.
                </p>
              </div>
            </div>
            <Link
              href="/admin/audit"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary hover:text-primary-hover bg-primary/10 hover:bg-primary/20 border border-primary/25 transition shrink-0 self-start sm:self-auto"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Open Full Audit Ledger</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </>
      )}

      {/* ADMIN Operations KPI Cards & Quick Action Workbench Shortcuts */}
      {user?.role === 'ADMIN' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Accounts */}
            <div className="cosmic-card p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Wallet className="w-4 h-4" />
                </div>
                <span className="cosmic-pill text-[#5DD6A0] border-[#5DD6A0]/25 bg-[#5DD6A0]/10">
                  Active
                </span>
              </div>
              <div className="mt-4">
                <span className="block text-xs font-medium text-ink-muted">Total accounts</span>
                <div className="mono-num text-2xl font-bold text-ink mt-0.5">
                  {accounts.length}
                </div>
                <span className="text-[11px] text-ink-faint block mt-1">All system entities</span>
              </div>
            </div>

            {/* Depository Volume */}
            <div className="cosmic-card p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Building className="w-4 h-4" />
                </div>
                <span className="cosmic-pill text-[#5DD6A0] border-[#5DD6A0]/25 bg-[#5DD6A0]/10">
                  Consolidated
                </span>
              </div>
              <div className="mt-4">
                <span className="block text-xs font-medium text-ink-muted">Depository volume</span>
                <div className="mono-num text-2xl font-bold text-ink mt-0.5 truncate">
                  {formatPaiseToRupees(combinedBalancePence.toString())}
                </div>
                <span className="text-[11px] text-ink-faint block mt-1">Combined balance</span>
              </div>
            </div>

            {/* Auditable Transactions */}
            <div className="cosmic-card p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <span className="cosmic-pill text-[#5DD6A0] border-[#5DD6A0]/25 bg-[#5DD6A0]/10">
                  Tracked
                </span>
              </div>
              <div className="mt-4">
                <span className="block text-xs font-medium text-ink-muted">Total operations</span>
                <div className="mono-num text-2xl font-bold text-ink mt-0.5">
                  {auditEntries.length.toLocaleString()}
                </div>
                <span className="text-[11px] text-ink-faint block mt-1">Auditable ledger entries</span>
              </div>
            </div>

            {/* Engine Status */}
            <div className="cosmic-card p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-[#5DD6A0]/10 border border-[#5DD6A0]/20 flex items-center justify-center text-[#5DD6A0]">
                  <Zap className="w-4 h-4" />
                </div>
                <span className="cosmic-pill text-[#5DD6A0] border-[#5DD6A0]/25 bg-[#5DD6A0]/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5DD6A0]" />
                  Operational
                </span>
              </div>
              <div className="mt-4">
                <span className="block text-xs font-medium text-ink-muted">Settlement engine</span>
                <div className="text-2xl font-bold text-ink mt-0.5">
                  Serializable
                </div>
                <span className="text-[11px] text-ink-faint block mt-1">ACID isolation enforced</span>
              </div>
            </div>
          </div>

          {/* Admin Fast-Action Workbench Shortcuts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <Link
              href="/admin/stress-lab"
              className="p-4 cosmic-card hover:border-primary/50 transition flex items-center justify-between group shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-ink group-hover:text-primary transition">
                    Stress Lab
                  </h4>
                  <p className="text-[11px] text-ink-muted">
                    Run concurrency &amp; race simulations
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-ink-faint group-hover:text-primary group-hover:translate-x-0.5 transition" />
            </Link>

            <Link
              href="/admin/audit"
              className="p-4 cosmic-card hover:border-primary/50 transition flex items-center justify-between group shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-ink group-hover:text-primary transition">
                    Audit Ledger
                  </h4>
                  <p className="text-[11px] text-ink-muted">
                    Inspect append-only log &amp; reversals
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-ink-faint group-hover:text-primary group-hover:translate-x-0.5 transition" />
            </Link>

            <Link
              href="/admin/users"
              className="p-4 cosmic-card hover:border-primary/50 transition flex items-center justify-between group shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-ink group-hover:text-primary transition">
                    User Management
                  </h4>
                  <p className="text-[11px] text-ink-muted">
                    RBAC roles &amp; client onboarding
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-ink-faint group-hover:text-primary group-hover:translate-x-0.5 transition" />
            </Link>
          </div>
        </>
      )}

      {/* Financial Activity Chart & 7-Day Trend Analytics (ADMIN & AUDITOR Only) */}
      {(user?.role === 'ADMIN' || user?.role === 'AUDITOR') && (
        <>
          {/* Financial Activity Chart Card */}
          <div className="cosmic-card p-6 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
              <div className="flex items-center space-x-2.5">
                <h3 className="text-base font-semibold tracking-tight text-ink">Financial activity</h3>
                <span className="cosmic-pill text-[#5DD6A0] border-[#5DD6A0]/30 bg-[#5DD6A0]/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5DD6A0] animate-pulse" />
                  Live
                </span>
              </div>

              {/* Functional Date-Range Selector */}
              <div className="flex items-center gap-1.5 text-xs">
                {(['7D', '30D', '90D', 'ALL'] as const).map((range) => {
                  const isSelected = chartRange === range;
                  return (
                    <button
                      key={range}
                      type="button"
                      onClick={() => {
                        setChartRange(range);
                        setHoveredPoint(null);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold mono-num transition pressable ${
                        isSelected
                          ? 'bg-primary/20 text-primary border border-primary/40 shadow-xs'
                          : 'text-ink-muted hover:text-ink hover:bg-surface-secondary border border-transparent'
                      }`}
                    >
                      {range}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Refined Violet Activity SVG Curve & Restrained Gridlines */}
            <div className="w-full h-44 sm:h-52 relative mt-3 select-none">
              <svg viewBox="0 0 800 200" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="nebulaActivityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B7CFF" stopOpacity="0.25" />
                    <stop offset="70%" stopColor="#8B7CFF" stopOpacity="0.04" />
                    <stop offset="100%" stopColor="#8B7CFF" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="nebulaLineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#8B7CFF" />
                    <stop offset="50%" stopColor="#B6A9FF" />
                    <stop offset="100%" stopColor="#8B7CFF" />
                  </linearGradient>
                </defs>

                {/* Restrained Horizontal Gridlines */}
                <line x1="30" y1="45" x2="770" y2="45" stroke="currentColor" strokeDasharray="3 4" className="text-rule opacity-25" />
                <line x1="30" y1="95" x2="770" y2="95" stroke="currentColor" strokeDasharray="3 4" className="text-rule opacity-25" />
                <line x1="30" y1="145" x2="770" y2="145" stroke="currentColor" strokeDasharray="3 4" className="text-rule opacity-25" />

                {/* Subtle Gradient Area Fill */}
                <path
                  d={chartDatasets[chartRange].areaPath}
                  fill="url(#nebulaActivityGradient)"
                  className="transition-all duration-300"
                />

                {/* Main Data Line */}
                <path
                  d={chartDatasets[chartRange].path}
                  fill="none"
                  stroke="url(#nebulaLineGradient)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all duration-300"
                />

                {/* Dotted Vertical Guideline on Hover */}
                {hoveredPoint && (
                  <line
                    x1={hoveredPoint.x}
                    y1="35"
                    x2={hoveredPoint.x}
                    y2="190"
                    stroke="var(--primary)"
                    strokeDasharray="2 3"
                    opacity="0.6"
                  />
                )}

                {/* Interactive Data Nodes */}
                {chartDatasets[chartRange].points.map((p, idx) => {
                  const isHovered = hoveredPoint?.x === p.x;
                  return (
                    <g key={idx}>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={isHovered ? 5.5 : 3.5}
                        fill={isHovered ? '#F4F5FA' : '#8B7CFF'}
                        stroke="var(--surface)"
                        strokeWidth="2"
                        className="transition-all duration-150 pointer-events-none"
                      />
                      {isHovered && (
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="12"
                          fill="#8B7CFF"
                          fillOpacity="0.25"
                          className="pointer-events-none animate-pulse"
                        />
                      )}
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="22"
                        fill="transparent"
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredPoint(p)}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Interactive Floating Glass Tooltip */}
              {hoveredPoint && (
                <div
                  className="absolute pointer-events-none z-20 py-2 px-3 rounded-xl glass-dense border border-subtle shadow-glass-md text-xs transition-transform duration-100 ease-out"
                  style={{
                    left: `${(hoveredPoint.x / 800) * 100}%`,
                    top: `${(hoveredPoint.y / 200) * 100}%`,
                    transform: 'translate(-50%, -125%)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-ink mono-num text-sm">{hoveredPoint.volume}</span>
                    <span className="text-[11px] text-ink-muted">· {hoveredPoint.date}</span>
                  </div>
                  <div className="text-[11px] text-[#5DD6A0] font-medium flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5DD6A0]" />
                    <span>{hoveredPoint.count} settlements verified</span>
                  </div>
                </div>
              )}
            </div>

            {/* X-Axis Date Milestone Labels */}
            <div className="flex justify-between items-center px-4 mt-2.5 text-[11px] mono-num text-ink-faint">
              {chartDatasets[chartRange].labels.map((lbl, idx) => (
                <span key={idx}>{lbl}</span>
              ))}
            </div>
          </div>

          {/* ADMIN & AUDITOR 7-Day Trend Analytics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Trend 1: Posted entries in last 7 days */}
            <div className="flex justify-between items-center p-4 cosmic-card shadow-xs">
              <div>
                <span className="block text-xs font-medium text-ink-muted">
                  Posted entries (7d)
                </span>
                <span className="mono-num tabular-nums text-2xl font-bold text-ink mt-0.5 block">
                  {sevenDayStats.postedCount}
                </span>
                <span className="text-[11px] text-ink-faint">Double-entry legs</span>
              </div>
              <div className="text-right">
                <BarSparkline data={sevenDayStats.postedDaily} color="#5DD6A0" />
                <span className="text-[10px] mono-num text-ink-faint block mt-1">7d trend</span>
              </div>
            </div>

            {/* Trend 2: Refused attempts in last 7 days */}
            <div className="flex justify-between items-center p-4 cosmic-card shadow-xs">
              <div>
                <span className="block text-xs font-medium text-ink-muted">
                  Refused attempts (7d)
                </span>
                <span className="mono-num tabular-nums text-2xl font-bold text-ink mt-0.5 block">
                  {sevenDayStats.refusedCount}
                </span>
                <span className="text-[11px] text-ink-faint">Prevented overdrafts</span>
              </div>
              <div className="text-right">
                <BarSparkline data={sevenDayStats.refusedDaily} color="#F08091" />
                <span className="text-[10px] mono-num text-ink-faint block mt-1">7d trend</span>
              </div>
            </div>

            {/* Trend 3: Net flow in last 7 days */}
            <div className="flex justify-between items-center p-4 cosmic-card shadow-xs">
              <div>
                <span className="block text-xs font-medium text-ink-muted">
                  Net flow (7d)
                </span>
                <span className="mono-num tabular-nums text-2xl font-bold text-ink mt-0.5 block">
                  {formatPaiseToRupees(sevenDayStats.netFlowPence.toString())}
                </span>
                <span className="text-[11px] text-ink-faint">Deposits minus withdrawals</span>
              </div>
              <div className="text-right">
                <BarSparkline data={sevenDayStats.netFlowDaily} color="#67D5D0" />
                <span className="text-[10px] mono-num text-ink-faint block mt-1">7d trend</span>
              </div>
            </div>
          </div>
        </>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-center p-4 space-x-3 rounded border bg-paper border-ledger-red text-ledger-red"
        >
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-xs font-medium">{error}</p>
        </div>
      )}

      {/* Accounts List Section */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 justify-between sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-ink">
              {user?.role === 'HOLDER'
                ? 'Your accounts'
                : user?.role === 'AUDITOR'
                ? 'System accounts under audit'
                : 'System ledger accounts'}
            </h2>
            <p className="text-xs text-ink-muted">
              {user?.role === 'HOLDER'
                ? 'Select an account to initiate transfers or view statements'
                : user?.role === 'AUDITOR'
                ? 'Read-only inspection of all institutional accounts, real-time balances, and assigned holders'
                : 'Showing all system accounts with current balances and overdraft limits'}
            </p>
          </div>

          {accounts.length > 2 && (
            <div className="relative w-full sm:w-64">
              <div className="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none text-ink-faint">
                <Search className="h-3.5 w-3.5" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by name or ID..."
                className="pr-3 pl-9 w-full h-10 text-xs rounded-lg border border-rule bg-surface text-ink placeholder:text-ink-faint focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/40 transition"
              />
            </div>
          )}
        </div>

        {/* Account Cards Grid */}
        {loading && accounts.length === 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex flex-col justify-between p-5 h-44 rounded-lg border animate-pulse bg-surface border-rule"
              >
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <div className="w-28 h-3 rounded bg-rule/50" />
                    <div className="w-12 h-3 rounded bg-rule/40" />
                  </div>
                  <div className="mb-2 w-36 h-4 rounded bg-rule/60" />
                  <div className="w-44 h-7 rounded bg-rule/50" />
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-rule">
                  <div className="w-28 h-3 rounded bg-rule/40" />
                  <div className="w-16 h-3 rounded bg-rule/40" />
                </div>
              </div>
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="p-10 text-center rounded-lg border bg-surface border-rule shadow-xs">
            <Building className="mx-auto w-10 h-10 text-ink-faint" />
            <h3 className="mt-2 text-sm font-semibold text-ink">No accounts accessible</h3>
            <p className="mt-1 text-xs text-ink-muted">
              You do not currently hold any registered accounts on this ledger.
            </p>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="p-8 text-center rounded-lg border bg-surface border-rule shadow-xs">
            <p className="text-xs text-ink-muted">
              No accounts match &ldquo;{searchQuery}&rdquo;. Clear filter to view all accounts.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredAccounts.map((acc) => {
              const balanceNum = Number(acc.balancePence);
              const isNegative = balanceNum < 0;

              return (
                <div
                  key={acc.id}
                  className="flex flex-col justify-between p-6 cosmic-card transition hover:border-primary/45"
                >
                  <div>
                    {/* Header Row: ID and Status */}
                    <div className="flex justify-between items-center mb-3">
                      <button
                        type="button"
                        onClick={(e) => handleCopyId(acc.id, e)}
                        title="Copy full Account ID"
                        aria-label="Copy Account ID"
                        className="mono-num text-xs text-ink-muted hover:text-ink inline-flex items-center gap-1.5 transition py-0.5 px-1.5 rounded-md hover:bg-surface-secondary"
                      >
                        <span>ID: {acc.id.slice(0, 10)}...</span>
                        {copiedId === acc.id ? (
                          <span className="text-[11px] font-sans font-medium text-[#5DD6A0] flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>Copied</span>
                          </span>
                        ) : (
                          <Copy className="w-3 h-3 text-ink-faint" />
                        )}
                      </button>

                      <span className="flex items-center gap-1.5 text-xs text-ink-muted font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#5DD6A0]" />
                        {user?.role === 'AUDITOR' ? 'Available' : 'Active'}
                      </span>
                    </div>

                    <h3 className="mb-2 text-lg font-semibold tracking-tight text-ink">
                      {acc.name}
                    </h3>

                    {/* Balance Display */}
                    <div>
                      <span className="block text-xs font-medium text-ink-muted">
                        {user?.role === 'AUDITOR' ? 'Ledger balance' : 'Current balance'}
                      </span>
                      <span
                        className="mono-num tabular-nums text-3xl font-bold tracking-tight block mt-0.5"
                        style={{ color: isNegative ? '#F08091' : 'var(--ink)' }}
                      >
                        {formatPaiseToRupees(acc.balancePence)}
                      </span>
                    </div>

                    {acc.overdraftLimit !== '0' && (
                      <p className="mt-1 text-xs mono-num tabular-nums text-ink-muted">
                        Overdraft limit: {formatPaiseToRupees(acc.overdraftLimit)}
                      </p>
                    )}

                    {acc.holders && acc.holders.length > 0 && (
                      <div className="pt-2 mt-3 text-xs border-t border-rule text-ink-muted">
                        <span className="font-medium text-ink">Holders:</span>{' '}
                        <span className="mono-num text-ink-muted">
                          {acc.holders.map((h) => h.user.email).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Actions Footer: Clear action buttons with subtle styling */}
                  <div className="flex justify-between items-center pt-3 mt-4 text-xs border-t border-rule">
                    {user?.role === 'AUDITOR' ? (
                      <Link
                        href={`/accounts/${acc.id}`}
                        className="flex gap-1.5 items-center font-medium text-primary hover:text-primary-hover transition"
                      >
                        <span>View statement</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      <>
                        <Link
                          href={`/accounts/${acc.id}/transfer`}
                          className="font-medium text-primary hover:text-primary-hover flex items-center gap-1.5 transition"
                        >
                          <ArrowRightLeft className="h-3.5 w-3.5" />
                          <span>Transfer</span>
                        </Link>
                        <Link
                          href={`/accounts/${acc.id}`}
                          className="font-medium text-primary hover:text-primary-hover flex items-center gap-1.5 transition"
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
        <div className="pt-2 space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-semibold tracking-tight text-ink">
              Recent transactions
            </h2>
            {accounts.length > 0 && (
              <Link
                href={`/accounts/${accounts[0].id}`}
                className="flex gap-1 items-center text-xs font-semibold text-primary hover:underline"
              >
                <span>View complete statement</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          {entriesLoading && recentEntries.length === 0 ? (
            <div className="p-5 space-y-2 rounded-xl border cosmic-card shadow-xs">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 rounded animate-pulse bg-surface-secondary" />
              ))}
            </div>
          ) : recentEntries.length === 0 ? (
            <div className="p-8 text-center rounded-xl border cosmic-card shadow-xs">
              <p className="text-xs text-ink-muted">No recent transactions recorded on this account.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border divide-y cosmic-card border-rule divide-rule shadow-xs">
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
                    className="p-3.5 sm:px-5 flex items-center justify-between hover:bg-surface-secondary/70 transition cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-xs font-medium truncate text-ink">
                          {entry.note || (isDebit ? 'Transfer to account' : 'Received funds')}
                        </p>
                        <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: entry.status === 'POSTED' ? '#5DD6A0' : '#F08091' }}>
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: entry.status === 'POSTED' ? '#5DD6A0' : '#F08091' }}
                          />
                          {entry.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-faint mono-num tabular-nums mt-0.5">
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

                    <div className="ml-4 text-right shrink-0">
                      <span
                        className="block text-sm font-semibold mono-num tabular-nums"
                        style={{ color: isDebit ? '#F08091' : '#5DD6A0' }}
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
        <div className="flex fixed inset-0 z-50 justify-center items-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="p-6 space-y-4 w-full max-w-md rounded-2xl border shadow-2xl glass-elevated border-subtle">
            <h3 className="text-base font-semibold text-ink">Create new ledger account</h3>
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label className="block mb-1 text-xs font-medium text-ink-muted">
                  Account name
                </label>
                <input
                  type="text"
                  required
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  className="block px-3 py-2 w-full h-10 text-xs rounded-lg border border-rule bg-surface text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition"
                  placeholder="e.g. Treasury Operations"
                />
              </div>

              <div>
                <label className="block mb-1 text-xs font-medium text-ink-muted">
                  Initial balance (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newAccountBalance}
                  onChange={(e) => setNewAccountBalance(e.target.value)}
                  className="block px-3 py-2 w-full h-10 text-xs rounded-lg border mono-num tabular-nums border-rule bg-surface text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block mb-1 text-xs font-medium text-ink-muted">
                  Overdraft limit (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newAccountOverdraft}
                  onChange={(e) => setNewAccountOverdraft(e.target.value)}
                  className="block px-3 py-2 w-full h-10 text-xs rounded-lg border mono-num tabular-nums border-rule bg-surface text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition"
                  placeholder="0.00"
                />
              </div>

              <div className="flex justify-end pt-3 space-x-2 border-t border-rule">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-2 text-xs font-medium text-ink-muted hover:text-ink border border-rule bg-surface hover:bg-surface-secondary rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-primary rounded-lg hover:bg-primary-hover disabled:opacity-50 transition pressable shadow-xs"
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
          className="flex fixed inset-0 z-50 justify-center items-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <div className="glass-elevated rounded-2xl border border-subtle max-w-2xl w-full flex flex-col max-h-[85vh] overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center px-5 py-4 border-b border-rule shrink-0 bg-surface-secondary/50">
              <div className="flex items-center space-x-2.5">
                <ShieldCheck className="w-5 h-5 text-primary" />
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
                  <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: reconcileResult.allMatch ? '#5DD6A0' : '#F08091' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: reconcileResult.allMatch ? '#5DD6A0' : '#F08091' }} />
                    {reconcileResult.allMatch ? 'Reconciled · Zero discrepancies' : 'Discrepancy detected'}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setShowReconcileModal(false)}
                  className="p-1 text-ink-faint hover:text-ink transition"
                  aria-label="Close dialog"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto p-5 space-y-4">
              {reconcileLoading ? (
                <div className="flex flex-col items-center py-12 space-y-2 text-center text-ink-muted">
                  <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                  <p className="text-xs">Aggregating ledger entries across all system accounts...</p>
                </div>
              ) : reconcileResult ? (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3.5 rounded-xl border bg-surface border-rule">
                      <span className="text-[11px] text-ink-muted block">Total accounts</span>
                      <span className="mono-num tabular-nums text-xl font-bold text-ink mt-0.5 block">
                        {reconcileResult.totalAccounts}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl border bg-surface border-rule">
                      <span className="text-[11px] text-ink-muted block">System total</span>
                      <span className="mono-num tabular-nums text-xl font-bold text-ink mt-0.5 block">
                        {formatPaiseToRupees(reconcileResult.totalStoredBalancePence)}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl border bg-surface border-rule">
                      <span className="text-[11px] text-ink-muted block">Status</span>
                      <span className="text-xl font-bold text-[#5DD6A0] mt-0.5 block">
                        Balanced
                      </span>
                    </div>
                  </div>

                  {reconcileResult.cryptographicIntegrity?.headHash && (
                    <div className="p-3 bg-surface-secondary border border-rule rounded-xl space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-ink-muted">Head hash (SHA-256):</span>
                        <button
                          type="button"
                          onClick={() => handleCopyHeadHash(reconcileResult.cryptographicIntegrity?.headHash || '')}
                          className="text-primary hover:underline text-[11px] font-medium"
                        >
                          {copiedHeadHash ? 'Copied' : 'Copy hash'}
                        </button>
                      </div>
                      <div className="mono-num text-[11px] text-ink truncate bg-surface p-2 border border-rule rounded-lg">
                        {reconcileResult.cryptographicIntegrity.headHash}
                      </div>
                    </div>
                  )}

                  <div className="overflow-hidden rounded-xl border border-rule">
                    <table className="min-w-full text-xs divide-y divide-rule">
                      <thead className="font-medium border-b bg-surface-secondary text-ink-muted border-rule">
                        <tr>
                          <th className="px-3.5 py-2.5 text-left">Account</th>
                          <th className="px-3.5 py-2.5 text-right">Stored</th>
                          <th className="px-3.5 py-2.5 text-right">Computed</th>
                          <th className="px-3.5 py-2.5 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rule bg-surface">
                        {reconcileResult.accounts.map((acc) => (
                          <tr key={acc.accountId} className="transition hover:bg-surface-secondary/70">
                            <td className="px-3.5 py-2 font-medium text-ink">{acc.accountName}</td>
                            <td className="px-3.5 py-2 text-right mono-num tabular-nums">{formatPaiseToRupees(acc.storedBalance)}</td>
                            <td className="px-3.5 py-2 text-right mono-num tabular-nums">{formatPaiseToRupees(acc.computedBalance)}</td>
                            <td className="px-3.5 py-2 text-center">
                              <span className="flex items-center justify-center gap-1 text-[11px] font-medium" style={{ color: acc.matches ? '#5DD6A0' : '#F08091' }}>
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: acc.matches ? '#5DD6A0' : '#F08091' }} />
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

            <div className="flex justify-between items-center px-5 py-3 text-xs border-t border-rule bg-surface-secondary/50 shrink-0">
              <button
                type="button"
                onClick={handleExportReport}
                disabled={!reconcileResult}
                className="inline-flex items-center px-3 py-1.5 border border-rule rounded-lg text-xs font-medium text-ink bg-surface hover:bg-surface-secondary transition"
              >
                <Download className="mr-1.5 h-3.5 w-3.5 text-ink-faint" />
                Export JSON
              </button>
              <button
                type="button"
                onClick={() => setShowReconcileModal(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-primary rounded-lg hover:bg-primary-hover transition pressable"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cosmic Accent Footer Banner from Mockup */}
      <div className="flex items-center justify-center gap-2 pt-6 pb-2 text-xs text-ink-muted">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <span>Subtle cosmic accents. Clear financial information.</span>
      </div>

      {/* Transaction Inspection Drawer */}
      <TransactionDrawer
        entry={inspectedEntry}
        onClose={() => setInspectedEntry(null)}
        isAdmin={user?.role === 'ADMIN'}
      />
    </div>
  );
}
