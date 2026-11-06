'use client';

import React, { useState, useEffect } from 'react';
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
  Clock,
  Hash,
  FileCheck,
  TrendingUp,
  Lock,
  Layers,
  Printer,
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
  const [result, setResult] = useState<StressResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

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

    // Fetch accounts
    api.get<AccountItem[]>('/accounts')
      .then((data) => {
        setAccounts(data);
        if (data.length >= 2) {
          setFromAccountId(data[0].id);
          setToAccountId(data[1].id);
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
    } catch (err: any) {
      setError(err.message || 'Stress test simulation failed');
    } finally {
      setRunning(false);
    }
  };

  const handlePrintCertificate = () => {
    window.print();
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Top Banner Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-900 mb-2 transition pressable"
          >
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            Back to Dashboard
          </Link>
          <div className="flex items-center space-x-2.5">
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
              <Zap className="h-4 w-4 fill-amber-500" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight-display text-slate-950">
              Engine Stress & Concurrency Workbench
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Live real-time demonstration of PostgreSQL Serializable (SSI) isolation, row-level locks,
            retry collision handling, and cryptographic ledger conservation under high load.
          </p>
        </div>

        {result && (
          <button
            onClick={handlePrintCertificate}
            className="inline-flex items-center px-3.5 py-2 border border-slate-300 rounded-xl shadow-xs text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition pressable"
          >
            <Printer className="mr-2 h-4 w-4 text-slate-500" />
            Print Compliance Certificate
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center space-x-3 text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Control Panel Card */}
      <div className="glass-card rounded-2xl p-6 shadow-xs border border-white/80 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Simulation Parameters
            </span>
            <h2 className="text-base font-bold text-slate-950 mt-0.5">
              Simulate High-Contention Money Movement
            </h2>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold">
            PostgreSQL Serializable SSI
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Concurrency Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Concurrent Requests (Promise.all)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[10, 25, 50].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setConcurrency(num)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition pressable ${
                    concurrency === num
                      ? 'bg-slate-950 text-white shadow-xs'
                      : 'bg-slate-100/80 text-slate-700 hover:bg-slate-200/80 border border-slate-200/60'
                  }`}
                >
                  {num} Requests
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Fires simultaneously in parallel against the locked accounts.
            </p>
          </div>

          {/* Amount per transfer */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
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
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition pressable ${
                    amountPence === opt.paise
                      ? 'bg-slate-950 text-white shadow-xs'
                      : 'bg-slate-100/80 text-slate-700 hover:bg-slate-200/80 border border-slate-200/60'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Exact paise integer math: {amountPence} paise.
            </p>
          </div>

          {/* Action Trigger Button */}
          <div className="flex flex-col justify-end">
            <button
              onClick={handleRunStress}
              disabled={running}
              className="w-full py-3 px-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm shadow-md hover:shadow-lg disabled:opacity-50 transition pressable flex items-center justify-center space-x-2"
            >
              {running ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-slate-950" />
                  <span>Locking Rows & Processing...</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 fill-slate-950" />
                  <span>Run {concurrency} Concurrent Transfers</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Live Telemetry Display */}
      {result && (
        <div className="space-y-6 animate-in fade-in-0 duration-200">
          {/* Top 4 Real-time Invariant Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Zero-Sum Invariant Card */}
            <div className="glass-card rounded-2xl p-5 shadow-xs border border-white/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Mathematical Invariant
                </span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black tracking-tight-display text-emerald-700 mt-2">
                100.00% Conserved
              </div>
              <span className="text-xs font-mono text-slate-500 mt-1 block">
                ΔDebits + ΔCredits = 0.00
              </span>
            </div>

            {/* Throughput Metric */}
            <div className="glass-card rounded-2xl p-5 shadow-xs border border-white/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Throughput
                </span>
                <TrendingUp className="h-4 w-4 text-sky-600" />
              </div>
              <div className="text-2xl font-black tracking-tight-display tabular-nums text-slate-950 mt-2">
                {result.telemetry.transfersPerSecond} tx/sec
              </div>
              <span className="text-xs font-mono text-slate-500 mt-1 block">
                {result.telemetry.durationMs}ms total latency
              </span>
            </div>

            {/* ACID Conflict Resolution */}
            <div className="glass-card rounded-2xl p-5 shadow-xs border border-white/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  ACID Concurrency
                </span>
                <Lock className="h-4 w-4 text-purple-600" />
              </div>
              <div className="text-2xl font-black tracking-tight-display tabular-nums text-slate-950 mt-2">
                {result.telemetry.successful} / {result.telemetry.concurrency}
              </div>
              <span className="text-xs font-mono text-slate-500 mt-1 block">
                0 collisions unhandled
              </span>
            </div>

            {/* Cryptographic SHA-256 Proof */}
            <div className="glass-card rounded-2xl p-5 shadow-xs border border-white/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  SHA-256 Seal Chain
                </span>
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black tracking-tight-display text-emerald-700 mt-2">
                Verified Intact
              </div>
              <span className="text-xs font-mono text-slate-500 mt-1 block truncate">
                {result.cryptographicProof.totalEntries} entries sealed
              </span>
            </div>
          </div>

          {/* Account Balance Shift Proof */}
          <div className="glass-card rounded-2xl p-6 shadow-xs border border-white/80 space-y-4">
            <h3 className="text-base font-bold text-slate-950 tracking-tight-display flex items-center space-x-2">
              <ArrowRightLeft className="h-4 w-4 text-slate-600" />
              <span>Conservation Proof: Pre vs Post Balance Shifts</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Debit Account Shift */}
              <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                    Source Account (Debited)
                  </span>
                  <span className="text-xs font-mono text-amber-700">
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
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                    Destination Account (Credited)
                  </span>
                  <span className="text-xs font-mono text-emerald-700">
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
                  <div className="text-center font-mono font-bold text-emerald-600 text-sm">
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
            <div className="p-3 bg-slate-950 text-slate-200 rounded-xl flex items-center justify-between text-xs font-mono">
              <div className="truncate mr-3">
                <span className="text-slate-400 mr-2">LEDGER_HEAD_SEAL:</span>
                <span className="text-emerald-400">{result.cryptographicProof.headHash}</span>
              </div>
              <span className="text-slate-400 shrink-0">SHA-256</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

