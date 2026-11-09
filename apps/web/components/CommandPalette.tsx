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
  Layers,
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
        keywords: ['stress', 'concurrency', 'acid', 'race', 'ssi', 'parallel', 'test', 'bench', 'lab'],
        icon: <Zap className="h-4 w-4 text-accent" />,
        iconBg: 'bg-paper text-accent border border-rule',
        requiredRole: 'ADMIN',
        onSelect: () => {
          onClose();
          router.push('/admin/stress-lab');
        },
      },
      {
        id: 'transfer-funds',
        title: 'Initiate Money Transfer',
        description: 'Post an atomic double-entry debit and credit transfer between ledger accounts',
        category: 'OPERATIONS',
        badge: 'Action',
        badgeType: 'action',
        keywords: ['transfer', 'send', 'money', 'deposit', 'withdraw', 'post', 'pay', 'transaction'],
        icon: <ArrowRightLeft className="h-4 w-4 text-accent" />,
        iconBg: 'bg-paper text-accent border border-rule',
        onSelect: handleNavigateTransfer,
      },
      {
        id: 'verify-integrity',
        title: 'Verify Cryptographic Seal & System Invariant',
        description: 'Compute Genesis-to-Head SHA-256 seal integrity and verify zero-sum ledger conservation',
        category: 'OPERATIONS',
        badge: 'Integrity',
        badgeType: 'action',
        keywords: ['verify', 'integrity', 'reconcile', 'audit', 'sha256', 'hash', 'cryptographic', 'proof', 'seal'],
        icon: <ShieldCheck className="h-4 w-4 text-ledger-green" />,
        iconBg: 'bg-paper text-ledger-green border border-rule',
        requiredRole: 'AUDITOR',
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
        id: 'nav-dashboard',
        title: 'Accounts Overview Dashboard',
        description: 'View registered accounts, current balances, and overdraft limits',
        category: 'NAVIGATION',
        keywords: ['accounts', 'dashboard', 'home', 'overview', 'balances', 'wallets'],
        icon: <CreditCard className="h-4 w-4 text-ink-muted" />,
        iconBg: 'bg-paper text-ink-muted border border-rule',
        onSelect: () => {
          onClose();
          router.push('/dashboard');
        },
      },
      {
        id: 'nav-audit',
        title: 'Global Compliance Audit Ledger',
        description: 'Inspect full append-only audit log with SHA-256 block hashes and REFUSED attempts',
        category: 'NAVIGATION',
        badge: 'Audit',
        badgeType: 'navigation',
        keywords: ['audit', 'compliance', 'log', 'ledger', 'refused', 'history', 'records', 'statements'],
        icon: <BookOpen className="h-4 w-4 text-ink-muted" />,
        iconBg: 'bg-paper text-ink-muted border border-rule',
        requiredRole: 'AUDITOR',
        onSelect: () => {
          onClose();
          router.push('/admin/audit');
        },
      },
      {
        id: 'prototype-viewer',
        title: 'Figma Prototype Reviewer & Spec Suite',
        description: 'Interactive canvas prototype with clickable hotspots, device chrome, and design tokens',
        category: 'NAVIGATION',
        badge: 'Design System',
        badgeType: 'navigation',
        keywords: ['figma', 'prototype', 'design', 'spec', 'tokens', 'review', 'hotspot'],
        icon: <Layers className="h-4 w-4 text-accent" />,
        iconBg: 'bg-paper text-accent border border-rule',
        onSelect: () => {
          onClose();
          router.push('/prototype');
        },
      },

      // ADMINISTRATION (ROLE SWITCHING)
      {
        id: 'role-admin',
        title: 'Switch Role to Administrator',
        description: 'Superuser session: full ledger control, account creation, stress bench, and adjustments',
        category: 'ADMINISTRATION',
        badge: currentUser?.role === 'ADMIN' ? 'Current' : 'Demo Switch',
        badgeType: currentUser?.role === 'ADMIN' ? 'active' : 'admin',
        keywords: ['admin', 'switch', 'role', 'demo', 'superuser', 'login', 'operator'],
        icon: <Lock className="h-4 w-4" style={{ color: 'var(--role-admin)' }} />,
        iconBg: 'bg-paper border border-rule',
        onSelect: () => handleQuickLogin('ADMIN', 'admin@ledgerline.dev', 'Admin1234!'),
      },
      {
        id: 'role-holder',
        title: 'Switch Role to Account Holder',
        description: 'Customer checking session: view personal statements, execute transfers and deposits',
        category: 'ADMINISTRATION',
        badge: currentUser?.role === 'HOLDER' ? 'Current' : 'Demo Switch',
        badgeType: currentUser?.role === 'HOLDER' ? 'active' : 'action',
        keywords: ['holder', 'customer', 'user', 'switch', 'role', 'demo', 'login', 'personal'],
        icon: <Users className="h-4 w-4" style={{ color: 'var(--role-holder)' }} />,
        iconBg: 'bg-paper border border-rule',
        onSelect: () => handleQuickLogin('HOLDER', 'holder@ledgerline.dev', 'Holder1234!'),
      },
      {
        id: 'role-auditor',
        title: 'Switch Role to Regulatory Auditor',
        description: 'Auditor session: read-only access across all accounts, full ledger verification proofs',
        category: 'ADMINISTRATION',
        badge: currentUser?.role === 'AUDITOR' ? 'Current' : 'Demo Switch',
        badgeType: currentUser?.role === 'AUDITOR' ? 'active' : 'navigation',
        keywords: ['auditor', 'regulator', 'compliance', 'switch', 'role', 'demo', 'read-only', 'inspect'],
        icon: <ShieldCheck className="h-4 w-4" style={{ color: 'var(--role-auditor)' }} />,
        iconBg: 'bg-paper border border-rule',
        onSelect: () => handleQuickLogin('AUDITOR', 'auditor@ledgerline.dev', 'Audit1234!'),
      },
    ],
    [currentUser, onClose, router, onTriggerReconcile]
  );

  // Filter commands based on search query
  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase().trim();
    return commands.filter((cmd) => {
      const matchTitle = cmd.title.toLowerCase().includes(q);
      const matchDesc = cmd.description.toLowerCase().includes(q);
      const matchKeywords = cmd.keywords.some((kw) => kw.toLowerCase().includes(q));
      return matchTitle || matchDesc || matchKeywords;
    });
  }, [commands, query]);

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

  const flatFilteredIds = useMemo(() => filtered.map((c) => c.id), [filtered]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setSwitchingRole(null);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [isOpen]);

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
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 sm:px-6 bg-ink/40 transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white rounded border border-rule overflow-hidden text-ink animate-in fade-in-0 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleNavKeys}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-rule bg-paper">
          <Search className="h-4 w-4 text-ink-faint shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-autocomplete="list"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands, accounts, and actions..."
            className="w-full bg-transparent text-xs font-medium text-ink placeholder:text-ink-faint focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] mono-num text-ink-faint bg-white border border-rule rounded">
            ESC
          </kbd>
        </div>

        {/* Role Switching Toast */}
        {switchingRole && (
          <div className="px-4 py-2 bg-paper border-b border-rule flex items-center space-x-2 text-xs font-medium text-ink">
            <Sparkles className="h-3.5 w-3.5 text-accent animate-spin" />
            <span>Establishing role session as {switchingRole}...</span>
          </div>
        )}

        {/* Results List */}
        <div
          id="command-palette-results"
          ref={listRef}
          role="listbox"
          className="max-h-[360px] overflow-y-auto p-2 space-y-2"
        >
          {filtered.length === 0 ? (
            <div className="py-8 px-6 text-center text-xs text-ink-muted">
              <p className="font-semibold text-ink">No commands found</p>
              <p className="mt-1">
                Try searching for accounts, audit, stress, or verification.
              </p>
            </div>
          ) : (
            Object.entries(groupedResults).map(([category, items]) => (
              <div key={category} className="space-y-1">
                <div className="px-2.5 pt-1 text-[10px] text-ink-muted font-medium">
                  {category}
                </div>

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
                      className={`w-full flex items-center justify-between px-3 py-2 rounded text-left transition ${
                        isSelected
                          ? 'bg-[#F3F2EE] text-ink font-medium'
                          : 'hover:bg-[#F3F2EE] text-ink'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="h-7 w-7 rounded border border-rule flex items-center justify-center shrink-0 bg-white">
                          {cmd.icon}
                        </div>

                        <div className="truncate">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-medium text-ink">
                              {cmd.title}
                            </span>

                            {cmd.badge && (
                              <span className="text-[10px] mono-num px-1.5 py-0.2 border border-rule rounded text-ink-muted">
                                {cmd.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-ink-muted truncate font-normal">
                            {cmd.description}
                          </p>
                        </div>
                      </div>

                      <span className="text-[10px] mono-num text-ink-faint ml-2 shrink-0">
                        {cmd.category}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-paper border-t border-rule flex items-center justify-between text-[11px] text-ink-faint mono-num">
          <span>Navigate with ↑ / ↓ · Enter to select</span>
          <span>LedgerLine</span>
        </div>
      </div>
    </div>
  );
}
