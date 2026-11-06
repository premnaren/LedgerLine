'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getUser, logoutUser, subscribeAuth, UserSession } from '@/lib/auth';
import { ShieldCheck, LogOut, ArrowRightLeft, BookOpen, Layers } from 'lucide-react';

export default function Navbar() {
  const [user, setUserState] = useState<UserSession | null>(null);
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

  const roleBadgeColors: Record<string, string> = {
    ADMIN: 'bg-purple-100 text-purple-800 border-purple-300',
    HOLDER: 'bg-blue-100 text-blue-800 border-blue-300',
    AUDITOR: 'bg-amber-100 text-amber-800 border-amber-300',
  };

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <Layers className="h-6 w-6 text-sky-600" />
            <span className="font-bold text-xl tracking-tight text-slate-900">
              Ledger<span className="text-sky-600">Line</span>
            </span>
          </Link>

          {user && (
            <nav className="hidden md:flex space-x-4">
              <Link
                href="/dashboard"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  pathname === '/dashboard'
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Dashboard
              </Link>

              {(user.role === 'ADMIN' || user.role === 'AUDITOR') && (
                <Link
                  href="/admin/audit"
                  className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center space-x-1.5 transition ${
                    pathname === '/admin/audit'
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Audit Ledger</span>
                </Link>
              )}
            </nav>
          )}
        </div>

        {user && (
          <div className="flex items-center space-x-4">
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                roleBadgeColors[user.role] || 'bg-slate-100 text-slate-800'
              }`}
            >
              {user.role}
            </span>
            <span className="text-sm text-slate-600 hidden sm:inline">{user.email}</span>
            <button
              onClick={() => logoutUser()}
              className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

