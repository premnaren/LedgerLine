'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { getUser, UserSession } from '@/lib/auth';
import { formatPaiseToRupees, parseRupeesToPaise } from '@/lib/utils';
import {
  ArrowLeft,
  ArrowRight,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Building,
  Copy,
  Check,
  RotateCcw,
  X,
  ChevronDown,
  ShieldCheck,
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
  const [showAdvanced, setShowAdvanced] = useState(false);

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

  const targetBalancePaise = useMemo(() => {
    try {
      return BigInt(targetAccount?.balancePence || '0');
    } catch {
      return 0n;
    }
  }, [targetAccount]);

  // Total system balance invariant across all accounts
  const totalSystemBalancePaise = useMemo(() => {
    return allAccounts.reduce((sum, acc) => {
      try {
        return sum + BigInt(acc.balancePence);
      } catch {
        return sum;
      }
    }, 0n);
  }, [allAccounts]);

  // Projected balances
  const projectedCurrentBalancePaise = useMemo(() => {
    if (type === 'transfer' || type === 'withdrawal') {
      return currentBalancePaise - parsedAmountPaise;
    } else {
      return currentBalancePaise + parsedAmountPaise;
    }
  }, [type, currentBalancePaise, parsedAmountPaise]);

  const projectedTargetBalancePaise = useMemo(() => {
    return targetBalancePaise + parsedAmountPaise;
  }, [targetBalancePaise, parsedAmountPaise]);

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

  const pageTitle =
    type === 'transfer'
      ? 'Execute account transfer'
      : type === 'withdrawal'
      ? 'Execute cash withdrawal'
      : 'Execute funds deposit';

  const pageSubtitle =
    type === 'transfer'
      ? 'Atomic double-entry transfer between ledger accounts'
      : type === 'withdrawal'
      ? 'Disburse funds from ledger to external account'
      : 'Intake funds from external wire/cash into ledger account';

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Top Banner Navigation */}
      <div className="flex items-center justify-between pb-4 border-b border-rule">
        <div className="flex items-center space-x-3">
          <Link
            href={`/accounts/${fromAccountId}`}
            className="p-2 border border-rule rounded text-ink-muted hover:text-ink hover:bg-rule/30 transition pressable"
            title="Back to account statement"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-ink">
              {pageTitle}
            </h1>
            <p className="text-xs text-ink-muted mt-0.5">
              {currentAccount?.name} · Available balance:{' '}
              <span className="font-medium mono-num text-ink">
                {formatPaiseToRupees(currentAccount?.balancePence || '0')}
              </span>
            </p>
          </div>
        </div>

        <span className="flex items-center gap-1.5 text-xs text-ink-muted font-medium">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--ledger-green)' }} />
          PostgreSQL Serializable
        </span>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3.5 bg-paper border border-ledger-red rounded flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-ledger-red text-xs">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
          <button
            type="button"
            onClick={handleExecuteTransfer}
            disabled={loading}
            className="inline-flex items-center text-xs font-semibold underline shrink-0"
            title="Retry with the same idempotency key"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Retry with same key
          </button>
        </div>
      )}

      {/* Result Panel (Success Confirmation): Comprehensive proof with direct statement linkage */}
      {result && (
        <div className="p-5 bg-white border border-rule border-l-4 border-l-ledger-green rounded space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2 text-ink text-sm font-semibold">
              <CheckCircle2 className="h-5 w-5 text-ledger-green shrink-0" />
              <span>Transaction successfully posted to immutable ledger</span>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-paper text-ledger-green border border-rule font-medium">
              SHA-256 SEALED
            </span>
          </div>

          <p className="text-xs text-ink-muted">
            The journal entry has been verified with PostgreSQL Serializable isolation and appended to the cryptographic hash chain. Balance conservation is guaranteed (ΔΣ = 0).
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-paper p-3.5 border border-rule rounded">
            <div>
              <span className="text-ink-muted block text-xs">Operation</span>
              <span className="mono-num font-semibold text-ink uppercase">{result.type}</span>
            </div>
            <div>
              <span className="text-ink-muted block text-xs">Amount posted</span>
              <span className="mono-num font-semibold text-ink">
                {formatPaiseToRupees(result.amountPence)}
              </span>
            </div>
            <div>
              <span className="text-ink-muted block text-xs">Updated balance</span>
              <span className="mono-num font-semibold text-ink">
                {formatPaiseToRupees(result.runningBalance || result.debitRunningBalance)}
              </span>
            </div>
            <div>
              <span className="text-ink-muted block text-xs">Entry UUID</span>
              <span className="mono-num font-medium text-ink truncate block" title={result.entryId || result.debitEntryId}>
                {(result.entryId || result.debitEntryId || '').slice(0, 12)}...
              </span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border-t border-rule">
            <span className="text-xs text-ink-muted">
              Find this entry recorded on your statement or audit trail.
            </span>
            <div className="flex items-center space-x-2.5">
              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setAmountRupees('');
                  setNote('');
                }}
                className="px-3.5 py-2 border border-rule rounded text-ink-muted hover:text-ink hover:bg-paper transition font-medium"
              >
                Make another transfer
              </button>
              <Link
                href={`/accounts/${fromAccountId}`}
                className="px-4 py-2 bg-accent text-white rounded font-medium hover:opacity-90 transition pressable"
              >
                View updated statement →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Execution Form */}
      <form onSubmit={handleOpenReview} className="bg-white border border-rule rounded p-6 space-y-5">
        {/* Step 1: Operation Type Selector using Tab-Underline Pattern */}
        <div className="space-y-2">
          <label className="block text-xs text-ink-muted font-medium">
            Operation type
          </label>

          <div className="flex border-b border-rule">
            <button
              type="button"
              role="tab"
              aria-selected={type === 'transfer'}
              onClick={() => setType('transfer')}
              className={`pb-2 px-4 text-xs font-medium transition ${
                type === 'transfer'
                  ? 'border-b-2 border-accent text-accent font-semibold'
                  : 'text-ink-muted hover:text-ink border-b-2 border-transparent'
              }`}
            >
              Transfer
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={type === 'withdrawal'}
              onClick={() => setType('withdrawal')}
              className={`pb-2 px-4 text-xs font-medium transition ${
                type === 'withdrawal'
                  ? 'border-b-2 border-accent text-accent font-semibold'
                  : 'text-ink-muted hover:text-ink border-b-2 border-transparent'
              }`}
            >
              Withdrawal
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={type === 'deposit'}
              onClick={() => setType('deposit')}
              className={`pb-2 px-4 text-xs font-medium transition ${
                type === 'deposit'
                  ? 'border-b-2 border-accent text-accent font-semibold'
                  : 'text-ink-muted hover:text-ink border-b-2 border-transparent'
              }`}
            >
              Deposit
            </button>
          </div>

          <p className="text-xs text-ink-muted">
            {pageSubtitle}
          </p>
        </div>

        {/* Step 2: Routing Details */}
        <div className="space-y-4 pt-2 border-t border-rule">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* From Account */}
            <div>
              <label className="block text-xs text-ink-muted font-medium mb-1">
                From account (debit)
              </label>
              {type === 'deposit' ? (
                <div className="h-10 px-3 bg-paper border border-rule rounded flex items-center text-xs text-ink-muted">
                  <Building className="h-3.5 w-3.5 mr-2 text-ink-muted" />
                  <span>External settlement</span>
                </div>
              ) : (
                <div className="h-10 px-3 bg-paper border border-rule rounded flex items-center justify-between text-xs text-ink">
                  <span className="font-medium truncate">{currentAccount?.name}</span>
                  <span className="mono-num text-ink-muted shrink-0 font-medium">
                    {formatPaiseToRupees(currentAccount?.balancePence || '0')}
                  </span>
                </div>
              )}
            </div>

            {/* To Account */}
            <div>
              <label className="block text-xs text-ink-muted font-medium mb-1">
                Destination account
              </label>
              {type === 'transfer' ? (
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="h-10 block w-full px-3 border border-rule rounded text-xs text-ink bg-white focus:outline-none focus:border-accent"
                >
                  {allAccounts
                    .filter((acc) => acc.id !== fromAccountId)
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} · {formatPaiseToRupees(acc.balancePence)}
                      </option>
                    ))}
                </select>
              ) : type === 'withdrawal' ? (
                <div className="h-10 px-3 bg-paper border border-rule rounded flex items-center text-xs text-ink-muted">
                  <Building className="h-3.5 w-3.5 mr-2 text-ink-muted" />
                  <span>External vault payout</span>
                </div>
              ) : (
                <div className="h-10 px-3 bg-paper border border-rule rounded flex items-center justify-between text-xs text-ink">
                  <span className="font-medium truncate">{currentAccount?.name}</span>
                  <span className="mono-num text-ink-muted shrink-0 font-medium">
                    {formatPaiseToRupees(currentAccount?.balancePence || '0')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Amount Field with .mono-num font on the input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs text-ink-muted font-medium">
                Amount (₹ INR)
              </label>
              <span className="text-xs mono-num text-ink-muted">
                Exact paise precision
              </span>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-muted text-xs font-medium">
                ₹
              </div>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
                className={`mono-num h-10 block w-full pl-7 pr-3 border rounded text-xs text-ink focus:outline-none focus:border-accent ${
                  amountValidationError ? 'border-ledger-red' : 'border-rule'
                }`}
                placeholder="100.00"
              />
            </div>

            {amountValidationError && (
              <div className="mt-1 flex items-center space-x-1.5 text-xs text-ledger-red">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>{amountValidationError}</span>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-ink-muted font-medium mb-1">
              Transaction description
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-10 block w-full px-3 border border-rule rounded text-xs text-ink focus:outline-none focus:border-accent"
              placeholder="e.g. Invoice payment #4092"
            />
          </div>
        </div>

        {/* Step 3: Projected Balances (Zero-sum conservation check) */}
        <div className="space-y-3 pt-2 border-t border-rule text-xs">
          <div className="flex items-center justify-between">
            <span className="text-ink-muted font-medium">Balance preview</span>
            <span className="mono-num text-xs text-ink-muted">
              Zero-sum invariant Δ=0
            </span>
          </div>

          <div className="bg-paper border border-rule rounded p-3 space-y-2">
            <div className="flex justify-between">
              <span className="text-ink-muted">{currentAccount?.name} projected balance:</span>
              <span
                className={`mono-num font-medium ${
                  isInsufficientFunds ? 'text-ledger-red line-through' : 'text-ink'
                }`}
              >
                {formatPaiseToRupees(projectedCurrentBalancePaise.toString())}
              </span>
            </div>

            {type === 'transfer' && targetAccount && (
              <div className="flex justify-between">
                <span className="text-ink-muted">{targetAccount.name} projected balance:</span>
                <span className="mono-num font-medium text-ink">
                  {formatPaiseToRupees(projectedTargetBalancePaise.toString())}
                </span>
              </div>
            )}

            <div className="flex justify-between pt-1 border-t border-rule text-xs text-ink-muted">
              <span>Total system circulation:</span>
              <span className="mono-num font-medium">{formatPaiseToRupees(totalSystemBalancePaise.toString())}</span>
            </div>
          </div>
        </div>

        {/* Advanced: Idempotency Key */}
        <div className="pt-2 border-t border-rule">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between w-full text-xs text-ink-muted hover:text-ink py-1"
          >
            <span>Idempotency key &amp; client nonce</span>
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
            />
          </button>

          {showAdvanced && (
            <div className="mt-2 p-3 bg-paper border border-rule rounded space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-ink-muted font-medium">Idempotency-Key:</span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleCopyKey}
                    className="text-xs text-accent hover:underline font-medium"
                  >
                    {copiedKey ? 'Copied' : 'Copy'}
                  </button>
                  <span className="text-ink-muted">·</span>
                  <button
                    type="button"
                    onClick={() => setIdempotencyKey(crypto.randomUUID())}
                    className="text-xs text-accent hover:underline font-medium"
                  >
                    Regenerate
                  </button>
                </div>
              </div>
              <div className="mono-num text-xs text-ink-muted bg-white p-2 border border-rule rounded truncate">
                {idempotencyKey}
              </div>
              <p className="text-xs text-ink-muted">
                Guarantees at-most-once execution; duplicate submits will safely replay the original result without double-posting.
              </p>
            </div>
          )}
        </div>

        {/* Primary Action Button: Clear review step before money moves */}
        <button
          type="submit"
          disabled={!isFormValid || loading}
          className="h-10 w-full flex justify-center items-center py-2 px-4 rounded text-xs font-semibold text-white bg-accent hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition pressable"
        >
          <span>Review {type}</span>
          <ArrowRight className="ml-2 h-3.5 w-3.5" />
        </button>
      </form>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 animate-in fade-in duration-100"
        >
          <div className="bg-white rounded border border-rule max-w-lg w-full p-6 space-y-5 shadow-lg animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-3 border-b border-rule">
              <div>
                <h3 className="text-base font-bold text-ink">
                  Review &amp; confirm {type}
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  Verify transaction details before committing to the immutable double-entry ledger.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="text-ink-muted hover:text-ink p-1 rounded hover:bg-paper transition"
                aria-label="Close review dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Amount & Fee Summary Card */}
            <div className="p-4 bg-paper border border-rule rounded text-center space-y-1">
              <span className="text-xs text-ink-muted font-medium block">
                Total {type} amount
              </span>
              <div className="mono-num text-2xl font-bold text-ink">
                {formatPaiseToRupees(parsedAmountPaise.toString())}
              </div>
              <div className="text-xs text-ink-muted flex items-center justify-center gap-1.5 pt-1">
                <span>Fee:</span>
                <span className="font-semibold text-ledger-green">₹0.00 (Zero fee · Core engine)</span>
              </div>
            </div>

            {/* High-Value Notice for transactions >= ₹10,000 */}
            {parsedAmountPaise >= 1000000n && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded text-xs text-amber-950 flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-semibold block">High-value money movement notice</span>
                  <p className="text-amber-900 leading-relaxed">
                    This transfer equals or exceeds ₹10,000.00. Transactions are cryptographically signed and permanent upon posting. Ensure both accounts are accurate.
                  </p>
                </div>
              </div>
            )}

            {/* Detailed Transfer Summary */}
            <div className="space-y-2 text-xs bg-paper p-3.5 border border-rule rounded">
              <div className="flex justify-between items-center">
                <span className="text-ink-muted">Operation:</span>
                <span className="mono-num font-semibold text-ink uppercase">{type}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-muted">From (debit):</span>
                <span className="font-medium text-ink truncate max-w-[260px]">
                  {type === 'deposit' ? 'External Settlement' : `${currentAccount?.name} (${formatPaiseToRupees(currentAccount?.balancePence || '0')})`}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-muted">To (credit):</span>
                <span className="font-medium text-ink truncate max-w-[260px]">
                  {type === 'transfer'
                    ? `${targetAccount?.name || 'Destination'} (${formatPaiseToRupees(targetAccount?.balancePence || '0')})`
                    : type === 'withdrawal'
                    ? 'External Vault Payout'
                    : currentAccount?.name}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-muted">Description:</span>
                <span className="font-medium text-ink truncate max-w-[260px]">
                  {note.trim() ? note.trim() : 'None specified'}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-rule">
                <span className="text-ink-muted font-medium">Projected sender balance:</span>
                <span className="mono-num font-bold text-ink">
                  {formatPaiseToRupees(projectedCurrentBalancePaise.toString())}
                </span>
              </div>
            </div>

            {/* Protection Guarantee Notice */}
            <div className="flex items-center space-x-1.5 text-xs text-ink-muted">
              <ShieldCheck className="h-4 w-4 text-ledger-green shrink-0" />
              <span>Idempotent submission protected. No duplicate charges on retry.</span>
            </div>

            {/* Explicit Actions with Dynamic Labeling */}
            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 px-4 text-xs font-medium text-ink-muted hover:text-ink border border-rule rounded hover:bg-paper transition"
              >
                Back to edit
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleExecuteTransfer}
                className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-accent rounded hover:opacity-95 disabled:opacity-50 transition pressable flex items-center justify-center space-x-1.5"
              >
                {loading ? (
                  <span>Posting {formatPaiseToRupees(parsedAmountPaise.toString())}...</span>
                ) : (
                  <span>Post {formatPaiseToRupees(parsedAmountPaise.toString())} {type}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
