'use client';

import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  ArrowRightLeft,
  ArrowDownLeft,
  ArrowUpRight,
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

  if (!entry) return null;

  const email = entry.initiatedByEmail || entry.initiatedBy?.email || 'System / Automated Engine';
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Transaction Details"
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-[520px] h-dvh bg-white flex flex-col border-l border-slate-200 shadow-2xl text-slate-900 transform transition-transform duration-200 animate-in slide-in-from-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pinned Header */}
        <div className="shrink-0 p-6 border-b border-slate-100 flex items-start justify-between bg-white">
          <div>
            <div className="flex items-center space-x-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                  entry.status === 'POSTED'
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : 'bg-red-100 text-red-900 border-red-300'
                }`}
              >
                {entry.status}
              </span>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {entry.type} · {formattedDate}
              </span>
            </div>

            <h2 className="text-xl font-bold tracking-tight-display text-slate-950 mt-1">
              Transaction Details
            </h2>

            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className="text-xs font-mono text-slate-500">
                ID: entry_{entry.id.slice(0, 10)}...
              </span>
              <button
                type="button"
                onClick={() => handleCopy(entry.id, setCopiedId)}
                className="text-slate-400 hover:text-slate-700 transition"
                title="Copy full entry UUID"
              >
                {copiedId ? (
                  <Check className="h-3 w-3 text-emerald-600" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            {/* Previous / Next Stepper Controls */}
            {(onNavigatePrevious || onNavigateNext) && (
              <div className="flex items-center space-x-1 mr-2 border border-slate-200 rounded-lg p-0.5 bg-slate-50">
                <button
                  type="button"
                  onClick={onNavigatePrevious}
                  disabled={!hasPrevious}
                  className="p-1 rounded text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  title="Previous transaction (↑)"
                  aria-label="Previous transaction"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={onNavigateNext}
                  disabled={!hasNext}
                  className="p-1 rounded text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  title="Next transaction (↓)"
                  aria-label="Next transaction"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition pressable"
              title="Close (ESC)"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="min-h-0 flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Amount & Account Impact Hero Card */}
          <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Account Impact
                </span>
                <div
                  className={`text-3xl font-black tracking-tight-display tabular-nums mt-0.5 ${
                    isDebit ? 'text-red-600' : 'text-emerald-700'
                  }`}
                >
                  {isDebit ? `−${amountStr}` : `+${amountStr}`}
                </div>
                <span className="text-xs text-slate-500 mt-0.5 block font-medium">
                  {isDebit ? 'Subtracted from account balance' : 'Added to account balance'}
                </span>
              </div>

              <div
                className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                  isDebit
                    ? 'bg-amber-500/10 text-amber-600 border-amber-200'
                    : 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
                }`}
              >
                {isDebit ? (
                  <ArrowUpRight className="h-6 w-6 text-amber-600" />
                ) : (
                  <ArrowDownLeft className="h-6 w-6 text-emerald-600" />
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200/60 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block font-medium">Transfer Amount:</span>
                <span className="font-bold text-slate-900 font-mono">{amountStr}</span>
                <span className="text-[11px] text-slate-400 block font-mono">
                  {entry.amountPence} paise
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Entry Status:</span>
                <span
                  className={`font-semibold ${
                    entry.status === 'POSTED' ? 'text-emerald-700' : 'text-red-600'
                  }`}
                >
                  {entry.status === 'POSTED' ? 'Successfully posted' : 'Refused / Overdraft'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Classical T-Account Double-Entry Breakdown */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 space-y-3.5 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                <ArrowRightLeft className="h-4 w-4 text-slate-500" />
                <span>Double-Entry Flow (T-Account)</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
                Atomic Zero-Sum
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Debit Side */}
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/70">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                  Debit · Source
                </span>
                <span className="text-xs font-bold text-slate-900 mt-1 block truncate">
                  {entry.debitAccountName ||
                    (entry.debitAccountId
                      ? `Acc: ${entry.debitAccountId.slice(0, 10)}...`
                      : 'External / Source')}
                </span>
                <span className="text-xs font-mono font-bold text-red-600 mt-1 block tabular-nums">
                  −{amountStr}
                </span>
              </div>

              {/* Credit Side */}
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/70">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                  Credit · Destination
                </span>
                <span className="text-xs font-bold text-slate-900 mt-1 block truncate">
                  {entry.creditAccountName ||
                    (entry.creditAccountId
                      ? `Acc: ${entry.creditAccountId.slice(0, 10)}...`
                      : 'External / Destination')}
                </span>
                <span className="text-xs font-mono font-bold text-emerald-700 mt-1 block tabular-nums">
                  +{amountStr}
                </span>
              </div>
            </div>

            <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span className="font-medium">Post-entry Running Balance:</span>
              <span className="font-bold tabular-nums font-mono text-slate-950">
                {formatPaiseToRupees(entry.runningBalance)}
              </span>
            </div>
          </div>

          {/* Section 3: Cryptographic SHA-256 Chain Verification */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 space-y-3.5 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Cryptographic Proof of Custody</span>
              </span>
              <span className="inline-flex items-center space-x-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>SHA-256 Sealed</span>
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block">
                  Entry Hash (Block Seal)
                </span>
                <div className="flex items-center justify-between mt-1 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/70">
                  <span
                    className="text-xs font-mono text-slate-800 truncate mr-2 font-medium"
                    title={entry.hash || 'Genesis Block'}
                  >
                    {entry.hash || 'Genesis Block / Pre-migration entry'}
                  </span>
                  {entry.hash && (
                    <button
                      type="button"
                      onClick={() => handleCopy(entry.hash!, setCopiedHash)}
                      className="text-slate-400 hover:text-slate-700 transition pressable shrink-0"
                      title="Copy full SHA-256 hash"
                    >
                      {copiedHash ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-500 block">
                  Parent Block Hash (prevHash)
                </span>
                <div className="flex items-center justify-between mt-1 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/70">
                  <span
                    className="text-xs font-mono text-slate-600 truncate mr-2"
                    title={entry.prevHash || '0'.repeat(64)}
                  >
                    {entry.prevHash || '0000000000000000000000000000000000000000000000000000000000000000'}
                  </span>
                  {entry.prevHash && (
                    <button
                      type="button"
                      onClick={() => handleCopy(entry.prevHash!, setCopiedPrevHash)}
                      className="text-slate-400 hover:text-slate-700 transition pressable shrink-0"
                      title="Copy parent hash"
                    >
                      {copiedPrevHash ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Audit Metadata */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 space-y-3 text-xs shadow-2xs">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block pb-2 border-b border-slate-100">
              Audit Metadata
            </span>

            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="flex items-center space-x-1.5 text-slate-500 font-medium">
                <User className="h-3.5 w-3.5" />
                <span>Initiated By:</span>
              </span>
              <span className="font-semibold text-slate-900">{email}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="flex items-center space-x-1.5 text-slate-500 font-medium">
                <Hash className="h-3.5 w-3.5" />
                <span>Transaction ID:</span>
              </span>
              <span className="font-mono text-slate-900 font-medium">{entry.id}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="flex items-center space-x-1.5 text-slate-500 font-medium">
                <Clock className="h-3.5 w-3.5" />
                <span>Timestamp:</span>
              </span>
              <span className="font-mono text-slate-900">
                {new Date(entry.createdAt).toLocaleTimeString()} · {formattedDate}
              </span>
            </div>

            {entry.note && (
              <div className="pt-1">
                <span className="text-slate-500 font-medium block">Note / Reason:</span>
                <p className="mt-1 text-slate-800 bg-slate-50 p-2.5 rounded-xl font-mono text-xs border border-slate-200/60">
                  {entry.note}
                </p>
              </div>
            )}
          </div>

          {/* Section 5: Structured In-Drawer Raw JSON Viewer */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowRawJson(!showRawJson)}
                className="text-xs font-semibold text-slate-700 hover:text-slate-950 flex items-center space-x-1.5 pressable"
              >
                <FileCode className="h-4 w-4 text-slate-500" />
                <span>{showRawJson ? 'Hide Raw JSON Payload' : 'Inspect Raw JSON Payload'}</span>
              </button>

              {showRawJson && (
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(JSON.stringify(entry, null, 2), setCopiedJson)}
                    className="text-xs text-sky-600 hover:text-sky-700 font-semibold inline-flex items-center transition"
                  >
                    {copiedJson ? (
                      <>
                        <Check className="h-3 w-3 mr-1 text-emerald-600" />
                        <span className="text-emerald-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 mr-1" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadJson}
                    className="text-xs text-slate-600 hover:text-slate-900 font-semibold inline-flex items-center transition"
                    title="Download entry JSON"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    <span>Download</span>
                  </button>
                </div>
              )}
            </div>

            {showRawJson && (
              <pre className="mt-3 p-3.5 bg-slate-950 text-slate-200 rounded-xl text-[11px] font-mono overflow-x-auto max-h-52 border border-slate-800">
                {JSON.stringify(entry, null, 2)}
              </pre>
            )}
          </div>
        </div>

        {/* Pinned Footer Actions */}
        <div className="shrink-0 p-6 border-t border-slate-100 bg-white flex items-center space-x-3">
          {isAdmin && entry.status === 'POSTED' && entry.type !== 'ADJUSTMENT' && onReverse && (
            <button
              onClick={() => {
                onClose();
                onReverse(entry);
              }}
              className="flex-1 inline-flex justify-center items-center py-2.5 px-4 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-semibold tracking-tight transition pressable"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reverse Transaction
            </button>
          )}

          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold tracking-tight transition pressable shadow-2xs"
          >
            Done Inspecting
          </button>
        </div>
      </div>
    </div>
  );
}
