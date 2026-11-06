'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRightLeft,
  ShieldCheck,
  BookOpen,
  Zap,
  Users,
  Search,
  CreditCard,
  Lock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { setAccessToken, setUser, getUser } from '@/lib/auth';
import { api } from '@/lib/api';

interface CommandItem {
  id: string;
  title: string;
  description: string;
  category: 'OPERATIONS' | 'NAVIGATION' | 'ADMINISTRATION';
  badge?: string;
  badgeType?: 'admin' | 'action' | 'navigation' | 'active';
  keywords: string[];
  icon: React.ReactNode;
  iconBg: string;
  onSelect: () => void;
  requiredRole?: 'ADMIN' | 'AUDITOR';
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerReconcile?: () => void;
}

export default function CommandPalette({
  isOpen,
  onClose,
  onTriggerReconcile,
}: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [switchingRole, setSwitchingRole] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const currentUser = getUser();

  const handleQuickLogin = async (roleName: string, email: string, pass: string) => {
    try {
      setSwitchingRole(roleName);
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
        setTimeout(() => {
          onClose();
          window.location.reload();
        }, 400);
      }
    } catch (err) {
      console.error('Role switch failed:', err);
      setSwitchingRole(null);
    }
  };

  const handleNavigateTransfer = async () => {
    onClose();
    try {
      const accounts = await api.get<Array<{ id: string }>>('/accounts');
      if (accounts && accounts.length > 0) {
        router.push(`/accounts/${accounts[0].id}/transfer`);
      } else {
        router.push('/dashboard');
      }
    } catch {
      router.push('/dashboard');
    }
  };

  const commands: CommandItem[] = useMemo(
    () => [
      // OPERATIONS
      {
        id: 'stress-lab',
        title: 'Engine Stress & Concurrency Workbench',
        description: 'Configure concurrent transactions and test ACID isolation under parallel load',
        category: 'OPERATIONS',
        badge: 'Admin Only',
        badgeType: 'admin',
        keywords: ['stress', 'concurrency', 'acid', 'bench', 'load', 'telemetry', 'parallel', 'serializable'],
        icon: <Zap className="h-4 w-4 text-amber-600 fill-amber-500" />,
        iconBg: 'bg-amber-500/10 border-amber-200/80',
        requiredRole: 'ADMIN',
        onSelect: () => {
          onClose();
          router.push('/admin/stress-lab');
        },
      },
      {
        id: 'verify-integrity',
        title: 'Verify System Double-Entry & SHA-256 Chain',
        description: 'Run balance conservation proof and Genesis-to-Head cryptographic chain audit',
        category: 'OPERATIONS',
        badge: 'Action',
        badgeType: 'action',
        keywords: ['verify', 'reconcile', 'audit', 'integrity', 'sha256', 'hash', 'chain', 'conservation'],
        icon: <ShieldCheck className="h-4 w-4 text-emerald-600" />,
        iconBg: 'bg-emerald-500/10 border-emerald-200/80',
        onSelect: () => {
          onClose();
          if (onTriggerReconcile) {
            onTriggerReconcile();
          } else {
            router.push('/dashboard');
          }
        },
      },

      // NAVIGATION
      {
        id: 'dashboard',
        title: 'Accounts Overview',
        description: 'Inspect held accounts, balances, and registered holders',
        category: 'NAVIGATION',
        badge: 'Navigation',
        badgeType: 'navigation',
        keywords: ['accounts', 'overview', 'dashboard', 'balance', 'home', 'cards', 'holders'],
        icon: <CreditCard className="h-4 w-4 text-sky-600" />,
        iconBg: 'bg-sky-500/10 border-sky-200/60',
        onSelect: () => {
          onClose();
          router.push('/dashboard');
        },
      },
      {
        id: 'audit-ledger',
        title: 'Immutable Audit Ledger',
        description: 'Inspect chronological ledger entries and reversal events',
        category: 'NAVIGATION',
        badge: 'Admin / Auditor',
        badgeType: 'admin',
        keywords: ['ledger', 'audit', 'entries', 'reversal', 'history', 'statements', 'immutable'],
        icon: <BookOpen className="h-4 w-4 text-purple-600" />,
        iconBg: 'bg-purple-500/10 border-purple-200/60',
        requiredRole: 'ADMIN',
        onSelect: () => {
          onClose();
          router.push('/admin/audit');
        },
      },
      {
        id: 'transfer',
        title: 'Initiate Money Movement',
        description: 'Open transfer workflow with atomic double-entry conservation and optimistic locking',
        category: 'NAVIGATION',
        badge: 'Action',
        badgeType: 'action',
        keywords: ['transfer', 'send', 'money', 'payment', 'movement', 'credit', 'debit', 'pay'],
        icon: <ArrowRightLeft className="h-4 w-4 text-blue-600" />,
        iconBg: 'bg-blue-500/10 border-blue-200/60',
        onSelect: handleNavigateTransfer,
      },

      // ADMINISTRATION / ROLE SWITCHING
      {
        id: 'role-admin',
        title: 'Switch to ADMIN Role',
        description: 'admin@ledgerline.dev (Full debit/credit authority, stress workbench, & reversals)',
        category: 'ADMINISTRATION',
        badge: currentUser?.role === 'ADMIN' ? 'Active' : 'Superuser',
        badgeType: currentUser?.role === 'ADMIN' ? 'active' : 'admin',
        keywords: ['admin', 'role', 'superuser', 'switch', 'auth', 'permissions'],
        icon: <Users className="h-4 w-4 text-purple-600" />,
        iconBg: 'bg-purple-500/10 border-purple-200/60',
        onSelect: () => handleQuickLogin('ADMIN', 'admin@ledgerline.dev', 'Admin1234!'),
      },
      {
        id: 'role-holder',
        title: 'Switch to HOLDER Role',
        description: 'holder@ledgerline.dev (Scoped strictly to personal accounts)',
        category: 'ADMINISTRATION',
        badge: currentUser?.role === 'HOLDER' ? 'Active' : 'Account Owner',
        badgeType: currentUser?.role === 'HOLDER' ? 'active' : 'navigation',
        keywords: ['holder', 'role', 'owner', 'client', 'switch', 'personal'],
        icon: <Users className="h-4 w-4 text-sky-600" />,
        iconBg: 'bg-sky-500/10 border-sky-200/60',
        onSelect: () => handleQuickLogin('HOLDER', 'holder@ledgerline.dev', 'Holder1234!'),
      },
      {
        id: 'role-auditor',
        title: 'Switch to AUDITOR Role',
        description: 'auditor@ledgerline.dev (Read-only observation across all ledger accounts)',
        category: 'ADMINISTRATION',
        badge: currentUser?.role === 'AUDITOR' ? 'Active' : 'Compliance',
        badgeType: currentUser?.role === 'AUDITOR' ? 'active' : 'action',
        keywords: ['auditor', 'role', 'compliance', 'read-only', 'switch', 'observe'],
        icon: <Users className="h-4 w-4 text-amber-600" />,
        iconBg: 'bg-amber-500/10 border-amber-200/60',
        onSelect: () => handleQuickLogin('AUDITOR', 'auditor@ledgerline.dev', 'Audit1234!'),
      },
    ],
    [currentUser, onTriggerReconcile, router]
  );

  // Substring & keyword matching
  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase().trim();
    return commands.filter((c) => {
      const titleMatch = c.title.toLowerCase().includes(q);
      const descMatch = c.description.toLowerCase().includes(q);
      const catMatch = c.category.toLowerCase().includes(q);
      const keywordMatch = c.keywords.some((k) => k.toLowerCase().includes(q));
      return titleMatch || descMatch || catMatch || keywordMatch;
    });
  }, [commands, query]);

  // Group filtered results by category
  const groupedResults = useMemo(() => {
    const groups: { [cat: string]: CommandItem[] } = {};
    for (const item of filtered) {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    }
    return groups;
  }, [filtered]);

  // Flat array of ids for index-based selection
  const flatFilteredIds = useMemo(() => filtered.map((c) => c.id), [filtered]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setSwitchingRole(null);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [isOpen]);

  // Reset index when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, onClose]);

  // Keyboard navigation within palette
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

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current || filtered.length === 0) return;
    const selectedElement = listRef.current.querySelector(
      `[data-cmd-id="${filtered[selectedIndex]?.id}"]`
    );
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, filtered]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 sm:px-6 bg-slate-900/40 backdrop-blur-md transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden text-slate-900 transform transition-all duration-150 animate-in fade-in-0 zoom-in-95"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleNavKeys}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100">
          <Search className="h-5 w-5 text-slate-500 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-autocomplete="list"
            aria-controls="command-palette-results"
            aria-activedescendant={
              filtered[selectedIndex]?.id ? `cmd-${filtered[selectedIndex].id}` : undefined
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands and accounts..."
            className="w-full bg-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-semibold text-slate-500 bg-slate-100 border border-slate-200 rounded-md">
            ESC
          </kbd>
        </div>

        {/* Role Switching Feedback Toast */}
        {switchingRole && (
          <div className="px-4 py-2 bg-sky-50 border-b border-sky-100 flex items-center space-x-2 text-xs font-semibold text-sky-800 animate-in fade-in">
            <Sparkles className="h-3.5 w-3.5 text-sky-600 animate-spin" />
            <span>Establishing role session as {switchingRole}...</span>
          </div>
        )}

        {/* Grouped Command Results List */}
        <div
          id="command-palette-results"
          ref={listRef}
          role="listbox"
          className="max-h-[380px] overflow-y-auto p-2 space-y-3"
        >
          {filtered.length === 0 ? (
            <div className="py-10 px-6 text-center">
              <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-slate-100 text-slate-400 mb-3">
                <Search className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-slate-900">No commands found</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Try searching for <span className="font-semibold text-sky-600">accounts</span>,{' '}
                <span className="font-semibold text-sky-600">audit</span>,{' '}
                <span className="font-semibold text-sky-600">stress</span>, or{' '}
                <span className="font-semibold text-sky-600">verification</span>.
              </p>
            </div>
          ) : (
            Object.entries(groupedResults).map(([category, items]) => (
              <div key={category} className="space-y-1">
                {/* Category Header */}
                <div className="px-3 pt-1.5 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {category}
                </div>

                {/* Category Items */}
                {items.map((cmd) => {
                  const globalIdx = flatFilteredIds.indexOf(cmd.id);
                  const isSelected = globalIdx === selectedIndex;

                  return (
                    <button
                      key={cmd.id}
                      id={`cmd-${cmd.id}`}
                      data-cmd-id={cmd.id}
                      role="option"
                      aria-selected={isSelected}
                      onClick={cmd.onSelect}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition-all duration-100 ${
                        isSelected
                          ? 'bg-sky-50/90 text-sky-950 border-l-4 border-l-sky-600 border-y border-r border-sky-200/80 shadow-2xs pl-2.5'
                          : 'hover:bg-slate-50 text-slate-800 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        {/* Icon Container with Consistent Sizing */}
                        <div
                          className={`h-8 w-8 rounded-xl border flex items-center justify-center shrink-0 transition ${
                            isSelected
                              ? 'bg-white shadow-2xs border-sky-200'
                              : `${cmd.iconBg}`
                          }`}
                        >
                          {cmd.icon}
                        </div>

                        {/* Text Block */}
                        <div className="truncate">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`text-sm font-semibold tracking-tight ${
                                isSelected ? 'text-sky-950' : 'text-slate-900'
                              }`}
                            >
                              {cmd.title}
                            </span>

                            {cmd.badge && (
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                                  cmd.badgeType === 'admin'
                                    ? 'bg-purple-100 text-purple-800 border border-purple-200/80'
                                    : cmd.badgeType === 'action'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200/80'
                                    : cmd.badgeType === 'active'
                                    ? 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-300'
                                    : 'bg-slate-100 text-slate-700 border border-slate-200/80'
                                }`}
                              >
                                {cmd.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 truncate mt-0.5 font-normal">
                            {cmd.description}
                          </p>
                        </div>
                      </div>

                      <span className="text-[11px] font-mono font-medium text-slate-400 ml-3 shrink-0">
                        {cmd.category}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Command Palette Footer */}
        <div className="px-4 py-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1">
              <kbd className="font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-2xs text-[10px] text-slate-600">
                ↑
              </kbd>
              <kbd className="font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-2xs text-[10px] text-slate-600">
                ↓
              </kbd>
              <span className="text-slate-600 font-medium">Navigate</span>
            </span>
            <span className="flex items-center space-x-1">
              <kbd className="font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-2xs text-[10px] text-slate-600">
                ↵
              </kbd>
              <span className="text-slate-600 font-medium">Execute</span>
            </span>
          </div>
          <span className="font-mono text-slate-400 text-[11px]">LedgerLine Core v2.4</span>
        </div>
      </div>
    </div>
  );
}
