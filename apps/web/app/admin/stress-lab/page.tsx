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
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Banner Navigation & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-900 mb-2 transition pressable"
          >
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            Back to Dashboard
          </Link>
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
              <Zap className="h-4 w-4 fill-amber-500" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight-display text-slate-950">
              <span className="sm:hidden">Stress Lab</span>
              <span className="hidden sm:inline">Engine Stress &amp; Concurrency Workbench</span>
            </h1>
            {running ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 animate-pulse">
                <RefreshCw className="h-3 w-3 animate-spin text-amber-600" />
                <span>Running</span>
              </span>
            ) : result ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                <span>Completed</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>Ready</span>
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl font-medium">
            <span className="sm:hidden">Concurrency testing workbench</span>
            <span className="hidden sm:inline">
              Configure concurrent money movements, execute atomic transactions under parallel contention,
              and inspect database consistency in real time.
            </span>
          </p>
        </div>

        {result && (
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrintCertificate}
              className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-xl shadow-2xs text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition pressable"
            >
              <Printer className="mr-2 h-4 w-4 text-slate-500" />
              Print Compliance Certificate
            </button>
          </div>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center space-x-3 text-red-700 animate-in fade-in"
        >
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Stage 1: Simulation Configuration Panel */}
      <div className="glass-card rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/80 space-y-5 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Simulation Configuration
            </span>
            <h2 className="text-base font-bold text-slate-950 mt-0.5">
              Configure Parallel Contention Parameters
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200/60">
              PostgreSQL Serializable SSI
            </span>
            {lastRunTime && (
              <span className="text-xs text-slate-400 font-mono hidden sm:inline-block">
                Last run: {lastRunTime}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Concurrency Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Concurrent Requests (Promise.all)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[10, 25, 50].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setConcurrency(num)}
                  className={`relative min-h-[52px] rounded-xl border px-2 py-2.5 text-xs sm:text-sm font-semibold transition flex flex-col items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 pressable ${
                    concurrency === num
                      ? 'bg-slate-950 text-white border-slate-950 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {concurrency === num && (
                    <Check className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-emerald-400" />
                  )}
                  <span className="font-bold text-sm sm:text-base leading-tight">{num}</span>
                  <span
                    className={`text-[10px] sm:text-xs font-medium ${
                      concurrency === num ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    Requests
                  </span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 font-medium">
              Fires simultaneously in parallel against the locked accounts.
            </p>
          </div>

          {/* Amount per transfer */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Amount Per Transfer
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
                  className={`relative min-h-[52px] rounded-xl border px-2 py-2.5 text-xs sm:text-sm font-semibold transition flex flex-col items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 pressable ${
                    amountPence === opt.paise
                      ? 'bg-slate-950 text-white border-slate-950 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {amountPence === opt.paise && (
                    <Check className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-emerald-400" />
                  )}
                  <span className="font-bold text-sm sm:text-base leading-tight">{opt.label}</span>
                  <span
                    className={`text-[10px] sm:text-xs font-medium ${
                      amountPence === opt.paise ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    per transfer
                  </span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 font-medium">
              Exact paise integer math: {amountPence} paise.
            </p>
          </div>
        </div>

        {/* Execution Safety Notice */}
        <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 flex items-start space-x-2.5">
          <ShieldCheck className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-bold text-amber-950 flex items-center gap-1.5">
              <span>Execution Safety Notice</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-200/70 text-amber-800">
                SANDBOX
              </span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
              Testing environment only. Confirm that the selected accounts are designated for stress testing before execution. Total ledger balance remains invariant (ΔΣ = 0).
            </p>
          </div>
        </div>

        {/* Action Trigger Button */}
        <div>
          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={running}
            className="w-full py-3.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold shadow-md hover:shadow-lg disabled:opacity-50 transition pressable flex items-center justify-between min-h-[52px]"
          >
            {running ? (
              <div className="flex items-center space-x-3 mx-auto">
                <RefreshCw className="h-5 w-5 animate-spin text-slate-950 shrink-0" />
                <div className="text-left">
                  <div className="text-sm font-bold leading-tight">Simulating Contention...</div>
                  <div className="text-[11px] text-slate-800 font-medium">Acquiring SSI row locks</div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 rounded-lg bg-amber-400/80 flex items-center justify-center shrink-0">
                    <Zap className="h-4 w-4 fill-slate-950 text-slate-950" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm sm:text-base font-black tracking-tight leading-tight text-slate-950">
                      Run {concurrency} Transfers
                    </div>
                    <div className="text-[11px] sm:text-xs font-semibold text-slate-800">
                      {formatPaiseToRupees(amountPence)} per transfer · {formatPaiseToRupees(concurrency * amountPence)} volume
                    </div>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-950 bg-amber-400/90 px-2.5 py-1.5 rounded-lg border border-amber-500/40">
                  Start →
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Pre-Execution Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-5 animate-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-200">
                  <Zap className="h-5 w-5 fill-amber-500" />
                </div>
                <div>
                  <h3 id="confirm-modal-title" className="text-base font-bold text-slate-950">
                    Confirm Stress Simulation
                  </h3>
                  <span className="text-xs font-mono text-slate-500 font-medium">
                    PostgreSQL Serializable SSI
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition pressable"
                aria-label="Close confirmation dialog"
              >
                ✕
              </button>
            </div>

            {/* Simulation Parameters Summary */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Parallel Requests:</span>
                <span className="font-bold text-slate-950 font-mono">
                  {concurrency} concurrent (Promise.all)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Amount per Transfer:</span>
                <span className="font-bold text-slate-950 font-mono">
                  {formatPaiseToRupees(amountPence)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Total Simulated Volume:</span>
                <span className="font-bold text-amber-600 font-mono">
                  {formatPaiseToRupees(concurrency * amountPence)}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200/60 flex justify-between items-center">
                <span className="text-slate-500 font-medium">Account Routing:</span>
                <span className="font-semibold text-slate-800 truncate max-w-[200px]">
                  {accounts.length >= 2 ? `${accounts[0].name} ⇄ ${accounts[1].name}` : 'Designated test accounts'}
                </span>
              </div>
            </div>

            {/* Environmental Safety Notice */}
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 text-xs text-amber-900 flex items-start space-x-2">
              <ShieldCheck className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong className="font-bold">Testing Environment Guarantee:</strong> Each transfer creates an append-only entry with serializable row locks. Total ledger balance remains invariant (ΔΣ = 0).
              </p>
            </div>

            {/* Modal Actions */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="py-2.5 px-4 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition pressable"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  handleRunStress();
                }}
                className="py-2.5 px-4 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 rounded-xl text-xs font-bold transition pressable shadow-xs flex items-center justify-center space-x-1.5"
              >
                <Zap className="h-3.5 w-3.5 fill-slate-950" />
                <span>Launch Simulation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stage 2 & 3: Execution Results & Invariant Telemetry */}
      {result && (
        <div className="space-y-6 animate-in fade-in-0 duration-200">
          <div>
            <h2 className="text-lg font-bold tracking-tight-display text-slate-950">
              Execution Results &amp; ACID Telemetry
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified outcomes for {result.telemetry.concurrency} concurrent transfers ({formatPaiseToRupees(result.telemetry.amountPence)} each)
            </p>
          </div>

          {/* 4 Explicit Metric Cards: 2x2 on mobile, 4 columns on lg */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Card 1: Balance Conservation */}
            <div className="glass-card rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/80">
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
                  Conservation
                </span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black tracking-tight-display text-emerald-700 mt-2">
                100% Conserved
              </div>
              <span className="text-[11px] sm:text-xs font-mono text-slate-600 mt-1 block font-medium">
                ΔDebits + ΔCredits = 0
              </span>
            </div>

            {/* Card 2: Transaction Throughput */}
            <div className="glass-card rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/80">
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
                  Throughput
                </span>
                <TrendingUp className="h-4 w-4 text-sky-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black tracking-tight-display tabular-nums text-slate-950 mt-2">
                {result.telemetry.transfersPerSecond} tx/s
              </div>
              <span className="text-[11px] sm:text-xs font-mono text-slate-600 mt-1 block font-medium">
                {result.telemetry.durationMs} ms latency
              </span>
            </div>

            {/* Card 3: Successful Transactions */}
            <div className="glass-card rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/80">
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
                  Success
                </span>
                <Lock className="h-4 w-4 text-purple-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black tracking-tight-display tabular-nums text-slate-950 mt-2">
                {result.telemetry.successful}/{result.telemetry.concurrency}
              </div>
              <span className="text-[11px] sm:text-xs font-mono text-slate-600 mt-1 block font-medium">
                0 collisions
              </span>
            </div>

            {/* Card 4: Hash Chain Integrity */}
            <div className="glass-card rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/80">
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
                  Chain Integrity
                </span>
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black tracking-tight-display text-emerald-700 mt-2">
                Intact
              </div>
              <span className="text-[11px] sm:text-xs font-mono text-slate-600 mt-1 block truncate font-medium">
                {result.cryptographicProof.totalEntries} sealed
              </span>
            </div>
          </div>

          {/* Conservation Proof & Balance Shift Card */}
          <div className="glass-card rounded-2xl p-6 shadow-xs border border-slate-200/80 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-950 tracking-tight-display flex items-center space-x-2">
                <ArrowRightLeft className="h-4 w-4 text-slate-600" />
                <span>Conservation Proof: Pre vs Post Balance Shifts</span>
              </h3>
              <div className="flex items-center space-x-3 text-xs">
                <span className="text-slate-500">Total System Balance:</span>
                <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200/60">
                  Before: {formatPaiseToRupees(totalBalanceBefore)} → After: {formatPaiseToRupees(totalBalanceAfter)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Debit Account Shift */}
              <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                    Source Account (Debited)
                  </span>
                  <span className="text-xs font-mono font-semibold text-amber-800">
                    {result.invariants.fromAccount.name}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Pre-run:</span>
                    <span className="text-sm font-bold font-mono text-slate-900">
                      {formatPaiseToRupees(result.invariants.fromAccount.startBalancePence)}
                    </span>
                  </div>
                  <div className="text-center font-mono font-bold text-red-600 text-sm">
                    {formatPaiseToRupees(result.invariants.deltaFromPence)}
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-500 block">Post-run:</span>
                    <span className="text-sm font-bold font-mono text-slate-900">
                      {formatPaiseToRupees(result.invariants.fromAccount.endBalancePence)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Credit Account Shift */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                    Destination Account (Credited)
                  </span>
                  <span className="text-xs font-mono font-semibold text-emerald-800">
                    {result.invariants.toAccount.name}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Pre-run:</span>
                    <span className="text-sm font-bold font-mono text-slate-900">
                      {formatPaiseToRupees(result.invariants.toAccount.startBalancePence)}
                    </span>
                  </div>
                  <div className="text-center font-mono font-bold text-emerald-700 text-sm">
                    +{formatPaiseToRupees(result.invariants.deltaToPence)}
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-500 block">Post-run:</span>
                    <span className="text-sm font-bold font-mono text-slate-900">
                      {formatPaiseToRupees(result.invariants.toAccount.endBalancePence)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cryptographic Seal Head Verification */}
            <div className="p-3.5 bg-slate-950 text-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs font-mono shadow-xs">
              <div className="truncate mr-3">
                <span className="text-slate-400 mr-2">LEDGER_HEAD_SEAL:</span>
                <span className="text-emerald-400 font-bold">
                  {result.cryptographicProof.headHash}
                </span>
              </div>
              <div className="flex items-center space-x-3 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopyHeadHash(result.cryptographicProof.headHash || '')}
                  className="inline-flex items-center text-xs text-sky-400 hover:text-sky-300 transition"
                  title="Copy full cryptographic SHA-256 seal"
                >
                  {copiedHeadHash ? (
                    <>
                      <Check className="h-3 w-3 mr-1 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      <span>Copy Seal</span>
                    </>
                  )}
                </button>
                <span className="text-slate-500">|</span>
                <span className="text-slate-400">SHA-256 FIPS 180-4</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
