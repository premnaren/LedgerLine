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
  const [email, setEmail] = useState('admin@ledgerline.dev');
  const [password, setPassword] = useState('Admin1234!');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotNotice, setShowForgotNotice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeRole, setActiveRole] = useState<'ADMIN' | 'HOLDER' | 'AUDITOR' | null>('ADMIN');

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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

      // Store credentials in memory
      setAccessToken(data.accessToken);
      setUser(data.user);

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
      setLoading(false);
    }
  };

  const handleQuickLogin = (
    role: 'ADMIN' | 'HOLDER' | 'AUDITOR',
    quickEmail: string,
    quickPass: string
  ) => {
    setError(null);
    setActiveRole(role);
    setEmail(quickEmail);
    setPassword(quickPass);
  };

  return (
    <div className="flex flex-col justify-between items-center px-4 py-8 w-full min-h-screen sm:px-6 bg-paper text-ink">
      {/* Top spacer */}
      <div className="hidden w-full max-w-4xl sm:block" aria-hidden="true" />

      {/* Main Container: Two-Column Split Architecture */}
      <div className="grid overflow-hidden grid-cols-1 my-auto w-full max-w-4xl bg-white rounded border border-rule md:grid-cols-12">
        {/* Left Column: Decorative Ledger & Hash-Chain Evidence */}
        <div className="hidden flex-col justify-between p-8 border-r md:flex md:col-span-5 bg-paper border-rule">
          <div>
            <div className="flex items-center space-x-2.5 mb-6">
              <div className="flex justify-center items-center w-8 h-8 bg-white rounded border border-rule text-accent">
                <Layers className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold tracking-tight text-ink">
                Ledger<span className="text-accent">Line</span>
              </span>
            </div>

            <h2 className="mb-2 text-sm font-semibold tracking-tight text-ink">
              Cryptographic core ledger
            </h2>
            <p className="text-xs leading-relaxed text-ink-muted">
              Every deposit, withdrawal, and transfer is permanently verified with SHA-256 block hashing and zero-sum double-entry legs.
            </p>

            {/* Decorative Hash-Chain Monospace Block */}
            <div className="mt-6 p-3 bg-white border border-rule rounded mono-num text-[11px] text-ink-muted space-y-2 select-none">
              <div className="text-[10px] text-ink-faint border-b border-rule pb-1 flex justify-between">
                <span>HASH CHAIN TELEMETRY</span>
                <span>SHA-256</span>
              </div>
              <div className="truncate">
                <span className="text-ink-faint">GEN: </span>
                <span className="text-ink">000000000000000000...</span>
              </div>
              <div className="truncate">
                <span className="text-ink-faint">BLK: </span>
                <span className="text-accent">4a2b9e18c0df71a9e8...</span>
              </div>
              <div className="truncate">
                <span className="text-ink-faint">SIG: </span>
                <span className="text-ledger-green">e73c8801fb25890ad1...</span>
              </div>
              <div className="truncate">
                <span className="text-ink-faint">HED: </span>
                <span className="text-ink">f8d492a013b912c44e...</span>
              </div>
              <div className="pt-1 border-t border-rule text-[10px] text-ledger-green flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--ledger-green)' }} />
                <span>Zero-sum invariant Δ=0</span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-rule text-[11px] text-ink-faint">
            <span>Serializable ACID row locks · FIPS 180-4</span>
          </div>
        </div>

        {/* Right Column: Authentication Form */}
        <div className="flex flex-col col-span-1 justify-between p-6 md:col-span-7 sm:p-8">
          <div>
            {/* Mobile Header */}
            <div className="md:hidden flex items-center space-x-2.5 mb-5">
              <div className="flex justify-center items-center w-8 h-8 bg-white rounded border border-rule text-accent">
                <Layers className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold tracking-tight text-ink">
                Ledger<span className="text-accent">Line</span>
              </span>
            </div>

            <div className="mb-5">
              <h1 className="text-xl font-bold tracking-tight text-ink">
                Sign in to your account
              </h1>
              <p className="text-xs text-ink-muted mt-0.5">
                Enter your credentials or choose a pre-configured demo role.
              </p>
            </div>

            {/* Error Banner */}
            {error && (
              <div
                role="alert"
                className="flex items-start p-3 mb-4 space-x-2 text-xs rounded border bg-paper border-ledger-red text-ledger-red"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Authentication failed</p>
                  <p className="mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {/* Forgot Password Banner */}
            {showForgotNotice && (
              <div className="flex items-start p-3 mb-4 space-x-2 text-xs rounded border bg-paper border-rule text-ink">
                <Info className="h-4 w-4 shrink-0 text-accent mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Password recovery</p>
                  <p className="text-ink-muted mt-0.5">
                    Credentials are managed by your administrator. Contact security operations or select a demo role below.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotNotice(false)}
                  className="text-ink-faint hover:text-ink p-0.5"
                  aria-label="Dismiss notice"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              {/* Email Address */}
              <div>
                <label
                  htmlFor="email"
                  className="block mb-1 text-xs font-medium text-ink-muted"
                >
                  Email address
                </label>
                <div className="relative">
                  <div className="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none text-ink-faint">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setActiveRole(null);
                    }}
                    className="pr-3 pl-9 w-full h-10 text-xs bg-white rounded border mono-num border-rule text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label
                    htmlFor="password"
                    className="block text-xs font-medium text-ink-muted"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotNotice(true)}
                    className="text-xs text-accent hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <div className="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none text-ink-faint">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-9 pl-9 w-full h-10 text-xs bg-white rounded border border-rule text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent"
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="flex absolute inset-y-0 right-0 items-center pr-3 text-ink-faint hover:text-ink"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Primary Sign In Button */}
              <button
                type="submit"
                disabled={loading}
                className="flex justify-center items-center px-4 py-2 mt-2 w-full h-10 text-xs font-semibold text-white rounded transition bg-accent hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed pressable"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin text-white" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Sign in</span>
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-5">
              <div className="flex absolute inset-0 items-center" aria-hidden="true">
                <div className="w-full border-t border-rule" />
              </div>
              <div className="flex relative justify-center text-xs">
                <span className="bg-white px-2 text-[11px] text-ink-faint">
                  Or select a demo role
                </span>
              </div>
            </div>

            {/* Quick Demo Access: Plain border border-rule buttons with leading colored dot */}
            <div className="grid grid-cols-3 gap-2">
              {/* ADMIN */}
              <button
                type="button"
                onClick={() => handleQuickLogin('ADMIN', 'admin@ledgerline.dev', 'Admin1234!')}
                className={`py-2 px-2 rounded text-center border transition pressable text-xs ${
                  activeRole === 'ADMIN'
                    ? 'border-accent bg-paper font-semibold text-ink ring-1 ring-accent'
                    : 'border-rule hover:bg-paper text-ink'
                }`}
                aria-label="Sign in as Admin demo account"
              >
                <div className="flex items-center justify-center space-x-1.5 mb-0.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--role-admin)' }} />
                  <span className="font-medium text-ink">Admin</span>
                </div>
                <span className="text-[10px] text-ink-faint block">Superuser</span>
              </button>

              {/* HOLDER */}
              <button
                type="button"
                onClick={() => handleQuickLogin('HOLDER', 'holder@ledgerline.dev', 'Holder1234!')}
                className={`py-2 px-2 rounded text-center border transition pressable text-xs ${
                  activeRole === 'HOLDER'
                    ? 'border-accent bg-paper font-semibold text-ink ring-1 ring-accent'
                    : 'border-rule hover:bg-paper text-ink'
                }`}
                aria-label="Sign in as Holder demo account"
              >
                <div className="flex items-center justify-center space-x-1.5 mb-0.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--role-holder)' }} />
                  <span className="font-medium text-ink">Holder</span>
                </div>
                <span className="text-[10px] text-ink-faint block">Account owner</span>
              </button>

              {/* AUDITOR */}
              <button
                type="button"
                onClick={() => handleQuickLogin('AUDITOR', 'auditor@ledgerline.dev', 'Audit1234!')}
                className={`py-2 px-2 rounded text-center border transition pressable text-xs ${
                  activeRole === 'AUDITOR'
                    ? 'border-accent bg-paper font-semibold text-ink ring-1 ring-accent'
                    : 'border-rule hover:bg-paper text-ink'
                }`}
                aria-label="Sign in as Auditor demo account"
              >
                <div className="flex items-center justify-center space-x-1.5 mb-0.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--role-auditor)' }} />
                  <span className="font-medium text-ink">Auditor</span>
                </div>
                <span className="text-[10px] text-ink-faint block">Read-only</span>
              </button>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-rule flex items-center justify-center space-x-1.5 text-xs text-ink-faint">
            <ShieldCheck className="h-3.5 w-3.5 text-ledger-green" />
            <span>Secure authentication · SHA-256 seal</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full text-center py-2 text-[11px] text-ink-faint">
        LedgerLine &copy; 2026 · Double-entry core banking engine
      </footer>
    </div>
  );
}
