'use client';

import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
  X,
  ArrowRight,
  Check,
} from 'lucide-react';
import { formatPaiseToRupees } from '@/lib/utils';

export interface ReversingEntryData {
  id: string;
  type: string;
  amountPence: string;
  debitAccountId?: string | null;
  debitAccountName?: string | null;
  creditAccountId?: string | null;
  creditAccountName?: string | null;
  note?: string | null;
}

interface ReversalModalProps {
  entry: ReversingEntryData | null;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export default function ReversalModal({
  entry,
  onClose,
  onConfirm,
  loading,
  error,
}: ReversalModalProps) {
  const [reason, setReason] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading, onClose]);

  if (!entry) return null;

  const minChars = 10;
  const maxChars = 250;
  const charCount = reason.length;
  const isReasonValid = reason.trim().length >= minChars && charCount <= maxChars;

  const debitAccName =
    entry.debitAccountName ||
    (entry.debitAccountId ? `Account ${entry.debitAccountId.slice(0, 8)}` : 'Debit Account (Source)');

  const creditAccName =
    entry.creditAccountName ||
    (entry.creditAccountId ? `Account ${entry.creditAccountId.slice(0, 8)}` : 'Credit Account (Destination)');

  const amountStr = formatPaiseToRupees(entry.amountPence);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isReasonValid || loading) return;
    await onConfirm(reason.trim());
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reversal-modal-title"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={() => {
        if (!loading) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl max-w-lg sm:max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div className="flex items-start space-x-3.5">
            <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl shrink-0 mt-0.5">
              <RotateCcw className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  Admin Authorization Required
                </span>
              </div>
              <h3 id="reversal-modal-title" className="text-xl font-bold tracking-tight text-slate-950 mt-1">
                Confirm Transaction Reversal
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Create a compensating ledger entry to nullify financial effect
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition pressable"
            aria-label="Close reversal modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2.5 text-xs text-red-700 font-medium animate-in fade-in duration-150">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Section 1: Original Transaction Summary */}
        <div className="bg-slate-50/90 rounded-2xl p-4 border border-slate-200/80 space-y-2.5 text-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Original Transaction Details
          </span>

          <div className="grid grid-cols-2 gap-3 pb-2 border-b border-slate-200/60">
            <div>
              <span className="text-slate-400 block text-[11px] font-medium">Type</span>
              <span className="font-bold text-slate-900 font-mono text-xs uppercase">{entry.type}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px] font-medium">Amount</span>
              <span className="font-bold text-slate-900 font-mono text-xs">{amountStr}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-slate-400 block text-[11px] font-medium">Source (Debit Account)</span>
              <span className="font-semibold text-slate-800 truncate block text-xs">{debitAccName}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px] font-medium">Destination (Credit Account)</span>
              <span className="font-semibold text-slate-800 truncate block text-xs">{creditAccName}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between font-mono text-[11px] text-slate-500">
            <span>Entry UUID:</span>
            <span className="truncate max-w-[240px] text-slate-700">{entry.id}</span>
          </div>
        </div>

        {/* Section 2: Expected Balance Impact (Compensating Movement) */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-2.5 text-xs">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
              Expected Reversal Balance Impact
            </span>
            <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-semibold">
              Compensating Leg
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                {debitAccName} (Refunded)
              </span>
              <div className="font-mono font-bold text-sm text-emerald-700 mt-1 tabular-nums">
                +{amountStr}
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Restores original debit outflow
              </span>
            </div>

            <div className="p-3 bg-red-50/70 rounded-xl border border-red-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-800 block">
                {creditAccName} (Reclaimed)
              </span>
              <div className="font-mono font-bold text-sm text-red-600 mt-1 tabular-nums">
                −{amountStr}
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Reverses original credit inflow
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Append-Only Guarantee Box */}
        <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-start space-x-2.5 text-xs text-amber-900">
          <ShieldAlert className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block text-amber-950">Append-Only Reversal Guarantee</span>
            <p className="mt-0.5 leading-relaxed text-amber-900/90 text-[11px]">
              The original ledger entry will remain unchanged. A new compensating transaction with paired <code>ADJUSTMENT</code> entries will be permanently appended to restore balances.
            </p>
          </div>
        </div>

        {/* Section 4: Required Reason Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="reversal-reason-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Reason for Reversal <span className="text-red-500">*</span>
              </label>
              <span
                className={`text-[11px] font-mono font-medium ${
                  charCount < minChars
                    ? 'text-amber-700'
                    : charCount > maxChars
                    ? 'text-red-600'
                    : 'text-slate-400'
                }`}
              >
                {charCount} / {maxChars} (min {minChars})
              </span>
            </div>

            <textarea
              id="reversal-reason-input"
              rows={3}
              required
              minLength={minChars}
              maxLength={maxChars}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (!isDirty) setIsDirty(true);
              }}
              placeholder="e.g. Erroneous charge — approved adjustment per dispute ticket #4092"
              className={`w-full p-3 border rounded-xl text-xs font-medium focus:ring-2 focus:outline-none transition leading-relaxed ${
                isDirty && !isReasonValid
                  ? 'border-red-300 focus:ring-red-500 bg-red-50/20'
                  : 'border-slate-300 focus:ring-amber-500'
              }`}
            />

            {isDirty && !isReasonValid && (
              <p className="text-[11px] text-red-600 mt-1 font-medium">
                {charCount < minChars
                  ? `Please provide a detailed reason (at least ${minChars - charCount} more characters required)`
                  : 'Maximum character limit exceeded'}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 transition pressable"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isReasonValid || loading}
              className="px-5 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition pressable shadow-2xs flex items-center space-x-1.5"
            >
              {loading ? (
                <>
                  <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5" />
                  <span>Executing Reversal...</span>
                </>
              ) : (
                <>
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  <span>Confirm Reversal</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
