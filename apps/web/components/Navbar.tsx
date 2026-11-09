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
  Menu,
  X,
} from 'lucide-react';
import CommandPalette from './CommandPalette';
import ThemeToggle from './ThemeToggle';
import { getTheme, setTheme, subscribeTheme, Theme } from '@/lib/theme';

export default function Navbar() {
  const [user, setUserState] = useState<UserSession | null>(null);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setCurrentTheme] = useState<Theme>('light');
  const pathname = usePathname();

  useEffect(() => {
    setUserState(getUser());
    const unsub = subscribeAuth(() => {
      setUserState(getUser());
    });
    return unsub;
  }, []);

  useEffect(() => {
    setCurrentTheme(getTheme());
    const unsubTheme = subscribeTheme((newTheme) => {
      setCurrentTheme(newTheme);
    });
    return unsubTheme;
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  if (pathname === '/login') {
    return null;
  }

  const handleToggleTheme = (isDark: boolean) => {
    setTheme(isDark ? 'dark' : 'light');
  };

  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'var(--role-admin)';
      case 'AUDITOR':
        return 'var(--role-auditor)';
      case 'HOLDER':
      default:
        return 'var(--role-holder)';
    }
  };

  const roleColor = getRoleColor(user?.role);

  return (
    <>
      <header className="glass-chrome sticky top-0 z-40 border-b border-rule">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo & Navigation Items */}
          <div className="flex items-center space-x-6">
            <Link
              href="/dashboard"
              className="flex items-center space-x-2.5 pressable focus:outline-hidden"
            >
              <div className="h-8 w-8 rounded-lg border border-rule bg-surface text-primary flex items-center justify-center shadow-xs">
                <Layers className="h-4 w-4" />
              </div>
              <span className="font-bold text-lg tracking-tight text-ink">
                Ledger<span className="text-primary">Line</span>
              </span>
            </Link>

            {user && (
              <nav className="hidden md:flex items-center space-x-1.5">
                <Link
                  href="/dashboard"
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition pressable ${
                    pathname === '/dashboard'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-ink-muted hover:text-ink hover:bg-surface-secondary'
                  }`}
                >
                  Accounts
                </Link>

                {(user.role === 'ADMIN' || user.role === 'AUDITOR') && (
                  <Link
                    href="/admin/audit"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-tight flex items-center space-x-1.5 transition pressable ${
                      pathname === '/admin/audit'
                        ? 'bg-[#5275A5] dark:bg-[#8BA8D1] text-white dark:text-[#0B1220] shadow-xs'
                        : 'text-ink-muted hover:text-ink hover:bg-surface-secondary'
                    }`}
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>Audit ledger</span>
                  </Link>
                )}

                {user.role === 'ADMIN' && (
                  <Link
                    href="/admin/stress-lab"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-tight flex items-center space-x-1.5 transition pressable ${
                      pathname === '/admin/stress-lab'
                        ? 'bg-[#D99524] dark:bg-[#E9B45C] text-white dark:text-[#0B1220] shadow-xs'
                        : 'text-ink-muted hover:text-ink hover:bg-surface-secondary border border-rule'
                    }`}
                  >
                    <Zap className="h-3.5 w-3.5 text-accent" />
                    <span>Stress lab</span>
                  </Link>
                )}
              </nav>
            )}
          </div>

          {/* Quick Search & Profile */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Quick ⌘K Button */}
            <button
              onClick={() => setIsCommandOpen(true)}
              className="hidden sm:inline-flex items-center space-x-2 px-3 py-1.5 bg-surface hover:bg-surface-secondary border border-rule rounded-lg text-xs text-ink-muted transition pressable shadow-xs"
              title="Search commands, accounts, and actions"
            >
              <Search className="h-3.5 w-3.5 text-ink-faint" />
              <span className="font-medium text-ink-muted">Quick actions</span>
              <kbd className="inline-flex items-center px-1.5 py-0.5 text-[10px] mono-num text-ink-faint bg-paper border border-rule rounded">
                ⌘K
              </kbd>
            </button>

            {/* Theme Toggle Button */}
            <div className="flex items-center">
              <ThemeToggle
                isDark={theme === 'dark'}
                onToggle={handleToggleTheme}
              />
            </div>

            {user && (
              <div className="flex items-center space-x-2 sm:space-x-3">
                {/* Role Dot + Sentence Case Pattern */}
                <span className="flex items-center gap-1.5 text-xs text-ink-muted font-medium bg-surface-secondary px-2.5 py-1 rounded-full border border-rule">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: roleColor }} />
                  {user.role}
                </span>

                <span className="text-xs text-ink-faint mono-num hidden lg:inline">
                  {user.email}
                </span>

                <button
                  onClick={() => logoutUser()}
                  className="hidden sm:inline-flex p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-surface-secondary transition pressable"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>

                {/* Mobile Menu Hamburger Toggle */}
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                  className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-secondary transition pressable md:hidden"
                  aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                  aria-expanded={isMobileMenuOpen}
                >
                  {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation Dropdown Drawer */}
        {user && isMobileMenuOpen && (
          <div className="md:hidden border-t border-rule bg-paper px-4 py-4 space-y-3">
            <div className="space-y-1">
              <Link
                href="/dashboard"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded text-sm font-medium tracking-tight transition pressable ${
                  pathname === '/dashboard'
                    ? 'bg-ink text-paper'
                    : 'text-ink-muted hover:bg-rule/40'
                }`}
              >
                <span>Accounts</span>
                <span className="text-xs text-ink-faint">Overview</span>
              </Link>

              {(user.role === 'ADMIN' || user.role === 'AUDITOR') && (
                <Link
                  href="/admin/audit"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded text-sm font-medium tracking-tight transition pressable ${
                    pathname === '/admin/audit'
                      ? 'bg-ink text-paper'
                      : 'text-ink-muted hover:bg-rule/40'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <BookOpen className="h-4 w-4 text-ink-faint" />
                    <span>Audit ledger</span>
                  </div>
                  <span className="text-xs text-ink-faint mono-num">SHA-256</span>
                </Link>
              )}

              {user.role === 'ADMIN' && (
                <Link
                  href="/admin/stress-lab"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded text-sm font-medium tracking-tight transition pressable ${
                    pathname === '/admin/stress-lab'
                      ? 'bg-ink text-paper'
                      : 'text-ink-muted hover:bg-rule/40 border border-rule'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Zap className="h-4 w-4 text-accent" />
                    <span>Stress lab</span>
                  </div>
                  <span className="text-xs mono-num font-medium text-ink-muted">ACID</span>
                </Link>
              )}
            </div>

            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsCommandOpen(true);
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 bg-paper hover:bg-rule/40 border border-rule rounded text-xs text-ink-muted transition pressable"
            >
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-ink-faint" />
                <span className="font-medium text-ink">Quick actions</span>
              </div>
              <kbd className="inline-flex items-center px-1.5 py-0.5 text-[10px] mono-num text-ink-faint bg-paper border border-rule rounded">
                ⌘K
              </kbd>
            </button>

            <div className="pt-2 border-t border-rule flex items-center justify-between text-xs text-ink-muted">
              <span className="mono-num truncate">{user.email}</span>
              <button
                onClick={() => logoutUser()}
                className="font-medium text-ledger-red hover:underline p-1 pressable"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
      />
    </>
  );
}
