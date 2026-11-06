'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Layers,
  ArrowRightLeft,
  ShieldCheck,
  BookOpen,
  Zap,
  Users,
  Search,
  Check,
  X,
  CreditCard,
} from 'lucide-react';
import { setAccessToken, setUser, getUser } from '@/lib/auth';

interface CommandItem {
  id: string;
  title: string;
  description: string;
  category: 'Navigation' | 'Actions' | 'Role Switch';
  icon: React.ReactNode;
  onSelect: () => void;
  badge?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerReconcile?: () => void;
}

export default function CommandPalette({ isOpen, onClose, onTriggerReconcile }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentUser = getUser();

  const handleQuickLogin = async (email: string, pass: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) {
        setAccessToken(data.accessToken);
        setUser(data.user);
        onClose();
        window.location.reload();
      }
    } catch (err) {
      console.error('Role switch failed:', err);
    }
  };

  const commands: CommandItem[] = [
    {
      id: 'stress-lab',
      title: 'Engine Stress & Concurrency Workbench',
      description: 'Run real-time concurrent SSI transactions and test ACID row-lock telemetry',
      category: 'Actions',
      badge: 'Admin Only',
      icon: <Zap className="h-4 w-4 text-amber-500" />,
      onSelect: () => {
        onClose();
        router.push('/admin/stress-lab');
      },
    },
    {
      id: 'verify-integrity',
      title: 'Verify System Double-Entry & SHA-256 Chain',
      description: 'Run zero-sum balance proof and cryptographic hash chain verification',
      category: 'Actions',
      icon: <ShieldCheck className="h-4 w-4 text-emerald-500" />,
      onSelect: () => {
        onClose();
        if (onTriggerReconcile) {
          onTriggerReconcile();
        } else {
          router.push('/dashboard?action=reconcile');
        }
      },
    },
    {
      id: 'dashboard',
      title: 'Accounts Overview',
      description: 'Inspect held accounts, balances, and registered holders',
      category: 'Navigation',
      icon: <CreditCard className="h-4 w-4 text-sky-500" />,
      onSelect: () => {
        onClose();
        router.push('/dashboard');
      },
    },
    {
      id: 'audit-ledger',
      title: 'Immutable Audit Ledger',
      description: 'System-wide chronological ledger with compensating reversal actions',
      category: 'Navigation',
      badge: 'Admin / Auditor',
      icon: <BookOpen className="h-4 w-4 text-purple-500" />,
      onSelect: () => {
        onClose();
        router.push('/admin/audit');
      },
    },
    {
      id: 'transfer',
      title: 'Initiate Money Movement',
      description: 'Atomic double-entry transfer with idempotency protection',
      category: 'Navigation',
      icon: <ArrowRightLeft className="h-4 w-4 text-blue-500" />,
      onSelect: () => {
        onClose();
        router.push('/transfer');
      },
    },
    {
      id: 'role-admin',
      title: 'Switch to ADMIN Role',
      description: 'admin@ledgerline.dev (Full debit/credit authority & compensating reversals)',
      category: 'Role Switch',
      badge: currentUser?.role === 'ADMIN' ? 'Active' : undefined,
      icon: <Users className="h-4 w-4 text-purple-600" />,
      onSelect: () => handleQuickLogin('admin@ledgerline.dev', 'Admin1234!'),
    },
    {
      id: 'role-holder',
      title: 'Switch to HOLDER Role',
      description: 'holder@ledgerline.dev (Scoped only to held personal accounts)',
      category: 'Role Switch',
      badge: currentUser?.role === 'HOLDER' ? 'Active' : undefined,
      icon: <Users className="h-4 w-4 text-blue-600" />,
      onSelect: () => handleQuickLogin('holder@ledgerline.dev', 'Holder1234!'),
    },
    {
      id: 'role-auditor',
      title: 'Switch to AUDITOR Role',
      description: 'auditor@ledgerline.dev (Read-only observation across all ledger entries)',
      category: 'Role Switch',
      badge: currentUser?.role === 'AUDITOR' ? 'Active' : undefined,
      icon: <Users className="h-4 w-4 text-amber-600" />,
      onSelect: () => handleQuickLogin('auditor@ledgerline.dev', 'Audit1234!'),
    },
  ];

  const filtered = commands.filter(
    (c) =>
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      c.description.toLowerCase().includes(query.toLowerCase()) ||
      c.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open
          inputRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleNavKeys = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].onSelect();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 sm:px-6 bg-slate-900/40 backdrop-blur-md transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/60 overflow-hidden text-slate-900 transform transition-all duration-150 animate-in fade-in-0 zoom-in-95"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleNavKeys}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100">
          <Search className="h-5 w-5 text-slate-400 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command, search accounts, or switch roles..."
            className="w-full bg-transparent text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded-md">
            ESC
          </kbd>
        </div>

        {/* Command List */}
        <div className="max-h-[380px] overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              No matching commands or actions found.
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={cmd.id}
                  onClick={cmd.onSelect}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition-colors duration-100 ${
                    isSelected
                      ? 'bg-sky-50/80 text-sky-950 border border-sky-200/50'
                      : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        isSelected ? 'bg-white shadow-xs' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {cmd.icon}
                    </div>
                    <div className="truncate">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold tracking-tight">{cmd.title}</span>
                        {cmd.badge && (
                          <span
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${
                              cmd.badge === 'Active'
                                ? 'bg-emerald-100 text-emerald-800 font-semibold'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {cmd.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{cmd.description}</p>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono font-medium text-slate-400 ml-3 shrink-0">
                    {cmd.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Command Palette Footer */}
        <div className="px-4 py-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center space-x-3">
            <span>
              <kbd className="font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-2xs mr-1">↑</kbd>
              <kbd className="font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-2xs mr-1">↓</kbd>
              Navigate
            </span>
            <span>
              <kbd className="font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-2xs mr-1">↵</kbd>
              Execute
            </span>
          </div>
          <span className="font-mono text-slate-400">LedgerLine Core v2.4</span>
        </div>
      </div>
    </div>
  );
}
