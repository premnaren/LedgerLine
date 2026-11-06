'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { getUser, UserSession } from '@/lib/auth';
import { formatPaiseToRupees, parseRupeesToPaise } from '@/lib/utils';
import {
  ArrowLeft,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Send,
  Building,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const amountPaise = parseRupeesToPaise(amountRupees);
      if (amountPaise <= BigInt(0)) {
        throw new Error('Please enter a valid positive amount');
      }

      const body: any = {
        type,
        amount: amountPaise.toString(),
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

      // Generate a new idempotency key for the next submission
      setIdempotencyKey(crypto.randomUUID());
    } catch (err: any) {
      setError(err.message || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center space-x-4 pb-4 border-b border-slate-200">
        <Link
          href={`/accounts/${fromAccountId}`}
          className="p-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100 transition shadow-sm"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Execute Money Transfer
          </h1>
          <p className="text-sm text-slate-500">
            {currentAccount?.name} • Balance: {formatPaiseToRupees(currentAccount?.balancePence || '0')}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-3 text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {result && (
        <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center space-x-3 text-emerald-800 font-bold text-base">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            <span>Transfer Executed Successfully</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs font-mono bg-white p-4 rounded-xl border border-emerald-200 text-slate-700">
            <div>
              <span className="text-slate-400 block uppercase font-sans">Operation</span>
              <span className="font-bold text-slate-900">{result.type}</span>
            </div>
            <div>
              <span className="text-slate-400 block uppercase font-sans">Amount</span>
              <span className="font-bold text-slate-900">
                {formatPaiseToRupees(result.amountPence)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block uppercase font-sans">New Balance</span>
              <span className="font-bold text-slate-900">
                {formatPaiseToRupees(result.runningBalance || result.debitRunningBalance)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block uppercase font-sans">Ledger Entry</span>
              <span className="truncate block font-bold text-slate-900">
                {result.entryId || result.debitEntryId}
              </span>
            </div>
          </div>

          <div className="pt-2 flex justify-end space-x-3">
            <Link
              href={`/accounts/${fromAccountId}`}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition"
            >
              View Updated Statement
            </Link>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
            Operation Type
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(['transfer', 'withdrawal', 'deposit'] as const).map((op) => (
              <button
                key={op}
                type="button"
                onClick={() => setType(op)}
                className={`py-2 px-3 text-xs font-bold rounded-lg border uppercase tracking-wider transition ${
                  type === op
                    ? 'bg-sky-50 text-sky-700 border-sky-400 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {op}
              </button>
            ))}
          </div>
        </div>

        {type === 'transfer' && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Destination Account (To)
            </label>
            <select
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
              className="block w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              {allAccounts
                .filter((acc) => acc.id !== fromAccountId)
                .map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.id.slice(0, 10)}...)
                  </option>
                ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
            Amount (₹ INR)
          </label>
          <div className="relative rounded-lg shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none font-bold text-slate-400">
              ₹
            </div>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={amountRupees}
              onChange={(e) => setAmountRupees(e.target.value)}
              className="block w-full pl-8 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
              placeholder="100.00"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
            Note / Description
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="block w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
            placeholder="e.g. Supplier invoice payment #4092"
          />
        </div>

        {/* Idempotency Key Info */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-600 flex items-center justify-between">
          <div className="flex items-center space-x-2 truncate">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="truncate">Idempotency-Key: {idempotencyKey}</span>
          </div>
          <button
            type="button"
            onClick={() => setIdempotencyKey(crypto.randomUUID())}
            className="text-xs text-sky-600 hover:text-sky-700 font-sans font-medium underline ml-2 shrink-0"
          >
            Regenerate
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 transition"
        >
          {loading ? (
            'Processing in Serializable Transaction...'
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Confirm & Post Entry
            </>
          )}
        </button>
      </form>
    </div>
  );
}

