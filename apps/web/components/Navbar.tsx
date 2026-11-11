'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getUser, logoutUser, subscribeAuth, UserSession } from '@/lib/auth';
import { LogOut, Menu, X } from 'lucide-react';
import CommandPalette from './CommandPalette';
import ThemeToggle from './ThemeToggle';
import { getTheme, setTheme, subscribeTheme, Theme } from '@/lib/theme';

interface NavItem {
  name: string;
  href: string;
  match: (path: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    name: 'Accounts',
    href: '/dashboard',
    match: (path: string) => path === '/dashboard' || path.startsWith('/accounts'),
  },
  {
    name: 'Audit Ledger',
    href: '/admin/audit',
    match: (path: string) => path.startsWith('/admin/audit'),
  },
  {
    name: 'Stress Lab',
    href: '/admin/stress-lab',
    match: (path: string) => path.startsWith('/admin/stress-lab'),
  },
  {
    name: 'Users',
    href: '/admin/users',
    match: (path: string) => path.startsWith('/admin/users'),
  },
];

export default function Navbar() {
  const [user, setUserState] = useState<UserSession | null>(null);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setCurrentTheme] = useState<Theme>('light');
  const pathname = usePathname();

  // Sliding indicator state
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const navRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] = useState<{
    left: number;
    width: number;
    opacity: number;
  }>({
    left: 0,
    width: 0,
    opacity: 0,
  });

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

  // Determine active index
  const activeIdx = Math.max(
    0,
    NAV_ITEMS.findIndex((item) => item.match(pathname))
  );

  const currentIdx = hoveredIdx !== null ? hoveredIdx : activeIdx;

  // Reposition sliding indicator on index change or resize
  useEffect(() => {
    const updateIndicator = () => {
      const el = navRefs.current[currentIdx];
      if (el) {
        setIndicatorStyle({
          left: el.offsetLeft,
          width: el.offsetWidth,
          opacity: 1,
        });
      }
    };

    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [currentIdx, pathname]);

  if (pathname === '/login') {
    return null;
  }

  const handleToggleTheme = (isDark: boolean) => {
    setTheme(isDark ? 'dark' : 'light');
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b glass-chrome border-rule bg-surface/80 backdrop-blur-md">
        <div className="grid items-center w-full h-16 px-4 grid-cols-2 md:grid-cols-3 sm:px-6 lg:px-8">
          {/* Left — Brand Identity (Absolute Left Corner) */}
          <div className="flex items-center justify-start">
            <Link
              href="/dashboard"
              className="flex items-center py-1 space-x-2.5 rounded-lg pressable focus:outline-hidden focus:ring-1 focus:ring-primary/40"
              title="LedgerLine Home"
            >
              <div className="relative flex items-center justify-center w-8 h-8 rounded-lg border bg-surface border-rule text-primary shadow-xs">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="3.5" fill="currentColor" fillOpacity="0.9" />
                  <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(-30 12 12)" stroke="currentColor" strokeWidth="1.5" strokeDasharray="32 6" />
                  <circle cx="19" cy="8" r="1.5" fill="#B6A9FF" />
                </svg>
              </div>
              <span className="flex items-center text-lg font-bold tracking-tight text-ink gap-0.5">
                Ledger<span className="text-primary">Line</span>
              </span>
            </Link>
          </div>

          {/* Center — Primary Navigation (Centered Relative to Viewport) */}
          <div className="items-center justify-center hidden md:flex">
            {user && (
              <nav
                className="relative flex items-center p-1 border rounded-xl bg-surface-secondary/70 border-rule/60 backdrop-blur-md shadow-xs"
                onMouseLeave={() => setHoveredIdx(null)}
                aria-label="Primary Navigation"
              >
                {/* Smooth Sliding Hover/Active Highlight Indicator */}
                <div
                  className="absolute top-1 bottom-1 rounded-lg pointer-events-none transition-all duration-200 ease-out"
                  style={{
                    left: `${indicatorStyle.left}px`,
                    width: `${indicatorStyle.width}px`,
                    opacity: indicatorStyle.opacity,
                    background: 'rgba(139, 124, 255, 0.12)',
                    border: '1px solid rgba(182, 169, 255, 0.22)',
                    boxShadow: '0 0 14px rgba(139, 124, 255, 0.12)',
                  }}
                />

                {NAV_ITEMS.map((item, index) => {
                  const isActive = activeIdx === index;
                  const isHovered = hoveredIdx === index;

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      ref={(el) => {
                        navRefs.current[index] = el;
                      }}
                      onMouseEnter={() => setHoveredIdx(index)}
                      className={`relative z-10 px-3.5 py-1.5 text-xs tracking-tight transition-colors duration-150 rounded-lg flex items-center space-x-1.5 focus:outline-hidden focus:ring-1 focus:ring-primary/40 ${
                        isActive
                          ? 'text-primary font-semibold'
                          : isHovered
                          ? 'text-ink font-medium'
                          : 'text-ink-muted hover:text-ink font-medium'
                      }`}
                    >
                      <span>{item.name}</span>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 animate-pulse" />
                      )}
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>

          {/* Right — Utility Controls (Far Right Corner) */}
          <div className="flex items-center justify-end space-x-2 sm:space-x-3">
            {/* Unified Theme Toggle */}
            <ThemeToggle
              isDark={theme === 'dark'}
              onToggle={handleToggleTheme}
            />

            {user && (
              <>
                {/* Logout Control (Positioned at Far-Right End) */}
                <button
                  onClick={() => logoutUser()}
                  className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-rule/70 bg-surface/60 hover:bg-surface-secondary text-ink-muted hover:text-ledger-red transition duration-200 pressable text-xs font-medium focus:outline-hidden focus:ring-1 focus:ring-primary/40 shadow-xs"
                  title="Sign out of LedgerLine"
                  aria-label="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign out</span>
                </button>

                {/* Mobile Hamburger Toggle for Small Screens */}
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                  className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-secondary transition pressable md:hidden focus:outline-hidden focus:ring-1 focus:ring-primary/40"
                  aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                  aria-expanded={isMobileMenuOpen}
                >
                  {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Responsive Mobile Drawer */}
        {user && isMobileMenuOpen && (
          <div className="px-4 py-3 space-y-1 border-t md:hidden border-rule bg-surface/95 backdrop-blur-md">
            {NAV_ITEMS.map((item, index) => {
              const isActive = activeIdx === index;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-tight transition pressable ${
                    isActive
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-ink-muted hover:text-ink hover:bg-surface-secondary'
                  }`}
                >
                  <span>{item.name}</span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                  )}
                </Link>
              );
            })}
            <div className="flex justify-end pt-2 mt-2 border-t border-rule">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  logoutUser();
                }}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-medium text-ledger-red hover:bg-surface-secondary transition pressable"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Global Command Palette (Keyboard shortcuts preserved) */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
      />
    </>
  );
}
