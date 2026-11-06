'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setAccessToken, setUser } from '@/lib/auth';
import {
  Layers,
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  Info,
  X,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotNotice, setShowForgotNotice] = useState(false);
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
        throw new Error(data.error || 'Invalid email or password');
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
    setError(null);
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-sky-500/10 text-sky-600 mb-4 shadow-xs border border-sky-200/60">
          <Layers className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight-display">
          Sign in to LedgerLine
        </h1>
        <p className="mt-2 text-sm text-slate-500 font-medium">
          Reliable, auditable financial recordkeeping.
        </p>
      </div>

      {/* Main Authentication Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-[460px]">
        <div className="bg-white/90 backdrop-blur-md py-8 px-6 sm:px-9 shadow-lg rounded-2xl border border-slate-200/80">
          {/* Error Banner */}
          {error && (
            <div
              role="alert"
              className="mb-5 p-3.5 bg-red-50/90 border border-red-200 rounded-xl flex items-start space-x-3 text-sm text-red-700 animate-in fade-in-50 duration-200"
            >
              <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-red-900">Authentication Failed</p>
                <p className="text-red-700 mt-0.5 text-xs">{error}</p>
              </div>
            </div>
          )}

          {/* Forgot Password Information Banner */}
          {showForgotNotice && (
            <div className="mb-5 p-3.5 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-900 flex items-start space-x-2.5 animate-in fade-in-50 duration-200">
              <Info className="h-4 w-4 shrink-0 text-sky-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-sky-950">Password Recovery</p>
                <p className="text-sky-800 mt-0.5">
                  In LedgerLine&apos;s multi-tenant core engine, credentials are managed by your administrator. Contact security operations or select a demo role below to explore.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotNotice(false)}
                className="text-sky-600 hover:text-sky-900 p-0.5 rounded transition"
                aria-label="Dismiss notice"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                Email Address
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 w-full pl-10 pr-3.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:border-sky-500 transition"
                  placeholder="admin@ledgerline.dev"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotNotice(true)}
                  className="text-xs font-medium text-sky-600 hover:text-sky-700 focus-visible:outline-none focus-visible:underline transition pressable"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 w-full pl-10 pr-10 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:border-sky-500 transition"
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:text-slate-700 transition"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-slate-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-slate-500" />
                  )}
                </button>
              </div>
            </div>

            {/* Primary Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="h-12 w-full flex justify-center items-center py-2.5 px-4 rounded-xl shadow-xs text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500 disabled:opacity-60 disabled:cursor-not-allowed transition pressable"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Demo Access Section */}
          <div className="mt-7 pt-6 border-t border-slate-200/80">
            <div className="text-center mb-3.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Demo Access
              </span>
              <p className="text-xs text-slate-400 mt-0.5">
                Explore LedgerLine using a pre-configured sample role
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@ledgerline.dev', 'Admin1234!')}
                className="py-2.5 px-2 bg-purple-50 hover:bg-purple-100/80 text-purple-700 border border-purple-200/80 rounded-xl text-center transition pressable focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                aria-label="Sign in as Admin demo account"
              >
                <div className="flex items-center justify-center space-x-1 mb-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-500"></span>
                  <span className="text-xs font-bold tracking-tight">ADMIN</span>
                </div>
                <span className="text-[10px] text-purple-600/80 font-medium block">
                  Superuser
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('holder@ledgerline.dev', 'Holder1234!')}
                className="py-2.5 px-2 bg-sky-50 hover:bg-sky-100/80 text-sky-700 border border-sky-200/80 rounded-xl text-center transition pressable focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                aria-label="Sign in as Holder demo account"
              >
                <div className="flex items-center justify-center space-x-1 mb-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-500"></span>
                  <span className="text-xs font-bold tracking-tight">HOLDER</span>
                </div>
                <span className="text-[10px] text-sky-600/80 font-medium block">
                  Account Owner
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('auditor@ledgerline.dev', 'Audit1234!')}
                className="py-2.5 px-2 bg-amber-50 hover:bg-amber-100/80 text-amber-700 border border-amber-200/80 rounded-xl text-center transition pressable focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                aria-label="Sign in as Auditor demo account"
              >
                <div className="flex items-center justify-center space-x-1 mb-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                  <span className="text-xs font-bold tracking-tight">AUDITOR</span>
                </div>
                <span className="text-[10px] text-amber-600/80 font-medium block">
                  Compliance
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Security / Engine Trust Badge */}
        <div className="mt-6 flex items-center justify-center space-x-2 text-xs text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
          <span>Double-entry ledger • PostgreSQL Serializable ACID • SHA-256 sealed</span>
        </div>
      </div>
    </div>
  );
}
