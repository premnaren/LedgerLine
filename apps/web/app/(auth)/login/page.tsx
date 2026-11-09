'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { setSession } from '@/lib/auth';
import InteractiveLedgerNetwork from '@/components/InteractiveLedgerNetwork';
import ThemeToggle from '@/components/ThemeToggle';
import {
  Layers,
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Info,
  X,
  Building,
  CheckCircle2,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [isDark, setIsDark] = useState(false);

  // Sync theme with system or saved preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ledgerline_theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (saved === 'dark' || (!saved && prefersDark)) {
        setIsDark(true);
        document.documentElement.classList.add('dark');
      } else {
        setIsDark(false);
        document.documentElement.classList.remove('dark');
      }
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }, []);

  const handleToggleTheme = (nextDark: boolean) => {
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      try {
        localStorage.setItem('ledgerline_theme', 'dark');
      } catch {}
    } else {
      document.documentElement.classList.remove('dark');
      try {
        localStorage.setItem('ledgerline_theme', 'light');
      } catch {}
    }
  };

  // Sign in fields
  const [email, setEmail] = useState('admin@ledgerline.dev');
  const [password, setPassword] = useState('Admin1234!');

  // Sign up fields
  const [signupEmail, setSignupEmail] = useState('');
  const [accountName, setAccountName] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showForgotNotice, setShowForgotNotice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeRole, setActiveRole] = useState<'ADMIN' | 'HOLDER' | 'AUDITOR' | null>('ADMIN');

  const handleSignIn = async (e?: React.FormEvent) => {
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

      // Store credentials in memory and persistent storage for refresh resilience
      setSession(data.accessToken, data.user, data.refreshToken);

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!signupEmail.trim() || !signupPassword.trim()) {
      setError('Email and password are required');
      return;
    }

    if (signupPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (signupPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: signupEmail.trim(),
          password: signupPassword,
          accountName: accountName.trim() || undefined,
        }),
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Store credentials in memory and persistent storage for refresh resilience
      setSession(data.accessToken, data.user, data.refreshToken);

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
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
    <div className={`min-h-screen w-full flex flex-col lg:flex-row bg-paper dark:bg-[#0B0F17] text-ink dark:text-white transition-colors duration-300 relative ${isDark ? 'dark' : ''}`}>
      {/* Floating Theme Switcher */}
      <div className="fixed top-5 right-5 sm:top-6 sm:right-8 z-50">
        <ThemeToggle isDark={isDark} onToggle={handleToggleTheme} />
      </div>

      {/* ============================================================ */}
      {/* Left Column: Visual Interactive Ledger Network (Desktop)     */}
      {/* ============================================================ */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-5/12 2xl:w-1/2 relative bg-[#E2E6EE] dark:bg-[#080C14] border-r border-[#DDD9D2] dark:border-[#1E293B] flex-col justify-between p-10 xl:p-14 overflow-hidden select-none transition-colors duration-300">
        {/* Interactive Connected-Node Network Canvas */}
        <InteractiveLedgerNetwork isDark={isDark} />

        {/* Top: Brand Identity */}
        <div className="relative z-10 flex items-center space-x-3 pointer-events-none">
          <div className="flex justify-center items-center w-9 h-9 bg-white dark:bg-[#131A26] rounded border border-[#DDD9D2] dark:border-[#1E293B] text-accent dark:text-[#38BDF8] shadow-sm pointer-events-auto transition">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-ink dark:text-white transition">
              Ledger<span className="text-accent dark:text-[#38BDF8]">Line</span>
            </span>
            <span className="block text-xs font-mono text-ink-muted dark:text-slate-400 transition">
              Double-entry core engine
            </span>
          </div>
        </div>

        {/* Bottom: Single Short Headline */}
        <div className="relative z-10 mt-auto pt-16 pointer-events-none">
          <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-ink dark:text-white leading-tight transition">
            Every transaction,<br />
            <span className="text-accent dark:text-[#38BDF8]">accounted for.</span>
          </h1>
        </div>
      </div>

      {/* ============================================================ */}
      {/* Right Column: Clean, Prominent Auth Form                      */}
      {/* ============================================================ */}
      <div className="w-full lg:w-1/2 xl:w-7/12 2xl:w-1/2 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-12 xl:p-16 min-h-screen bg-paper dark:bg-[#0B0F17] transition-colors duration-300">
        {/* Mobile Brand Header (Visible only on smaller screens) */}
        <div className="lg:hidden w-full max-w-[460px] flex items-center justify-between mb-6 pb-4 border-b border-rule dark:border-[#1E293B]">
          <div className="flex items-center space-x-2.5">
            <div className="flex justify-center items-center w-8 h-8 bg-white dark:bg-[#131A26] rounded border border-rule dark:border-[#1E293B] text-accent dark:text-[#38BDF8]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-ink dark:text-white">
                Ledger<span className="text-accent dark:text-[#38BDF8]">Line</span>
              </span>
              <span className="block text-xs text-ink-muted dark:text-slate-400">
                Double-entry core ledger
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 text-xs text-ledger-green bg-white dark:bg-[#131A26] px-2.5 py-1 rounded border border-rule dark:border-[#1E293B]">
            <span className="w-1.5 h-1.5 rounded-full bg-ledger-green" />
            <span className="font-medium">Active</span>
          </div>
        </div>

        {/* Prominent Auth Card */}
        <div className="w-full max-w-[460px] bg-white dark:bg-[#131926] rounded border border-rule dark:border-[#1E293B] p-7 sm:p-8 space-y-5 shadow-sm transition">
          {/* Form Header */}
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-ink dark:text-white">
              {mode === 'signin' ? 'Sign in to LedgerLine' : 'Create your account'}
            </h2>
            <p className="text-xs text-ink-muted dark:text-slate-400 leading-relaxed">
              {mode === 'signin'
                ? 'Access your verified double-entry operating ledger.'
                : 'Register for a new operating account with personal ledger access.'}
            </p>
          </div>

          {/* Segmented Tab Switcher */}
          <div className="grid grid-cols-2 p-1 bg-paper dark:bg-[#0B0F17] rounded border border-rule dark:border-[#1E293B] text-xs">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signin'}
              onClick={() => {
                setMode('signin');
                setError(null);
              }}
              className={`py-2 text-xs rounded transition text-center font-semibold ${
                mode === 'signin'
                  ? 'bg-white dark:bg-[#1E293B] text-ink dark:text-white border border-rule dark:border-[#334155] shadow-none'
                  : 'text-ink-muted dark:text-slate-400 hover:text-ink dark:hover:text-white font-medium'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              onClick={() => {
                setMode('signup');
                setError(null);
                setActiveRole(null);
              }}
              className={`py-2 text-xs rounded transition text-center font-semibold ${
                mode === 'signup'
                  ? 'bg-white dark:bg-[#1E293B] text-ink dark:text-white border border-rule dark:border-[#334155] shadow-none'
                  : 'text-ink-muted dark:text-slate-400 hover:text-ink dark:hover:text-white font-medium'
              }`}
            >
              Create account
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div
              role="alert"
              className="flex items-start p-3.5 space-x-2.5 text-xs rounded border bg-paper dark:bg-red-950/30 border-ledger-red text-ledger-red"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">
                  {mode === 'signin' ? 'Sign in failed' : 'Registration failed'}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {/* Forgot Password Banner */}
          {showForgotNotice && (
            <div className="flex items-start p-3.5 space-x-2.5 text-xs rounded border bg-paper dark:bg-[#0B0F17] border-rule dark:border-[#1E293B] text-ink dark:text-white">
              <Info className="h-4 w-4 shrink-0 text-accent dark:text-[#38BDF8] mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-xs">Password recovery</p>
                <p className="text-ink-muted dark:text-slate-400 text-xs mt-0.5 leading-relaxed">
                  Managed by security operations. For evaluation, use pre-configured demo credentials or contact admin@ledgerline.dev.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotNotice(false)}
                className="text-ink-muted hover:text-ink dark:text-slate-400 dark:hover:text-white p-0.5"
                aria-label="Dismiss notice"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ============================================================ */}
          {/* SIGN IN FORM                                                 */}
          {/* ============================================================ */}
          {mode === 'signin' ? (
            <div className="space-y-5">
              <form className="space-y-4" onSubmit={handleSignIn} noValidate>
                {/* Email Address */}
                <div>
                  <label
                    htmlFor="signin-email"
                    className="block mb-1 text-xs font-semibold text-ink-muted dark:text-slate-400"
                  >
                    Email address
                  </label>
                  <div className="relative">
                    <div className="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none text-ink-muted dark:text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="signin-email"
                      name="email"
                      type="email"
                      required
                      autoComplete="username"
                      spellCheck={false}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setActiveRole(null);
                      }}
                      className="pr-3 pl-9 w-full h-10 text-xs bg-white dark:bg-[#0B0F17] rounded border mono-num border-rule dark:border-[#1E293B] text-ink dark:text-white placeholder:text-ink-muted dark:placeholder:text-slate-500 focus:outline-none focus:border-accent dark:focus:border-[#38BDF8]"
                      placeholder="name@company.com"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label
                      htmlFor="signin-password"
                      className="block text-xs font-semibold text-ink-muted dark:text-slate-400"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgotNotice(true)}
                      className="text-xs text-accent dark:text-[#38BDF8] hover:underline font-medium"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none text-ink-muted dark:text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="signin-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-9 pl-9 w-full h-10 text-xs bg-white dark:bg-[#0B0F17] rounded border border-rule dark:border-[#1E293B] text-ink dark:text-white placeholder:text-ink-muted dark:placeholder:text-slate-500 focus:outline-none focus:border-accent dark:focus:border-[#38BDF8]"
                      placeholder="••••••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="flex absolute inset-y-0 right-0 items-center pr-3 text-ink-muted hover:text-ink dark:text-slate-400 dark:hover:text-white"
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
                  className="flex justify-center items-center px-4 py-2 mt-2 w-full h-10 text-xs font-bold text-white rounded transition bg-accent dark:bg-[#0284C7] hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed pressable"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign in</span>
                      <ArrowRight className="ml-1.5 h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Quick Demo Access Divider */}
              <div className="relative pt-1">
                <div className="flex absolute inset-0 items-center" aria-hidden="true">
                  <div className="w-full border-t border-rule dark:border-[#1E293B]" />
                </div>
                <div className="flex relative justify-center text-xs">
                  <span className="bg-white dark:bg-[#131926] px-2.5 text-xs text-ink-muted dark:text-slate-400 font-medium">
                    Demo accounts
                  </span>
                </div>
              </div>

              {/* Demo Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('ADMIN', 'admin@ledgerline.dev', 'Admin1234!')}
                  className={`py-2 px-1.5 rounded text-center border transition pressable text-xs ${
                    activeRole === 'ADMIN'
                      ? 'border-accent dark:border-[#38BDF8] bg-paper dark:bg-[#1E293B] font-semibold text-ink dark:text-white ring-1 ring-accent dark:ring-[#38BDF8]'
                      : 'border-rule dark:border-[#1E293B] bg-white dark:bg-[#0B0F17] hover:bg-paper dark:hover:bg-[#1E293B] text-ink dark:text-white'
                  }`}
                  aria-label="Load Admin demo credentials"
                >
                  <div className="flex items-center justify-center space-x-1 mb-0.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--role-admin)' }} />
                    <span className="font-semibold text-ink dark:text-white text-xs">Admin</span>
                  </div>
                  <span className="text-xs text-ink-muted dark:text-slate-400 block truncate">Superuser</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('HOLDER', 'holder@ledgerline.dev', 'Holder1234!')}
                  className={`py-2 px-1.5 rounded text-center border transition pressable text-xs ${
                    activeRole === 'HOLDER'
                      ? 'border-accent dark:border-[#38BDF8] bg-paper dark:bg-[#1E293B] font-semibold text-ink dark:text-white ring-1 ring-accent dark:ring-[#38BDF8]'
                      : 'border-rule dark:border-[#1E293B] bg-white dark:bg-[#0B0F17] hover:bg-paper dark:hover:bg-[#1E293B] text-ink dark:text-white'
                  }`}
                  aria-label="Load Holder demo credentials"
                >
                  <div className="flex items-center justify-center space-x-1 mb-0.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--role-holder)' }} />
                    <span className="font-semibold text-ink dark:text-white text-xs">Holder</span>
                  </div>
                  <span className="text-xs text-ink-muted dark:text-slate-400 block truncate">Account owner</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('AUDITOR', 'auditor@ledgerline.dev', 'Audit1234!')}
                  className={`py-2 px-1.5 rounded text-center border transition pressable text-xs ${
                    activeRole === 'AUDITOR'
                      ? 'border-accent dark:border-[#38BDF8] bg-paper dark:bg-[#1E293B] font-semibold text-ink dark:text-white ring-1 ring-accent dark:ring-[#38BDF8]'
                      : 'border-rule dark:border-[#1E293B] bg-white dark:bg-[#0B0F17] hover:bg-paper dark:hover:bg-[#1E293B] text-ink dark:text-white'
                  }`}
                  aria-label="Load Auditor demo credentials"
                >
                  <div className="flex items-center justify-center space-x-1 mb-0.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--role-auditor)' }} />
                    <span className="font-semibold text-ink dark:text-white text-xs">Auditor</span>
                  </div>
                  <span className="text-xs text-ink-muted dark:text-slate-400 block truncate">Read-only</span>
                </button>
              </div>
            </div>
          ) : (
            /* ============================================================ */
            /* CREATE ACCOUNT FORM                                          */
            /* ============================================================ */
            <form className="space-y-4" onSubmit={handleSignUp} noValidate>
              {/* Email Address */}
              <div>
                <label
                  htmlFor="signup-email"
                  className="block mb-1 text-xs font-semibold text-ink-muted dark:text-slate-400"
                >
                  Email address
                </label>
                <div className="relative">
                  <div className="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none text-ink-muted dark:text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="signup-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="username"
                    spellCheck={false}
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="pr-3 pl-9 w-full h-10 text-xs bg-white dark:bg-[#0B0F17] rounded border mono-num border-rule dark:border-[#1E293B] text-ink dark:text-white placeholder:text-ink-muted dark:placeholder:text-slate-500 focus:outline-none focus:border-accent dark:focus:border-[#38BDF8]"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              {/* Account Name */}
              <div>
                <label
                  htmlFor="account-name"
                  className="block mb-1 text-xs font-semibold text-ink-muted dark:text-slate-400"
                >
                  Account label <span className="text-ink-muted dark:text-slate-500 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <div className="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none text-ink-muted dark:text-slate-400">
                    <Building className="w-4 h-4" />
                  </div>
                  <input
                    id="account-name"
                    name="accountName"
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="pr-3 pl-9 w-full h-10 text-xs bg-white dark:bg-[#0B0F17] rounded border border-rule dark:border-[#1E293B] text-ink dark:text-white placeholder:text-ink-muted dark:placeholder:text-slate-500 focus:outline-none focus:border-accent dark:focus:border-[#38BDF8]"
                    placeholder="e.g. Acme Operations"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="signup-password"
                  className="block mb-1 text-xs font-semibold text-ink-muted dark:text-slate-400"
                >
                  Password <span className="text-ink-muted dark:text-slate-500 font-normal">(min 6 characters)</span>
                </label>
                <div className="relative">
                  <div className="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none text-ink-muted dark:text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="signup-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="pr-9 pl-9 w-full h-10 text-xs bg-white dark:bg-[#0B0F17] rounded border border-rule dark:border-[#1E293B] text-ink dark:text-white placeholder:text-ink-muted dark:placeholder:text-slate-500 focus:outline-none focus:border-accent dark:focus:border-[#38BDF8]"
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="flex absolute inset-y-0 right-0 items-center pr-3 text-ink-muted hover:text-ink dark:text-slate-400 dark:hover:text-white"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor="confirm-password"
                  className="block mb-1 text-xs font-semibold text-ink-muted dark:text-slate-400"
                >
                  Confirm password
                </label>
                <div className="relative">
                  <div className="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none text-ink-muted dark:text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="confirm-password"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-9 pl-9 w-full h-10 text-xs bg-white dark:bg-[#0B0F17] rounded border border-rule dark:border-[#1E293B] text-ink dark:text-white placeholder:text-ink-muted dark:placeholder:text-slate-500 focus:outline-none focus:border-accent dark:focus:border-[#38BDF8]"
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    className="flex absolute inset-y-0 right-0 items-center pr-3 text-ink-muted hover:text-ink dark:text-slate-400 dark:hover:text-white"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Real-time Password Requirements Checklist */}
              <div className="p-3 bg-paper dark:bg-[#0B0F17] rounded border border-rule dark:border-[#1E293B] text-xs space-y-1.5">
                <div className="flex items-center space-x-2">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      signupPassword.length >= 6 ? 'bg-ledger-green' : 'bg-rule-strong dark:bg-slate-600'
                    }`}
                  />
                  <span className={signupPassword.length >= 6 ? 'text-ink dark:text-white font-semibold' : 'text-ink-muted dark:text-slate-400'}>
                    At least 6 characters
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      confirmPassword && signupPassword === confirmPassword
                        ? 'bg-ledger-green'
                        : 'bg-rule-strong dark:bg-slate-600'
                    }`}
                  />
                  <span
                    className={
                      confirmPassword && signupPassword === confirmPassword
                        ? 'text-ink dark:text-white font-semibold'
                        : 'text-ink-muted dark:text-slate-400'
                    }
                  >
                    Passwords match
                  </span>
                </div>
              </div>

              {/* Privilege Scope Note */}
              <div className="p-2.5 bg-paper dark:bg-[#0B0F17] rounded border border-rule dark:border-[#1E293B] text-xs text-ink-muted dark:text-slate-400 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-ledger-green shrink-0" />
                <span>
                  New registrations receive the <strong className="text-ink dark:text-white font-semibold">Holder</strong> role for operating accounts.
                </span>
              </div>

              {/* Primary Sign Up Button */}
              <button
                type="submit"
                disabled={loading}
                className="flex justify-center items-center px-4 py-2 mt-2 w-full h-10 text-xs font-bold text-white rounded transition bg-accent dark:bg-[#0284C7] hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed pressable"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <span>Create account</span>
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Small Screen Footer */}
        <footer className="mt-8 text-center text-xs text-ink-muted dark:text-slate-500 lg:hidden">
          LedgerLine &copy; 2026 · Double-entry core banking engine
        </footer>
      </div>
    </div>
  );
}
