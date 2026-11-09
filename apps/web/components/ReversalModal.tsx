'use client';

import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  ShieldAlert,
  AlertCircle,
  X,
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
  isOpen?: boolean;
  entry: ReversingEntryData | null;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  reason?: string;
  setReason?: (val: string) => void;
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
    (entry.debitAccountId ? `Account ${entry.debitAccountId.slice(0, 8)}` : 'Debit account (source)');

  const creditAccName =
    entry.creditAccountName ||
    (entry.creditAccountId ? `Account ${entry.creditAccountId.slice(0, 8)}` : 'Credit account (destination)');

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
      className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/40 p-4"
      onClick={() => {
        if (!loading) onClose();
      }}
    >
      <div
        className="bg-white rounded border border-rule max-w-lg w-full p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-rule">
          <div>
            <span className="text-[11px] font-medium text-ink-muted">
              Admin authorization required
            </span>
            <h3 id="reversal-modal-title" className="text-base font-semibold text-ink mt-0.5">
              Confirm transaction reversal
            </h3>
            <p className="text-xs text-ink-muted">
              Create a compensating ledger entry to nullify financial effect
            </p>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="text-ink-faint hover:text-ink p-1"
            aria-label="Close reversal modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-paper border border-ledger-red rounded flex items-center space-x-2 text-xs text-ledger-red">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Original Details */}
        <div className="bg-paper rounded border border-rule p-3 space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-2 pb-2 border-b border-rule">
            <div>
              <span className="text-ink-muted block text-[11px]">Type:</span>
              <span className="mono-num font-medium text-ink">{entry.type}</span>
            </div>
            <div>
              <span className="text-ink-muted block text-[11px]">Amount:</span>
              <span className="mono-num font-medium text-ink">{amountStr}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-ink-muted block text-[11px]">Source (debit):</span>
              <span className="text-ink truncate block">{debitAccName}</span>
            </div>
            <div>
              <span className="text-ink-muted block text-[11px]">Destination (credit):</span>
              <span className="text-ink truncate block">{creditAccName}</span>
            </div>
          </div>
        </div>

        {/* Expected Reversal Impact */}
        <div className="border border-rule rounded p-3 space-y-2 text-xs bg-white">
          <span className="text-ink-muted font-medium block">
            Expected balance impact
          </span>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 bg-paper border border-rule rounded">
              <span className="text-[11px] text-ink-muted block">{debitAccName}</span>
              <div className="mono-num font-medium text-ledger-green text-sm mt-0.5">
                +{amountStr}
              </div>
              <span className="text-[10px] text-ink-faint block">Restores debit</span>
            </div>

            <div className="p-2.5 bg-paper border border-rule rounded">
              <span className="text-[11px] text-ink-muted block">{creditAccName}</span>
              <div className="mono-num font-medium text-ledger-red text-sm mt-0.5">
                −{amountStr}
              </div>
              <span className="text-[10px] text-ink-faint block">Reverses credit</span>
            </div>
          </div>
        </div>

        {/* Append-only guarantee */}
        <div className="p-3 bg-paper border border-rule rounded flex items-start space-x-2 text-xs text-ink-muted">
          <ShieldAlert className="h-4 w-4 text-accent shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            The original ledger entry will remain unchanged. A compensating transaction with paired <code>ADJUSTMENT</code> entries will be permanently appended to restore balances.
          </p>
        </div>

        {/* Required Reason Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="reversal-reason-input" className="block text-xs font-medium text-ink-muted">
                Reason for reversal *
              </label>
              <span className="text-[11px] mono-num text-ink-faint">
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
              className={`w-full p-2.5 border rounded text-xs text-ink focus:outline-none focus:border-accent ${
                isDirty && !isReasonValid ? 'border-ledger-red' : 'border-rule'
              }`}
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-rule">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-ink-muted hover:text-ink border border-rule rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isReasonValid || loading}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-accent rounded hover:opacity-90 disabled:opacity-40 flex items-center space-x-1"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              <span>{loading ? 'Executing...' : 'Confirm reversal'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
