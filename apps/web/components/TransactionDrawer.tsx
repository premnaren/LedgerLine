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
  AlertCircle,
  FileCode,
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
}

export default function TransactionDrawer({
  entry,
  onClose,
  onReverse,
  isAdmin,
}: TransactionDrawerProps) {
  const [copiedHash, setCopiedHash] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  if (!entry) return null;

  const email = entry.initiatedByEmail || entry.initiatedBy?.email || 'System / Auto';
  const isDebit = entry.isDebit ?? (entry.direction === 'DEBIT' || entry.type === 'TRANSFER_DEBIT');
  const amountStr = formatPaiseToRupees(entry.amountPence);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 1500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg glass-drawer h-full overflow-y-auto p-6 flex flex-col justify-between text-slate-900 transform transition-transform duration-200 animate-in slide-in-from-right"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-slate-200/60">
            <div>
              <div className="flex items-center space-x-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    entry.status === 'POSTED'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {entry.status}
                </span>
                <span className="text-xs font-mono text-slate-500">{entry.type}</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight-display text-slate-950 mt-1">
                Transaction Details
              </h2>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition pressable"
              title="Close (ESC)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Amount Hero Card */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                Amount Posted
              </span>
              <div className="text-3xl font-extrabold tracking-tight-display tabular-nums mt-0.5 text-slate-950">
                {amountStr}
              </div>
              <span className="text-xs font-mono text-slate-500 mt-1 block">
                {entry.amountPence} paise (raw integer)
              </span>
            </div>

            <div
              className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${
                isDebit ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
              }`}
            >
              {isDebit ? <ArrowUpRight className="h-6 w-6" /> : <ArrowDownLeft className="h-6 w-6" />}
            </div>
          </div>

          {/* Classical T-Account Ledger View */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-1.5">
                <ArrowRightLeft className="h-3.5 w-3.5 text-slate-500" />
                <span>Double-Entry Flow (T-Account)</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">Atomic Zero-Sum</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Debit Side */}
              <div className="p-3 bg-white rounded-xl border border-slate-200/60 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block">
                  Debit Account (Source)
                </span>
                <span className="text-xs font-bold text-slate-900 mt-0.5 block truncate">
                  {entry.debitAccountName || (entry.debitAccountId ? `Acc: ${entry.debitAccountId.slice(0, 10)}...` : 'External / System')}
                </span>
                <span className="text-[11px] font-mono text-red-600 mt-1 block tabular-nums font-semibold">
                  -{amountStr}
                </span>
              </div>

              {/* Credit Side */}
              <div className="p-3 bg-white rounded-xl border border-slate-200/60 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">
                  Credit Account (Dest)
                </span>
                <span className="text-xs font-bold text-slate-900 mt-0.5 block truncate">
                  {entry.creditAccountName || (entry.creditAccountId ? `Acc: ${entry.creditAccountId.slice(0, 10)}...` : 'External / System')}
                </span>
                <span className="text-[11px] font-mono text-emerald-600 mt-1 block tabular-nums font-semibold">
                  +{amountStr}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/40 flex items-center justify-between text-xs text-slate-600">
              <span className="font-medium">Post-entry Running Balance:</span>
              <span className="font-bold tabular-nums font-mono text-slate-900">
                {formatPaiseToRupees(entry.runningBalance)}
              </span>
            </div>
          </div>

          {/* Cryptographic SHA-256 Hash Chain Seal */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Cryptographic Proof of Custody</span>
              </span>
              <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>SHA-256 Sealed</span>
              </span>
            </div>

            <div className="space-y-2">
              <div>
                <span className="text-[11px] font-medium text-slate-500 block">Entry Hash (Block Seal)</span>
                <div className="flex items-center justify-between mt-0.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/50">
                  <span className="text-[11px] font-mono text-slate-700 truncate mr-2">
                    {entry.hash || 'Genesis Block / Pre-migration entry'}
                  </span>
                  {entry.hash && (
                    <button
                      onClick={() => copyToClipboard(entry.hash!)}
                      className="text-slate-400 hover:text-slate-700 transition pressable shrink-0"
                      title="Copy SHA-256 Hash"
                    >
                      {copiedHash ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-medium text-slate-500 block">Parent Block Hash (prevHash)</span>
                <div className="mt-0.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/50">
                  <span className="text-[11px] font-mono text-slate-500 truncate block">
                    {entry.prevHash || '0000000000000000000000000000000000000000000000000000000000000000'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Audit Telemetry & Context */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-2.5 text-xs text-slate-600">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
              Audit Metadata
            </span>

            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="flex items-center space-x-1.5 text-slate-500">
                <Hash className="h-3.5 w-3.5" />
                <span>Entry UUID:</span>
              </span>
              <span className="font-mono text-slate-800">{entry.id}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="flex items-center space-x-1.5 text-slate-500">
                <Clock className="h-3.5 w-3.5" />
                <span>Recorded Timestamp:</span>
              </span>
              <span className="font-mono text-slate-800">{new Date(entry.createdAt).toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="flex items-center space-x-1.5 text-slate-500">
                <User className="h-3.5 w-3.5" />
                <span>Initiated By:</span>
              </span>
              <span className="font-medium text-slate-800">{email}</span>
            </div>

            {entry.note && (
              <div className="pt-1">
                <span className="text-slate-500 block">Note Reference:</span>
                <p className="mt-0.5 text-slate-800 bg-slate-50 p-2 rounded-lg font-mono text-[11px]">
                  {entry.note}
                </p>
              </div>
            )}
          </div>

          {/* Raw JSON toggle */}
          <div>
            <button
              onClick={() => setShowRawJson(!showRawJson)}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center space-x-1 pressable"
            >
              <FileCode className="h-3.5 w-3.5" />
              <span>{showRawJson ? 'Hide Raw JSON' : 'Inspect Raw JSON Payload'}</span>
            </button>
            {showRawJson && (
              <pre className="mt-2 p-3 bg-slate-950 text-slate-200 rounded-xl text-[10px] font-mono overflow-x-auto max-h-40">
                {JSON.stringify(entry, null, 2)}
              </pre>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-6 border-t border-slate-200/60 flex items-center space-x-3">
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
            className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold tracking-tight transition pressable"
          >
            Done Inspecting
          </button>
        </div>
      </div>
    </div>
  );
}
