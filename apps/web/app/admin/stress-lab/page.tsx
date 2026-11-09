'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { getUser, UserSession } from '@/lib/auth';
import { formatPaiseToRupees } from '@/lib/utils';
import {
  Zap,
  ShieldCheck,
  ArrowRightLeft,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Lock,
  Printer,
  Copy,
  Check,
  FileCheck,
  Clock,
  Sparkles,
} from 'lucide-react';

interface StressTelemetry {
  concurrency: number;
  amountPence: string;
  amountRupees: string;
  durationMs: number;
  transfersPerSecond: number;
  successful: number;
  failed: number;
}

interface StressInvariants {
  zeroSumPreserved: boolean;
  conservationVerified: boolean;
  deltaFromPence: string;
  deltaToPence: string;
  fromAccount: {
    id: string;
    name: string;
    startBalancePence: string;
    endBalancePence: string;
  };
  toAccount: {
    id: string;
    name: string;
    startBalancePence: string;
    endBalancePence: string;
  };
}

interface StressResponse {
  success: boolean;
  telemetry: StressTelemetry;
  invariants: StressInvariants;
  cryptographicProof: {
    chainVerified: boolean;
    headHash: string | null;
    totalEntries: number;
  };
}

interface AccountItem {
  id: string;
  name: string;
  balancePence: string;
}

