'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { getUser, UserSession } from '@/lib/auth';
import { formatPaiseToRupees, parseRupeesToPaise } from '@/lib/utils';
import {
  ArrowLeft,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ShieldCheck,
  Send,
  Building,
  Copy,
  Check,
  RotateCcw,
  Info,
  X,
} from 'lucide-react';

interface AccountOption {
  id: string;
  name: string;
  balancePence: string;
}

export default function TransferPage() {
  const params = useParams();
  const router = useRouter();
  const fromAccountId = params.id as string;

  const [user, setUser] = useState<UserSession | null>(null);
  const [currentAccount, setCurrentAccount] = useState<AccountOption | null>(null);
  const [allAccounts, setAllAccounts] = useState<AccountOption[]>([]);

  // Form state
  const [type, setType] = useState<'transfer' | 'deposit' | 'withdrawal'>('transfer');
  const [toAccountId, setToAccountId] = useState('');
  const [amountRupees, setAmountRupees] = useState('');
  const [note, setNote] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);

  // Modal & execution state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }
    if (currentUser.role === 'AUDITOR') {
      router.push('/dashboard');
      return;
    }
    setUser(currentUser);

    // Generate fresh idempotency UUID on mount
    setIdempotencyKey(crypto.randomUUID());

    // Load accounts
    api.get<AccountOption[]>('/accounts')
      .then((accs) => {
        setAllAccounts(accs);
        const current = accs.find((a) => a.id === fromAccountId);
        if (current) {
          setCurrentAccount(current);
        }
        // Default target account to first different account
        const other = accs.find((a) => a.id !== fromAccountId);
        if (other) {
          setToAccountId(other.id);
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to load accounts');
      });
  }, [fromAccountId, router]);

  const targetAccount = useMemo(() => {
    return allAccounts.find((a) => a.id === toAccountId) || null;
  }, [allAccounts, toAccountId]);

  // Real-time calculation of parsed amount in paise
  const parsedAmountPaise = useMemo(() => {
    try {
      if (!amountRupees || amountRupees.trim() === '') return 0n;
      const paise = parseRupeesToPaise(amountRupees);
      return paise > 0n ? paise : 0n;
    } catch {
      return 0n;
    }
  }, [amountRupees]);

  const currentBalancePaise = useMemo(() => {
    try {
      return BigInt(currentAccount?.balancePence || '0');
    } catch {
      return 0n;
    }
  }, [currentAccount]);

  // Projected remaining balance
  const projectedBalancePaise = useMemo(() => {
    if (type === 'transfer' || type === 'withdrawal') {
      return currentBalancePaise - parsedAmountPaise;
    } else {
      return currentBalancePaise + parsedAmountPaise;
    }
  }, [type, currentBalancePaise, parsedAmountPaise]);

  // Validation rules
  const isDecimalInvalid = useMemo(() => {
    if (!amountRupees) return false;
    const parts = amountRupees.split('.');
    return parts.length > 1 && parts[1].length > 2;
  }, [amountRupees]);

  const isInsufficientFunds = useMemo(() => {
    if (type === 'deposit') return false;
    return parsedAmountPaise > currentBalancePaise;
  }, [type, parsedAmountPaise, currentBalancePaise]);

  const amountValidationError = useMemo(() => {
    if (!amountRupees || amountRupees.trim() === '') return null;
    const num = parseFloat(amountRupees);
    if (isNaN(num) || num <= 0) {
      return 'Amount must be greater than ₹0.00';
    }
    if (isDecimalInvalid) {
      return 'Maximum 2 decimal places allowed (paise precision)';
    }
    if (isInsufficientFunds) {
      return `Insufficient funds: Exceeds available balance of ${formatPaiseToRupees(currentAccount?.balancePence || '0')}`;
    }
    return null;
  }, [amountRupees, isDecimalInvalid, isInsufficientFunds, currentAccount]);

  const isFormValid = useMemo(() => {
    if (parsedAmountPaise <= 0n) return false;
    if (amountValidationError) return false;
    if (type === 'transfer') {
      if (!toAccountId || toAccountId === fromAccountId) return false;
    }
    return true;
  }, [parsedAmountPaise, amountValidationError, type, toAccountId, fromAccountId]);

  const handleCopyKey = () => {
    navigator.clipboard.writeText(idempotencyKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 1500);
  };

  const handleOpenReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    setError(null);
    setShowConfirmModal(true);
  };

  const handleExecuteTransfer = async () => {
    setError(null);
    setLoading(true);

    try {
      const body: any = {
        type,
        amount: parsedAmountPaise.toString(),
        note: note.trim() || undefined,
      };

      if (type === 'transfer') {
        body.fromAccountId = fromAccountId;
        body.toAccountId = toAccountId;
      } else if (type === 'withdrawal') {
        body.toAccountId = fromAccountId;
      } else if (type === 'deposit') {
        body.toAccountId = fromAccountId;
      }

      // Execute transfer with client-supplied Idempotency-Key
      const res = await api.post('/transfers', body, {
        'Idempotency-Key': idempotencyKey,
      });

      setResult(res);
      setShowConfirmModal(false);

      // Refresh current account balance
      api.get<AccountOption[]>('/accounts')
        .then((accs) => {
          setAllAccounts(accs);
          const updated = accs.find((a) => a.id === fromAccountId);
          if (updated) setCurrentAccount(updated);
        })
        .catch(() => {});

      // Generate a new idempotency key for the next fresh submission
      setIdempotencyKey(crypto.randomUUID());
    } catch (err: any) {
      setError(err.message || 'Transfer failed');
      setShowConfirmModal(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Top Banner Navigation */}
      <div className="flex items-center space-x-4 pb-4 border-b border-slate-200">
        <Link
          href={`/accounts/${fromAccountId}`}
          className="p-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-100 transition shadow-2xs pressable"
          title="Back to account statement"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight-display text-slate-950">
            Execute Money Transfer
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentAccount?.name} • Available Balance:{' '}
            <span className="font-semibold text-slate-900 font-mono">
              {formatPaiseToRupees(currentAccount?.balancePence || '0')}
            </span>
          </p>
        </div>
      </div>

      {/* Error Alert with Safe Retry */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-red-700 animate-in fade-in duration-150">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
          <button
            type="button"
            onClick={handleExecuteTransfer}
            disabled={loading}
            className="inline-flex items-center justify-center px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-900 rounded-lg text-xs font-semibold transition pressable shrink-0"
            title="Retry with the same idempotency key"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Retry with Same Key
          </button>
        </div>
      )}

      {/* Success Receipt Card */}
      {result && (
        <div className="p-6 bg-emerald-50/90 border border-emerald-200 rounded-2xl shadow-sm space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center space-x-3 text-emerald-800 font-bold text-base">
            <div className="p-1.5 bg-emerald-100 rounded-xl">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <span className="block">Transaction Successfully Posted</span>
              <span className="text-xs font-normal text-emerald-700">
                Committed with cryptographic SHA-256 seal & zero-sum conservation
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-white p-4 rounded-xl border border-emerald-200/80 text-slate-700 shadow-2xs">
            <div>
              <span className="text-slate-400 block uppercase font-medium text-[10px]">Operation</span>
              <span className="font-bold text-slate-900 uppercase font-mono">{result.type}</span>
            </div>
            <div>
              <span className="text-slate-400 block uppercase font-medium text-[10px]">Amount Posted</span>
              <span className="font-bold text-slate-900 font-mono">
                {formatPaiseToRupees(result.amountPence)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block uppercase font-medium text-[10px]">New Balance</span>
              <span className="font-bold text-slate-900 font-mono">
                {formatPaiseToRupees(result.runningBalance || result.debitRunningBalance)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block uppercase font-medium text-[10px]">Ledger Entry</span>
              <span className="truncate block font-bold text-slate-900 font-mono" title={result.entryId || result.debitEntryId}>
                {(result.entryId || result.debitEntryId || '').slice(0, 10)}...
              </span>
            </div>
          </div>

          <div className="pt-2 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setAmountRupees('');
                setNote('');
              }}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition pressable"
            >
              Make Another Transfer
            </button>
            <Link
              href={`/accounts/${fromAccountId}`}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition pressable shadow-2xs"
            >
              View Updated Statement
            </Link>
          </div>
        </div>
      )}

      {/* Main Execution Form */}
      <form onSubmit={handleOpenReview} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6">
        {/* Operation Selector (Segmented Control) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Operation Type
          </label>
          <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setType('transfer')}
              className={`py-2 px-3 text-xs font-bold rounded-lg transition flex items-center justify-center space-x-1.5 ${
                type === 'transfer'
                  ? 'bg-white text-sky-950 font-bold shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              <span>Transfer</span>
            </button>

            <button
              type="button"
              onClick={() => setType('withdrawal')}
              className={`py-2 px-3 text-xs font-bold rounded-lg transition flex items-center justify-center space-x-1.5 ${
                type === 'withdrawal'
                  ? 'bg-white text-sky-950 font-bold shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>Withdrawal</span>
            </button>

            <button
              type="button"
              onClick={() => setType('deposit')}
              className={`py-2 px-3 text-xs font-bold rounded-lg transition flex items-center justify-center space-x-1.5 ${
                type === 'deposit'
                  ? 'bg-white text-sky-950 font-bold shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownLeft className="h-3.5 w-3.5" />
              <span>Deposit</span>
            </button>
          </div>

          <p className="text-xs text-slate-500 mt-1.5 font-medium">
            {type === 'transfer' && 'Move funds between accounts with atomic double-entry conservation.'}
            {type === 'withdrawal' && 'Disburse funds from this account to external cash or vault.'}
            {type === 'deposit' && 'Intake funds from external wire or settlement into this account.'}
          </p>
        </div>

        {/* Source & Destination Account Routing Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Source Account Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Source Account (From)
            </label>
            {type === 'deposit' ? (
              <div className="h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center text-xs text-slate-700 font-medium">
                <Building className="h-4 w-4 mr-2 text-slate-400" />
                <span>External Wire / Cash Settlement</span>
              </div>
            ) : (
              <div className="h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-800 font-medium">
                <div className="flex items-center space-x-2 truncate">
                  <span className="font-semibold text-slate-900">{currentAccount?.name}</span>
                  <span className="text-slate-400 font-mono text-[11px]">(Current)</span>
                </div>
                <span className="font-mono text-slate-600 shrink-0 font-medium">
                  {formatPaiseToRupees(currentAccount?.balancePence || '0')}
                </span>
              </div>
            )}
          </div>

          {/* Destination Account Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Destination Account (To)
            </label>
            {type === 'transfer' ? (
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                className="h-11 block w-full px-3.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white transition"
              >
                {allAccounts
                  .filter((acc) => acc.id !== fromAccountId)
                  .map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatPaiseToRupees(acc.balancePence)})
                    </option>
                  ))}
              </select>
            ) : type === 'withdrawal' ? (
              <div className="h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center text-xs text-slate-700 font-medium">
                <Building className="h-4 w-4 mr-2 text-slate-400" />
                <span>External Vault / Cash Payout</span>
              </div>
            ) : (
              <div className="h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-800 font-medium">
                <div className="flex items-center space-x-2 truncate">
                  <span className="font-semibold text-slate-900">{currentAccount?.name}</span>
                  <span className="text-slate-400 font-mono text-[11px]">(Current)</span>
                </div>
                <span className="font-mono text-slate-600 shrink-0 font-medium">
                  {formatPaiseToRupees(currentAccount?.balancePence || '0')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Amount Input with Inline Validation */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Amount (₹ INR)
            </label>
            <span className="text-xs text-slate-400 font-medium">
              Exact paise precision (2 decimals)
            </span>
          </div>

          <div className="relative rounded-xl shadow-2xs">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none font-bold text-slate-400 text-sm">
              ₹
            </div>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={amountRupees}
              onChange={(e) => setAmountRupees(e.target.value)}
              className={`h-11 block w-full pl-9 pr-3.5 py-2.5 border rounded-xl text-sm font-medium focus:ring-2 focus:outline-none transition ${
                amountValidationError
                  ? 'border-red-300 focus:ring-red-500 bg-red-50/20'
                  : 'border-slate-300 focus:ring-sky-500'
              }`}
              placeholder="100.00"
            />
          </div>

          {amountValidationError && (
            <div className="mt-1.5 flex items-center space-x-1.5 text-xs text-red-600 font-medium animate-in fade-in duration-100">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>{amountValidationError}</span>
            </div>
          )}
        </div>

        {/* Real-time Dynamic Transaction Preview / Balance Impact Card */}
        <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
              <ArrowRightLeft className="h-3.5 w-3.5 text-slate-500" />
              <span>Financial Impact Preview</span>
            </span>
            <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase">
              Pre-Commit Simulation
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block font-medium">Current Balance:</span>
              <span className="font-bold text-slate-900 font-mono text-sm">
                {formatPaiseToRupees(currentAccount?.balancePence || '0')}
              </span>
            </div>

            <div>
              <span className="text-slate-500 block font-medium">
                {type === 'deposit' ? 'Credit Impact:' : 'Debit Impact:'}
              </span>
              <span
                className={`font-bold font-mono text-sm tabular-nums ${
                  type === 'deposit' ? 'text-emerald-700' : 'text-red-600'
                }`}
              >
                {type === 'deposit' ? '+' : '−'}
                {formatPaiseToRupees(parsedAmountPaise.toString())}
              </span>
            </div>

            <div>
              <span className="text-slate-500 block font-medium">Projected Balance:</span>
              <span
                className={`font-bold font-mono text-sm tabular-nums ${
                  isInsufficientFunds
                    ? 'text-red-600 line-through'
                    : 'text-slate-950'
                }`}
              >
                {formatPaiseToRupees(projectedBalancePaise.toString())}
              </span>
            </div>
          </div>

          {isInsufficientFunds && (
            <div className="pt-2 border-t border-red-200/60 flex items-center space-x-2 text-xs text-red-700 font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                Transaction will be refused by the core banking engine (Overdraft Limit Exceeded).
              </span>
            </div>
          )}
        </div>

        {/* Note / Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Note / Purpose Reference
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="h-11 block w-full px-3.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none transition"
            placeholder="e.g. Supplier payment / invoice dispute settlement"
          />
        </div>

        {/* Idempotency Key Section (Refined secondary weight) */}
        <div className="p-3 bg-slate-50/80 border border-slate-200/80 rounded-xl text-xs text-slate-600 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="font-semibold text-slate-800 text-[11px] uppercase tracking-wider">
                Idempotency Protection
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleCopyKey}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium inline-flex items-center transition"
                title="Copy full idempotency UUID"
              >
                {copiedKey ? (
                  <>
                    <Check className="h-3 w-3 mr-1 text-emerald-600" />
                    <span className="text-emerald-700">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 mr-1 text-slate-400" />
                    <span>Copy</span>
                  </>
                )}
              </button>
              <span className="text-slate-300">·</span>
              <button
                type="button"
                onClick={() => setIdempotencyKey(crypto.randomUUID())}
                className="text-xs text-sky-600 hover:text-sky-800 font-medium transition"
                title="Regenerate key for a brand new transaction"
              >
                Regenerate
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span className="truncate">Key: {idempotencyKey}</span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
            Guarantees at-most-once execution; prevents duplicate transactions on network retries. Keep key stable during retry.
          </p>
        </div>

        {/* Primary Action Button */}
        <button
          type="submit"
          disabled={!isFormValid || loading}
          className="h-12 w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition pressable"
        >
          <Send className="mr-2 h-4 w-4" />
          Review & Confirm Transfer
        </button>
      </form>

      {/* Financial Trust & Confirmation Modal */}
      {showConfirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full">
                  Confirmation Required
                </span>
                <h3 id="confirm-modal-title" className="text-xl font-bold tracking-tight text-slate-950 mt-1">
                  Confirm Transaction
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review transaction details before posting into immutable ledger
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Prominent Amount Card */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Transaction Volume
              </span>
              <div className="text-3xl font-black tracking-tight text-slate-950 font-mono">
                {formatPaiseToRupees(parsedAmountPaise.toString())}
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {parsedAmountPaise.toString()} paise
              </span>
            </div>

            {/* Route & Balance Breakdown */}
            <div className="space-y-2 text-xs bg-slate-50/60 p-3.5 rounded-xl border border-slate-200/80">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Operation:</span>
                <span className="font-bold text-slate-900 uppercase font-mono">{type}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">From:</span>
                <span className="font-semibold text-slate-900">
                  {type === 'deposit' ? 'External Settlement' : currentAccount?.name}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">To:</span>
                <span className="font-semibold text-slate-900">
                  {type === 'transfer'
                    ? targetAccount?.name || 'Destination Account'
                    : type === 'withdrawal'
                    ? 'External Vault Payout'
                    : currentAccount?.name}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Projected Balance:</span>
                <span className="font-bold text-slate-950 font-mono">
                  {formatPaiseToRupees(projectedBalancePaise.toString())}
                </span>
              </div>
              {note.trim() && (
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Note:</span>
                  <span className="font-mono text-slate-800 text-right truncate max-w-[200px]">
                    {note}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-1">
                <span className="text-slate-500 font-medium">Idempotency Key:</span>
                <span className="font-mono text-slate-600 text-[11px] truncate max-w-[180px]">
                  {idempotencyKey.slice(0, 14)}...
                </span>
              </div>
            </div>

            {/* Double-entry Guarantee Callout */}
            <div className="p-3 bg-indigo-50 border border-indigo-200/70 rounded-xl flex items-start space-x-2 text-xs text-indigo-900">
              <ShieldCheck className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
              <span>
                <strong>PostgreSQL Serializable Isolation:</strong> This transaction will execute with row-level locks, zero-sum double-entry legs, and SHA-256 seal verification.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 transition pressable"
              >
                Back to Edit
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleExecuteTransfer}
                className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition pressable shadow-2xs disabled:opacity-50 flex items-center justify-center space-x-1.5"
              >
                {loading ? (
                  <span>Posting Entry...</span>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Confirm & Post</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

