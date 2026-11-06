'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getUser, logoutUser, subscribeAuth, UserSession } from '@/lib/auth';
import {
  Layers,
  BookOpen,
  Zap,
  Search,
  LogOut,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';
import CommandPalette from './CommandPalette';

export default function Navbar() {
  const [user, setUserState] = useState<UserSession | null>(null);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setUserState(getUser());
    const unsub = subscribeAuth(() => {
      setUserState(getUser());
    });
    return unsub;
  }, []);

  if (pathname === '/login') {
    return null;
  }

  const roleStyles: Record<string, { bg: string; text: string; dot: string }> = {
    ADMIN: {
      bg: 'bg-purple-50 border-purple-200/80 text-purple-700',
      text: 'text-purple-700',
      dot: 'bg-purple-500',
    },
    HOLDER: {
      bg: 'bg-sky-50 border-sky-200/80 text-sky-700',
      text: 'text-sky-700',
      dot: 'bg-sky-500',
    },
    AUDITOR: {
      bg: 'bg-amber-50 border-amber-200/80 text-amber-700',
      text: 'text-amber-700',
      dot: 'bg-amber-500',
    },
  };

  const currentRole = user?.role ? roleStyles[user.role] : roleStyles.HOLDER;

  return (
    <>
      <header className="glass-chrome sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Navigation Items */}
          <div className="flex items-center space-x-6">
            <Link
              href="/dashboard"
              className="flex items-center space-x-2.5 pressable focus:outline-hidden"
            >
              <div className="h-8 w-8 rounded-xl bg-slate-950 flex items-center justify-center text-white shadow-xs">
                <Layers className="h-4 w-4" />
              </div>
              <span className="font-bold text-lg tracking-tight-display text-slate-950">
                Ledger<span className="text-sky-600">Line</span>
              </span>
            </Link>

            {user && (
              <nav className="hidden md:flex items-center space-x-1.5">
                <Link
                  href="/dashboard"
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition pressable ${
                    pathname === '/dashboard'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/70'
                  }`}
                >
                  Accounts
                </Link>

                {(user.role === 'ADMIN' || user.role === 'AUDITOR') && (
                  <Link
                    href="/admin/audit"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-tight flex items-center space-x-1.5 transition pressable ${
                      pathname === '/admin/audit'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/70'
                    }`}
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>Audit Ledger</span>
                  </Link>
                )}

                {user.role === 'ADMIN' && (
                  <Link
                    href="/admin/stress-lab"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-tight flex items-center space-x-1.5 transition pressable ${
                      pathname === '/admin/stress-lab'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-amber-700 hover:bg-amber-50/80 border border-amber-200/60'
                    }`}
                  >
                    <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                    <span>Stress Lab</span>
                  </Link>
                )}
              </nav>
            )}
          </div>

          {/* Quick Search / Command Palette Pill & Profile */}
          <div className="flex items-center space-x-3">
            {/* Quick ⌘K Pill */}
            <button
              onClick={() => setIsCommandOpen(true)}
              className="hidden sm:inline-flex items-center space-x-2 px-3 py-1.5 bg-slate-100/80 hover:bg-slate-200/80 border border-slate-200/60 rounded-xl text-xs text-slate-500 transition pressable"
              title="Search commands, accounts, and actions"
            >
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <span className="font-medium text-slate-600">Quick Actions</span>
              <kbd className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-400 bg-white border border-slate-200 rounded shadow-2xs">
                ⌘K
              </kbd>
            </button>

            {user && (
              <div className="flex items-center space-x-3">
                {/* Role Pill */}
                <div
                  className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                    currentRole.bg
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${currentRole.dot} animate-pulse`} />
                  <span>{user.role}</span>
                </div>

                <span className="text-xs text-slate-500 font-mono hidden lg:inline">
                  {user.email}
                </span>

                <button
                  onClick={() => logoutUser()}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition pressable"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
      />
    </>
  );
}