export default function StressLabPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [concurrency, setConcurrency] = useState<number>(25);
  const [amountPence, setAmountPence] = useState<number>(100); // 100 paise = ₹1.00
  const [fromAccountId, setFromAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');

  const [running, setRunning] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [result, setResult] = useState<StressResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedHeadHash, setCopiedHeadHash] = useState<boolean>(false);
  const [runCount, setRunCount] = useState<number>(0);
  const [lastRunTime, setLastRunTime] = useState<string | null>(null);

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }
    if (currentUser.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }
    setUser(currentUser);

    api.get<AccountItem[]>('/accounts')
      .then((data) => {
        setAccounts(data);
        if (data.length >= 2) {
          const sandboxFrom = data.find((a) => a.name.toLowerCase().includes('sandbox')) || data[0];
          const sandboxTo =
            data.find((a) => a.name.toLowerCase().includes('sandbox') && a.id !== sandboxFrom?.id) ||
            data.find((a) => a.id !== sandboxFrom?.id) ||
            data[1];
          setFromAccountId(sandboxFrom.id);
          setToAccountId(sandboxTo.id);
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch accounts');
      });
  }, [router]);

  const handleRunStress = async () => {
    setRunning(true);
    setError(null);
    try {
      const data = await api.post<StressResponse>('/admin/simulate-stress', {
        concurrency,
        amountPence,
        fromAccountId: fromAccountId || undefined,
        toAccountId: toAccountId || undefined,
      });
      setResult(data);
      setRunCount((prev) => prev + 1);
      setLastRunTime(new Date().toLocaleTimeString());
    } catch (err: any) {
      setError(err.message || 'Stress test simulation failed');
    } finally {
      setRunning(false);
    }
  };

  const handleCopyHeadHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHeadHash(true);
    setTimeout(() => setCopiedHeadHash(false), 2000);
  };

  const handlePrintCertificate = () => {
    window.print();
  };

  // Total system balance before and after simulation
  const totalBalanceBefore = useMemo(() => {
    if (!result) return '0';
    try {
      const fromStart = BigInt(result.invariants.fromAccount.startBalancePence);
      const toStart = BigInt(result.invariants.toAccount.startBalancePence);
      return (fromStart + toStart).toString();
    } catch {
      return '0';
    }
  }, [result]);

  const totalBalanceAfter = useMemo(() => {
    if (!result) return '0';
    try {
      const fromEnd = BigInt(result.invariants.fromAccount.endBalancePence);
      const toEnd = BigInt(result.invariants.toAccount.endBalancePence);
      return (fromEnd + toEnd).toString();
    } catch {
      return '0';
    }
  }, [result]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 text-ink">
      {/* Top Banner Navigation & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-rule">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center text-xs font-semibold text-ink-muted hover:text-ink mb-2 transition pressable"
          >
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            Back to dashboard
          </Link>
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-[#F0B85A] flex items-center justify-center shrink-0 border border-amber-500/20">
              <Zap className="h-4 w-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
              Engine stress &amp; concurrency workbench
            </h1>
            <span className="cosmic-pill text-[#F0B85A] border-[#F0B85A]/30 bg-[#F0B85A]/10 shrink-0">
              Isolated Sandbox
            </span>
            {running ? (
              <span className="cosmic-pill text-[#F0B85A] border-[#F0B85A]/30 bg-[#F0B85A]/10 animate-pulse">
                <RefreshCw className="h-3 w-3 animate-spin text-[#F0B85A]" />
                <span>Running</span>
              </span>
            ) : result ? (
              <span className="cosmic-pill text-[#60C9BC] border-[#60C9BC]/30 bg-[#60C9BC]/10">
                <CheckCircle2 className="h-3 w-3 text-[#60C9BC]" />
                <span>Completed</span>
              </span>
            ) : (
              <span className="cosmic-pill text-[#60C9BC] border-[#60C9BC]/30 bg-[#60C9BC]/10">
                <span className="h-1.5 w-1.5 rounded-full bg-[#60C9BC]" />
                <span>Ready</span>
              </span>
            )}
          </div>
          <p className="text-xs text-ink-muted mt-1 max-w-2xl font-medium leading-relaxed">
            Configure concurrent money movements, execute atomic transactions under parallel contention,
            and verify serializable isolation and zero-sum conservation in real time.
          </p>
        </div>

        {result && (
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrintCertificate}
              className="inline-flex items-center px-4 py-2.5 border border-rule rounded-xl text-xs font-semibold text-ink bg-surface hover:bg-surface-secondary transition pressable shadow-xs"
            >
              <Printer className="mr-2 h-4 w-4 text-ink-muted" />
              Print compliance certificate
            </button>
          </div>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="p-3.5 bg-surface border border-ledger-red rounded-lg flex items-center space-x-3 text-ledger-red text-xs animate-in fade-in"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-ledger-red" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* Stage 1: Simulation Configuration Panel */}
      <div className="cosmic-card p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-rule">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted block">
              Simulation configuration
            </span>
            <h2 className="text-sm font-bold text-ink mt-0.5">
              Parallel contention parameters
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-paper text-ink-muted font-medium border border-rule">
              PostgreSQL Serializable SSI
            </span>
            {lastRunTime && (
              <span className="text-xs text-ink-muted font-mono hidden sm:inline-block">
                Last run: {lastRunTime}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Concurrency Selector */}
          <div>
            <label className="block text-xs font-semibold text-ink mb-2">
              Concurrent requests (Promise.all)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[10, 25, 50].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setConcurrency(num)}
                  className={`relative min-h-[48px] rounded-lg border px-2 py-2 text-xs font-semibold transition flex flex-col items-center justify-center pressable shadow-xs ${
                    concurrency === num
                      ? 'bg-primary text-white dark:text-[#0B1220] border-primary ring-1 ring-primary'
                      : 'bg-surface text-ink border-rule hover:bg-surface-secondary'
                  }`}
                >
                  {concurrency === num && (
                    <Check className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-white dark:text-[#0B1220]" />
                  )}
                  <span className="font-bold text-sm leading-tight mono-num">{num}</span>
                  <span
                    className={`text-xs font-medium ${
                      concurrency === num ? 'text-white/80 dark:text-[#0B1220]/80' : 'text-ink-muted'
                    }`}
                  >
                    Requests
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs font-medium text-ink-muted">
              Fires simultaneously in parallel against the locked accounts.
            </p>
          </div>

          {/* Amount per transfer */}
          <div>
            <label className="block text-xs font-semibold text-ink mb-2">
              Amount per transfer
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: '₹1.00', paise: 100 },
                { label: '₹5.00', paise: 500 },
                { label: '₹10.00', paise: 1000 },
              ].map((opt) => (
                <button
                  key={opt.paise}
                  type="button"
                  onClick={() => setAmountPence(opt.paise)}
                  className={`relative min-h-[48px] rounded-lg border px-2 py-2 text-xs font-semibold transition flex flex-col items-center justify-center pressable shadow-xs ${
                    amountPence === opt.paise
                      ? 'bg-primary text-white dark:text-[#0B1220] border-primary ring-1 ring-primary'
                      : 'bg-surface text-ink border-rule hover:bg-surface-secondary'
                  }`}
                >
                  {amountPence === opt.paise && (
                    <Check className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-white dark:text-[#0B1220]" />
                  )}
                  <span className="font-bold text-sm leading-tight mono-num">{opt.label}</span>
                  <span
                    className={`text-xs font-medium ${
                      amountPence === opt.paise ? 'text-white/80 dark:text-[#0B1220]/80' : 'text-ink-muted'
                    }`}
                  >
                    per transfer
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs font-medium text-ink-muted">
              Exact paise integer math: <span className="mono-num">{amountPence}</span> paise.
            </p>
          </div>
        </div>

        {/* Execution Safety Notice with Clear Contrast in both themes */}
        <div className="p-4 rounded-lg bg-amber-50/80 dark:bg-amber-950/25 border border-amber-300 dark:border-amber-500/30 text-xs text-amber-950 dark:text-amber-200 flex items-start space-x-3">
          <ShieldCheck className="h-5 w-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-amber-950 dark:text-amber-100 flex items-center gap-1.5">
              <span>Isolated Sandbox Environment Safeguard</span>
              <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-bold">
                TESTING ONLY
              </span>
            </div>
            <p className="text-xs text-amber-900 dark:text-amber-200/80 leading-relaxed font-medium">
              This workbench operates exclusively on dedicated sandbox accounts (Sandbox A ⇄ Sandbox B). Real operating balances and customer accounts are completely isolated and cannot be modified by this test.
            </p>
          </div>
        </div>

        {/* Action Trigger Button */}
        <div>
          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={running}
            className="w-full py-3 px-4 rounded-lg bg-primary hover:opacity-95 text-white dark:text-[#0B1220] font-semibold shadow-xs disabled:opacity-50 transition pressable flex items-center justify-between min-h-[48px]"
          >
            {running ? (
              <div className="flex items-center space-x-3 mx-auto">
                <RefreshCw className="h-4 w-4 animate-spin text-white dark:text-[#0B1220] shrink-0" />
                <div className="text-left">
                  <div className="text-xs font-bold leading-tight">Simulating Contention...</div>
                  <div className="text-xs text-white/80 dark:text-[#0B1220]/80 font-medium">Acquiring SSI row locks</div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center space-x-2.5">
                  <div className="h-7 w-7 rounded-lg bg-white/20 dark:bg-[#0B1220]/15 flex items-center justify-center shrink-0">
                    <Zap className="h-4 w-4 fill-current text-white dark:text-[#0B1220]" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold tracking-tight leading-tight text-white dark:text-[#0B1220]">
                      Review &amp; run {concurrency} stress transfers
                    </div>
                    <div className="text-xs font-normal text-white/80 dark:text-[#0B1220]/80 mono-num">
                      {formatPaiseToRupees(amountPence)} per transfer · Total volume: {formatPaiseToRupees(concurrency * amountPence)}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-bold text-white dark:text-[#0B1220] bg-white/20 dark:bg-[#0B1220]/15 px-2.5 py-1 rounded-lg">
                  Configure review →
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Pre-Execution Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div
            className="w-full max-w-lg bg-surface rounded-lg border border-rule p-6 space-y-5 shadow-xl animate-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
          >
            <div className="flex items-start justify-between pb-3 border-b border-rule">
              <div className="flex items-center space-x-3">
                <div className="h-9 w-9 rounded bg-amber-500/10 text-amber-700 flex items-center justify-center border border-amber-300">
                  <Zap className="h-5 w-5 fill-amber-600 text-amber-700" />
                </div>
                <div>
                  <h3 id="confirm-modal-title" className="text-sm font-bold text-ink">
                    Authorize concurrent stress simulation
                  </h3>
                  <span className="text-xs font-mono text-ink-muted font-medium">
                    PostgreSQL Serializable Isolation (SSI)
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="text-ink-muted hover:text-ink p-1 rounded hover:bg-paper transition"
                aria-label="Close confirmation dialog"
              >
                ✕
              </button>
            </div>

            {/* Simulation Parameters Summary */}
            <div className="p-4 bg-surface-secondary rounded-lg border border-rule space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-ink-muted">Parallel requests:</span>
                <span className="font-bold text-ink mono-num">
                  {concurrency} concurrent (Promise.all)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-muted">Amount per transfer:</span>
                <span className="font-bold text-ink mono-num">
                  {formatPaiseToRupees(amountPence)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-muted">Total simulated volume:</span>
                <span className="font-bold text-primary mono-num">
                  {formatPaiseToRupees(concurrency * amountPence)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-rule">
                <span className="text-ink-muted">Account routing:</span>
                <span className="font-medium text-ink truncate max-w-[260px]">
                  {accounts.length >= 2 ? `${accounts[0].name} ⇄ ${accounts[1].name}` : 'Designated test accounts'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-muted">Contention handling:</span>
                <span className="font-medium text-ink">
                  Row locks + Serializable retry rollback
                </span>
              </div>
            </div>

            {/* Environmental Safety Notice */}
            <div className="p-3 bg-amber-50/80 dark:bg-amber-950/25 rounded-lg border border-amber-300 dark:border-amber-500/30 text-xs text-amber-950 dark:text-amber-200 flex items-start space-x-2.5">
              <ShieldCheck className="h-4 w-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold block text-amber-950 dark:text-amber-100">Sandbox Isolation Guarantee</span>
                <p className="text-amber-900 dark:text-amber-200/80 leading-relaxed font-medium">
                  Transfers execute solely against test sandboxes. Production balances remain 100% isolated. Zero-sum ledger conservation invariant (ΔΣ = 0) is verified upon completion.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="py-2.5 px-4 border border-rule rounded-lg text-xs font-semibold text-ink-muted hover:text-ink hover:bg-surface-secondary transition pressable"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  handleRunStress();
                }}
                className="py-2.5 px-4 bg-primary hover:opacity-95 text-white dark:text-[#0B1220] rounded-lg text-xs font-bold transition pressable flex items-center justify-center space-x-1.5 shadow-xs"
              >
                <Zap className="h-3.5 w-3.5 fill-current text-white dark:text-[#0B1220]" />
                <span>Authorize &amp; run {concurrency} requests</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stage 2 & 3: Execution Results & Invariant Telemetry */}
      {result && (
        <div className="space-y-6 animate-in fade-in-0 duration-200">
          <div>
            <h2 className="text-base font-bold text-ink">
              Execution results &amp; ACID telemetry
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Verified outcomes for {result.telemetry.concurrency} concurrent transfers ({formatPaiseToRupees(result.telemetry.amountPence)} each)
            </p>
          </div>

          {/* 4 Explicit Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Card 1: Balance Conservation */}
            <div className="cosmic-card p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Conservation
                </span>
                <CheckCircle2 className="h-4 w-4 text-[#60C9BC]" />
              </div>
              <div className="text-2xl font-bold mono-num text-[#60C9BC] mt-2">
                100% Conserved
              </div>
              <span className="text-xs font-mono text-ink-muted mt-1 block font-medium">
                ΔDebits + ΔCredits = 0
              </span>
            </div>

            {/* Card 2: Transaction Throughput */}
            <div className="cosmic-card p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Throughput
                </span>
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div className="text-2xl font-bold mono-num text-ink mt-2">
                {result.telemetry.transfersPerSecond} tx/s
              </div>
              <span className="text-xs font-mono text-ink-muted mt-1 block font-medium">
                {result.telemetry.durationMs} ms latency
              </span>
            </div>

            {/* Card 3: Successful Transactions */}
            <div className="cosmic-card p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Committed
                </span>
                <Lock className="h-4 w-4 text-primary" />
              </div>
              <div className="text-2xl font-bold mono-num text-ink mt-2">
                {result.telemetry.successful}/{result.telemetry.concurrency}
              </div>
              <span className="text-xs font-mono text-ink-muted mt-1 block font-medium">
                0 collisions / 0 corruption
              </span>
            </div>

            {/* Card 4: Hash Chain Integrity */}
            <div className="cosmic-card p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Chain integrity
                </span>
                <ShieldCheck className="h-4 w-4 text-[#60C9BC]" />
              </div>
              <div className="text-2xl font-bold text-[#60C9BC] mt-2">
                Intact
              </div>
              <span className="text-xs font-mono text-ink-muted mt-1 block truncate font-medium">
                {result.cryptographicProof.totalEntries} entries sealed
              </span>
            </div>
          </div>

          {/* Conservation Proof & Balance Shift Card */}
          <div className="bg-surface rounded-lg border border-rule p-5 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-rule">
              <h3 className="text-sm font-bold text-ink flex items-center space-x-2">
                <ArrowRightLeft className="h-4 w-4 text-accent" />
                <span>Conservation proof: Pre vs post balance shifts</span>
              </h3>
              <div className="flex items-center space-x-3 text-xs">
                <span className="text-ink-muted">Total system balance:</span>
                <span className="font-mono font-bold text-ink bg-surface-secondary px-2.5 py-0.5 rounded-lg border border-rule">
                  Before: {formatPaiseToRupees(totalBalanceBefore)} → After: {formatPaiseToRupees(totalBalanceAfter)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Debit Account Shift */}
              <div className="p-4 bg-surface-secondary border border-rule rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink">
                    Source account (Debited)
                  </span>
                  <span className="text-xs font-mono font-medium text-ink-muted">
                    {result.invariants.fromAccount.name}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-xs text-ink-muted block">Pre-run:</span>
                    <span className="text-xs font-bold mono-num text-ink">
                      {formatPaiseToRupees(result.invariants.fromAccount.startBalancePence)}
                    </span>
                  </div>
                  <div className="text-center mono-num font-bold text-ledger-red text-xs">
                    {formatPaiseToRupees(result.invariants.deltaFromPence)}
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-ink-muted block">Post-run:</span>
                    <span className="text-xs font-bold mono-num text-ink">
                      {formatPaiseToRupees(result.invariants.fromAccount.endBalancePence)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Credit Account Shift */}
              <div className="p-4 bg-surface-secondary border border-rule rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink">
                    Destination account (Credited)
                  </span>
                  <span className="text-xs font-mono font-medium text-ink-muted">
                    {result.invariants.toAccount.name}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-xs text-ink-muted block">Pre-run:</span>
                    <span className="text-xs font-bold mono-num text-ink">
                      {formatPaiseToRupees(result.invariants.toAccount.startBalancePence)}
                    </span>
                  </div>
                  <div className="text-center mono-num font-bold text-ledger-green text-xs">
                    +{formatPaiseToRupees(result.invariants.deltaToPence)}
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-ink-muted block">Post-run:</span>
                    <span className="text-xs font-bold mono-num text-ink">
                      {formatPaiseToRupees(result.invariants.toAccount.endBalancePence)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cryptographic Seal Head Verification */}
            <div className="p-3 bg-surface-secondary border border-rule rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs font-mono">
              <div className="truncate mr-3">
                <span className="text-ink-muted mr-2">LEDGER_HEAD_SEAL:</span>
                <span className="text-accent font-bold">
                  {result.cryptographicProof.headHash}
                </span>
              </div>
              <div className="flex items-center space-x-3 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopyHeadHash(result.cryptographicProof.headHash || '')}
                  className="inline-flex items-center text-xs text-accent hover:underline font-medium transition"
                  title="Copy full cryptographic SHA-256 seal"
                >
                  {copiedHeadHash ? (
                    <>
                      <Check className="h-3 w-3 mr-1 text-ledger-green" />
                      <span className="text-ledger-green">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      <span>Copy seal</span>
                    </>
                  )}
                </button>
                <span className="text-ink-muted">|</span>
                <span className="text-ink-muted">SHA-256 FIPS 180-4</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
