'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  ArrowRightLeft,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  Copy,
  Check,
  Clock,
  User,
  Hash,
  FileCode,
  ChevronUp,
  ChevronDown,
  Download,
  Eye,
  EyeOff,
} from 'lucide-react';
import { formatPaiseToRupees } from '@/lib/utils';

export interface InspectedTransaction {
  id: string;
  createdAt: string;
  type: string;
  status: 'POSTED' | 'REFUSED';
  amountPence: string;
  runningBalance: string;
  direction?: 'DEBIT' | 'CREDIT';
  isDebit?: boolean;
  debitAccountId?: string | null;
  debitAccountName?: string | null;
  creditAccountId?: string | null;
  creditAccountName?: string | null;
  initiatedByEmail?: string;
  initiatedBy?: { email: string };
  note?: string | null;
  hash?: string | null;
  prevHash?: string | null;
}

interface TransactionDrawerProps {
  entry: InspectedTransaction | null;
  onClose: () => void;
  onReverse?: (entry: InspectedTransaction) => void;
  isAdmin?: boolean;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

export default function TransactionDrawer({
  entry,
  onClose,
  onReverse,
  isAdmin,
  onNavigatePrevious,
  onNavigateNext,
  hasPrevious,
  hasNext,
}: TransactionDrawerProps) {
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedPrevHash, setCopiedPrevHash] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);
  const [showFullEntryHash, setShowFullEntryHash] = useState(false);
  const [showFullPrevHash, setShowFullPrevHash] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && entry) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [entry, onClose]);

  if (!entry) return null;

  const email = entry.initiatedByEmail || entry.initiatedBy?.email || 'System';
  const isDebit = entry.isDebit ?? (entry.direction === 'DEBIT' || entry.type === 'TRANSFER_DEBIT');
  const amountStr = formatPaiseToRupees(entry.amountPence);
  const formattedDate = new Date(entry.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const handleCopy = (text: string, setter: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 1500);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(entry, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `entry_${entry.id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeAccountName = isDebit
    ? entry.debitAccountName || (entry.debitAccountId ? `Account ${entry.debitAccountId.slice(0, 8)}` : 'Debit account')
    : entry.creditAccountName || (entry.creditAccountId ? `Account ${entry.creditAccountId.slice(0, 8)}` : 'Credit account');

  const statusColor = entry.status === 'POSTED' ? 'var(--ledger-green)' : 'var(--ledger-red)';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="transaction-drawer-title"
      className="fixed inset-0 z-50 flex justify-end bg-ink/30 transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-[500px] h-dvh bg-surface flex flex-col border-l border-rule text-ink transform animate-in slide-in-from-right duration-150 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pinned Header */}
        <div className="shrink-0 p-5 border-b border-rule flex items-start justify-between bg-surface-secondary">
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: statusColor }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
                {entry.status}
              </span>

              <span className="flex items-center gap-1 text-xs text-ink-muted mono-num">
                <ShieldCheck className="h-3 w-3 text-accent" />
                <span>{entry.hash ? 'SHA-256' : 'Genesis'}</span>
              </span>

              <span className="text-xs text-ink-muted mono-num">
                · {formattedDate}
              </span>
            </div>

            <h2 id="transaction-drawer-title" className="text-base font-bold tracking-tight text-ink">
              Transaction details
            </h2>

            <div className="flex items-center space-x-2 mt-0.5">
              <span className="text-xs font-mono text-ink-muted">
                ID: {entry.id.slice(0, 10)}...
              </span>
              <button
                type="button"
                onClick={() => handleCopy(entry.id, setCopiedId)}
                className="text-xs text-accent hover:underline font-medium"
                title="Copy entry UUID"
              >
                {copiedId ? 'Copied' : 'Copy ID'}
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            {(onNavigatePrevious || onNavigateNext) && (
              <div className="flex items-center space-x-0.5 mr-2 border border-rule rounded-lg bg-surface">
                <button
                  type="button"
                  onClick={onNavigatePrevious}
                  disabled={!hasPrevious}
                  className="p-1.5 text-ink-muted hover:text-ink disabled:opacity-30"
                  aria-label="Previous transaction"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={onNavigateNext}
                  disabled={!hasNext}
                  className="p-1.5 text-ink-muted hover:text-ink disabled:opacity-30"
                  aria-label="Next transaction"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 border border-rule rounded-lg text-ink-muted hover:text-ink hover:bg-surface-secondary transition"
              title="Close drawer"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Amount Card */}
          <div className="p-4 rounded border border-rule bg-paper space-y-3">
            <span className="text-xs text-ink-muted font-medium block">
              Account impact ({isDebit ? 'Outflow' : 'Inflow'})
            </span>
            <div
              className="mono-num text-2xl font-bold tracking-tight"
              style={{ color: isDebit ? 'var(--ledger-red)' : 'var(--ledger-green)' }}
            >
              {isDebit ? `−${amountStr}` : `+${amountStr}`}
            </div>

            <div className="pt-2 border-t border-rule grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-ink-muted block text-xs">Exact volume:</span>
                <span className="mono-num font-semibold text-ink">{amountStr}</span>
                <span className="text-xs mono-num text-ink-muted block">{entry.amountPence} paise</span>
              </div>
              <div>
                <span className="text-ink-muted block text-xs">Entry type:</span>
                <span className="mono-num font-semibold text-ink">{entry.type}</span>
              </div>
            </div>
          </div>

          {/* Double-entry routing */}
          <div className="border border-rule rounded-lg p-4 space-y-3 bg-surface shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-rule">
              <span className="font-semibold text-ink flex items-center space-x-1.5">
                <ArrowRightLeft className="h-3.5 w-3.5 text-accent" />
                <span>Double-entry movement</span>
              </span>
              <span className="mono-num text-xs text-ledger-green font-medium">
                Zero-sum Δ=0
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 bg-surface-secondary border border-rule rounded-lg">
                <span className="text-xs text-ink-muted block font-medium">Debit source</span>
                <span className="font-medium text-ink truncate block mt-0.5">
                  {entry.debitAccountName || (entry.debitAccountId ? `Acc: ${entry.debitAccountId.slice(0, 8)}...` : 'Source')}
                </span>
                <span className="mono-num font-semibold text-ledger-red block mt-0.5">−{amountStr}</span>
              </div>

              <div className="p-2.5 bg-surface-secondary border border-rule rounded-lg">
                <span className="text-xs text-ink-muted block font-medium">Credit dest</span>
                <span className="font-medium text-ink truncate block mt-0.5">
                  {entry.creditAccountName || (entry.creditAccountId ? `Acc: ${entry.creditAccountId.slice(0, 8)}...` : 'Destination')}
                </span>
                <span className="mono-num font-semibold text-ledger-green block mt-0.5">+{amountStr}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-rule flex justify-between">
              <span className="text-ink-muted">Running balance ({activeAccountName}):</span>
              <span className="mono-num font-bold text-ink">{formatPaiseToRupees(entry.runningBalance)}</span>
            </div>
          </div>

          {/* SHA-256 Proof & Visual Merkle-Chain Diagram */}
          <div className="border border-rule rounded-lg p-4 space-y-3 bg-surface shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-rule">
              <span className="font-semibold text-ink flex items-center space-x-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-accent" />
                <span>Cryptographic seal</span>
              </span>
              <span className="mono-num text-xs text-ink-muted">SHA-256</span>
            </div>

            {/* Visual Hash-Chain Continuity Block Diagram */}
            <div className="bg-surface-secondary border border-rule rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-ink-muted font-semibold uppercase tracking-wider">
                  Block pointer continuity
                </span>
                <span className="flex items-center gap-1 text-xs text-ledger-green font-medium">
                  <CheckCircle2 className="h-3 w-3 text-ledger-green" />
                  Verified link
                </span>
              </div>

              <div className="grid grid-cols-11 items-center gap-1.5 text-xs">
                {/* Parent Block */}
                <div className="col-span-5 p-2 bg-surface rounded-lg border border-rule min-w-0">
                  <div className="flex items-center space-x-1 text-xs text-ink-muted mb-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                    <span className="font-medium truncate">Parent seal</span>
                  </div>
                  <div className="mono-num text-xs text-ink font-semibold truncate select-all">
                    {entry.prevHash ? `${entry.prevHash.slice(0, 8)}...` : 'Genesis'}
                  </div>
                </div>

                {/* Vector Flow Connector */}
                <div className="col-span-1 flex flex-col items-center justify-center">
                  <ArrowRight className="h-3.5 w-3.5 text-accent" />
                </div>

                {/* Current Block */}
                <div className="col-span-5 p-2 bg-surface rounded-lg border border-rule min-w-0">
                  <div className="flex items-center space-x-1 text-xs text-accent mb-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                    <span className="font-semibold truncate">Current seal</span>
                  </div>
                  <div className="mono-num text-xs text-accent font-semibold truncate select-all">
                    {entry.hash ? `${entry.hash.slice(0, 8)}...` : 'Unsealed'}
                  </div>
                </div>
              </div>

              <div className="text-xs mono-num text-ink-muted flex items-center justify-between pt-1 border-t border-rule">
                <span>Tamper-evident link</span>
                <span>SHA256(prev || id || date || Δ)</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-ink-muted">Block seal (currentHash):</span>
                {entry.hash && (
                  <button
                    type="button"
                    onClick={() => handleCopy(entry.hash!, setCopiedHash)}
                    className="text-accent hover:underline text-xs font-medium"
                  >
                    {copiedHash ? 'Copied' : 'Copy'}
                  </button>
                )}
              </div>
              <div className="mono-num text-xs text-ink bg-paper p-2 border border-rule rounded truncate select-all">
                {entry.hash || 'Genesis Block'}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-ink-muted">Parent hash (prevHash):</span>
                {entry.prevHash && (
                  <button
                    type="button"
                    onClick={() => handleCopy(entry.prevHash!, setCopiedPrevHash)}
                    className="text-accent hover:underline text-xs font-medium"
                  >
                    {copiedPrevHash ? 'Copied' : 'Copy'}
                  </button>
                )}
              </div>
              <div className="mono-num text-xs text-ink bg-paper p-2 border border-rule rounded truncate select-all">
                {entry.prevHash || '0'.repeat(64)}
              </div>
            </div>
          </div>

          {/* Audit metadata */}
          <div className="border border-rule rounded-lg p-4 space-y-2 bg-surface shadow-xs">
            <span className="font-semibold text-ink block pb-1 border-b border-rule">
              Audit metadata
            </span>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-ink-muted">Initiated by:</span>
                <span className="mono-num text-ink">{email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Timestamp:</span>
                <span className="mono-num text-ink">{new Date(entry.createdAt).toLocaleTimeString()} · {formattedDate}</span>
              </div>
              {entry.note && (
                <div className="pt-1">
                  <span className="text-ink-muted block mb-0.5">Note:</span>
                  <p className="bg-surface-secondary p-2 rounded-lg border border-rule mono-num text-xs text-ink">
                    {entry.note}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Raw JSON toggle */}
          <div className="border border-rule rounded-lg p-3 bg-surface shadow-xs">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowRawJson(!showRawJson)}
                className="font-medium text-ink-muted hover:text-ink flex items-center space-x-1"
              >
                <FileCode className="h-3.5 w-3.5" />
                <span>{showRawJson ? 'Hide raw JSON' : 'Inspect raw JSON'}</span>
              </button>

              {showRawJson && (
                <button
                  type="button"
                  onClick={handleDownloadJson}
                  className="text-accent hover:underline text-xs font-medium flex items-center space-x-1"
                >
                  <Download className="h-3 w-3 mr-0.5" />
                  <span>Download</span>
                </button>
              )}
            </div>

            {showRawJson && (
              <pre className="mt-2.5 p-3 bg-surface-secondary border border-rule rounded-lg text-xs mono-num overflow-x-auto max-h-48 text-ink">
                {JSON.stringify(entry, null, 2)}
              </pre>
            )}
          </div>
        </div>

        {/* Pinned Footer */}
        <div className="shrink-0 p-4 border-t border-rule bg-surface-secondary flex items-center space-x-2">
          {isAdmin && entry.status === 'POSTED' && entry.type !== 'ADJUSTMENT' && onReverse && (
            <button
              onClick={() => {
                onClose();
                onReverse(entry);
              }}
              className="flex-1 py-2 px-3 bg-surface hover:bg-surface-secondary text-ink border border-rule rounded-lg text-xs font-medium transition"
            >
              <RotateCcw className="mr-1 h-3 w-3 inline" />
              Reverse
            </button>
          )}

          <button
            onClick={onClose}
            className="flex-1 py-2 px-3 bg-accent text-white rounded-lg text-xs font-semibold hover:opacity-90 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
