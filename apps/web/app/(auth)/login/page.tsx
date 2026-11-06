'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setAccessToken, setUser } from '@/lib/auth';
import { Layers, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to login');
      }

      // Store in memory (NEVER in localStorage)
      setAccessToken(data.accessToken);
      setUser(data.user);

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (quickEmail: string, quickPass: string) => {
    setEmail(quickEmail);
    setPassword(quickPass);
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-sky-500/10 text-sky-600 mb-4 shadow-sm">
          <Layers className="h-8 w-8" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Sign in to LedgerLine
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Double-entry ledger with serializable ACID isolation
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-slate-200">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Email Address
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm"
                  placeholder="admin@ledgerline.dev"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 transition"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
              {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center mb-3">
              One-Click Seed Accounts
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@ledgerline.dev', 'Admin1234!')}
                className="py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded text-xs font-medium transition"
              >
                ADMIN
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('holder@ledgerline.dev', 'Holder1234!')}
                className="py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-xs font-medium transition"
              >
                HOLDER
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('auditor@ledgerline.dev', 'Audit1234!')}
                className="py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded text-xs font-medium transition"
              >
                AUDITOR
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
