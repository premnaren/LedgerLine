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

      {/* Result Panel (Success Confirmation): Transient panel with border-l-2 var(--ledger-green) ONLY */}
      {result && (
        <div className="p-5 bg-white border border-rule border-l-2 border-l-ledger-green rounded space-y-3">
          <div className="flex items-center space-x-2 text-ink text-xs font-semibold">
            <CheckCircle2 className="h-4 w-4 text-ledger-green" />
            <span>Transaction successfully posted</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-paper p-3 border border-rule rounded">
            <div>
              <span className="text-ink-muted block text-[11px]">Operation</span>
              <span className="mono-num font-medium text-ink uppercase">{result.type}</span>
            </div>
            <div>
              <span className="text-ink-muted block text-[11px]">Amount posted</span>
              <span className="mono-num font-medium text-ink">
                {formatPaiseToRupees(result.amountPence)}
              </span>
            </div>
            <div>
              <span className="text-ink-muted block text-[11px]">New balance</span>
              <span className="mono-num font-medium text-ink">
                {formatPaiseToRupees(result.runningBalance || result.debitRunningBalance)}
              </span>
            </div>
            <div>
              <span className="text-ink-muted block text-[11px]">Ledger entry</span>
              <span className="mono-num font-medium text-ink truncate block">
                {(result.entryId || result.debitEntryId || '').slice(0, 10)}...
              </span>
            </div>
          </div>

          <div className="pt-2 flex justify-end space-x-2.5 text-xs">
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setAmountRupees('');
                setNote('');
              }}
              className="px-3 py-1.5 border border-rule rounded text-ink-muted hover:text-ink"
            >
              Make another transfer
            </button>
            <Link
              href={`/accounts/${fromAccountId}`}
              className="px-3 py-1.5 bg-accent text-white rounded font-medium hover:opacity-90"
            >
              View updated statement
            </Link>
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

          <p className="text-[11px] text-ink-faint">
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
                  <Building className="h-3.5 w-3.5 mr-2 text-ink-faint" />
                  <span>External settlement</span>
                </div>
              ) : (
                <div className="h-10 px-3 bg-paper border border-rule rounded flex items-center justify-between text-xs text-ink">
                  <span className="font-medium truncate">{currentAccount?.name}</span>
                  <span className="mono-num text-ink-muted shrink-0">
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
                  <Building className="h-3.5 w-3.5 mr-2 text-ink-faint" />
                  <span>External vault payout</span>
                </div>
              ) : (
                <div className="h-10 px-3 bg-paper border border-rule rounded flex items-center justify-between text-xs text-ink">
                  <span className="font-medium truncate">{currentAccount?.name}</span>
                  <span className="mono-num text-ink-muted shrink-0">
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
              <span className="text-[11px] mono-num text-ink-faint">
                Exact paise precision
              </span>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-faint text-xs">
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
                <AlertTriangle className="h-3 w-3 shrink-0" />
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
            <span className="mono-num text-[11px] text-ink-muted">
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

            <div className="flex justify-between pt-1 border-t border-rule text-[11px] text-ink-faint">
              <span>Total system circulation:</span>
              <span className="mono-num">{formatPaiseToRupees(totalSystemBalancePaise.toString())}</span>
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
                    className="text-xs text-accent hover:underline"
                  >
                    {copiedKey ? 'Copied' : 'Copy'}
                  </button>
                  <span className="text-ink-faint">·</span>
                  <button
                    type="button"
                    onClick={() => setIdempotencyKey(crypto.randomUUID())}
                    className="text-xs text-accent hover:underline"
                  >
                    Regenerate
                  </button>
                </div>
              </div>
              <div className="mono-num text-[11px] text-ink-muted bg-white p-2 border border-rule rounded truncate">
                {idempotencyKey}
              </div>
              <p className="text-[11px] text-ink-faint">
                Guarantees at-most-once execution; duplicate submits will replay the original result.
              </p>
            </div>
          )}
        </div>

        {/* Primary Action Button: The single prominent filled CTA */}
        <button
          type="submit"
          disabled={!isFormValid || loading}
          className="h-10 w-full flex justify-center items-center py-2 px-4 rounded text-xs font-semibold text-white bg-accent hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition pressable"
        >
          <span>Confirm &amp; post entry</span>
          <ArrowRight className="ml-2 h-3.5 w-3.5" />
        </button>
      </form>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
        >
          <div className="bg-white rounded border border-rule max-w-md w-full p-5 space-y-4">
            <div className="flex items-start justify-between pb-2 border-b border-rule">
              <div>
                <h3 className="text-sm font-semibold text-ink">
                  Confirm transaction
                </h3>
                <p className="text-xs text-ink-muted">
                  Review transaction before committing to the immutable ledger
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="text-ink-faint hover:text-ink p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3 bg-paper border border-rule rounded text-center">
              <span className="text-xs text-ink-muted block">Transaction amount</span>
              <div className="mono-num text-2xl font-medium text-ink mt-0.5">
                {formatPaiseToRupees(parsedAmountPaise.toString())}
              </div>
            </div>

            <div className="space-y-1.5 text-xs bg-paper p-3 border border-rule rounded">
              <div className="flex justify-between">
                <span className="text-ink-muted">Operation:</span>
                <span className="mono-num font-medium text-ink uppercase">{type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">From:</span>
                <span className="font-medium text-ink truncate max-w-[200px]">
                  {type === 'deposit' ? 'External Settlement' : currentAccount?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">To:</span>
                <span className="font-medium text-ink truncate max-w-[200px]">
                  {type === 'transfer'
                    ? targetAccount?.name || 'Destination'
                    : type === 'withdrawal'
                    ? 'External Vault Payout'
                    : currentAccount?.name}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-rule">
                <span className="text-ink-muted">Remaining balance:</span>
                <span className="mono-num font-medium text-ink">
                  {formatPaiseToRupees(projectedCurrentBalancePaise.toString())}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2 px-3 text-xs font-medium text-ink-muted hover:text-ink border border-rule rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleExecuteTransfer}
                className="flex-1 py-2 px-3 text-xs font-semibold text-white bg-accent rounded hover:opacity-95 disabled:opacity-50"
              >
                {loading ? 'Posting...' : 'Confirm & post entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
