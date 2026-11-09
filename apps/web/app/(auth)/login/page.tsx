'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { setSession } from '@/lib/auth';
import InteractiveLedgerNetwork from '@/components/InteractiveLedgerNetwork';
import ThemeToggle from '@/components/ThemeToggle';
import { getTheme, setTheme, subscribeTheme, Theme } from '@/lib/theme';
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
  ShieldCheck,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [theme, setCurrentTheme] = useState<Theme>('dark');

  // Sync theme with global theme manager (default to Cosmic Dark)
  useEffect(() => {
    setCurrentTheme(getTheme());
    const unsub = subscribeTheme((newTheme) => {
      setCurrentTheme(newTheme);
    });
    return unsub;
  }, []);

  const handleToggleTheme = (isDark: boolean) => {
    setTheme(isDark ? 'dark' : 'light');
  };

  const isDark = theme === 'dark';

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
    <div
      className={`min-h-screen w-full flex flex-col lg:flex-row bg-[#F5F7FA] dark:bg-[#080E1C] text-[#0F172A] dark:text-[#F4F7FF] transition-colors duration-300 relative ${
        isDark ? 'dark' : ''
      }`}
    >
      {/* Floating Theme Switcher with Cosmic Lunar Halo */}
      <div className="fixed top-5 right-5 sm:top-6 sm:right-8 z-50">
        <div className="relative">
          {isDark && (
            <div className="absolute inset-0 rounded-full bg-[#79A9FF]/20 blur-md pointer-events-none animate-pulse" />
          )}
          <ThemeToggle isDark={isDark} onToggle={handleToggleTheme} />
        </div>
      </div>

      {/* ============================================================ */}
      {/* Left Column: Visual Interactive Ledger Network (Desktop 52%) */}
      {/* ============================================================ */}
      <div className="hidden lg:flex lg:w-[52%] xl:w-[50%] 2xl:w-[52%] relative bg-[#F0F3F7] dark:bg-[#080E1C] border-r border-[#DCE2E9] dark:border-[#263750] flex-col justify-between p-10 xl:p-14 overflow-hidden select-none transition-colors duration-300">
        {/* Interactive Connected-Node Constellation Canvas with Physics */}
        <InteractiveLedgerNetwork isDark={isDark} />

        {/* Top-Left Corner: Unified Brand Identity Badge */}
        <div className="relative z-20 pointer-events-auto select-none">
          <div className="inline-flex items-center space-x-3 px-3.5 py-2.5 rounded-2xl bg-white/85 dark:bg-[#0B1220]/85 backdrop-blur-md border border-[#DCE2E9] dark:border-[#263750] shadow-xs transition hover:border-[#79A9FF]/50">
            <div className="flex justify-center items-center w-8 h-8 rounded-xl bg-[#294B7A]/10 dark:bg-[#79A9FF]/15 text-[#294B7A] dark:text-[#79A9FF] shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-[#0F172A] dark:text-[#F4F7FF] leading-none block">
                Ledger<span className="text-[#294B7A] dark:text-[#79A9FF]">Line</span>
              </span>
              <span className="block text-[10px] font-mono text-[#64748B] dark:text-[#71819B] mt-0.5 leading-none">
                Double-entry core engine
              </span>
            </div>
          </div>
        </div>

        {/* Bottom-Left: Product Statement & Cosmic Tagline */}
        <div className="relative z-10 pt-16 pointer-events-none">
          <h1 className="text-3xl xl:text-4xl 2xl:text-5xl font-extrabold tracking-tight leading-tight transition">
            <span className="text-[#0F172A] dark:text-[#F4F7FF] block">Every transaction,</span>
            <span className="text-[#294B7A] dark:text-[#79A9FF] block">accounted for.</span>
          </h1>
          <p className="mt-2.5 text-xs xl:text-sm text-[#475569] dark:text-[#A5B4CC] max-w-md leading-relaxed">
            An interconnected universe of verifiable financial records.
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/* Right Column: Clean, Prominent Auth Form (Desktop 48%)       */}
      {/* ============================================================ */}
      <div className="w-full lg:w-[48%] xl:w-[50%] 2xl:w-[48%] flex flex-col justify-center items-center p-6 sm:p-10 lg:p-12 xl:p-16 min-h-screen bg-[#F5F7FA] dark:bg-[#080E1C] transition-colors duration-300">
        {/* Mobile Brand Header (Visible only on smaller screens) */}
        <div className="lg:hidden w-full max-w-[480px] flex items-center justify-between mb-6 pb-4 border-b border-[#DCE2E9] dark:border-[#263750]">
          <div className="flex items-center space-x-2.5">
            <div className="flex justify-center items-center w-8 h-8 bg-white dark:bg-[#0B1220] rounded-xl border border-[#DCE2E9] dark:border-[#263750] text-[#294B7A] dark:text-[#79A9FF]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-[#0F172A] dark:text-[#F4F7FF]">
                Ledger<span className="text-[#294B7A] dark:text-[#79A9FF]">Line</span>
              </span>
              <span className="block text-xs text-[#64748B] dark:text-[#71819B]">
                Double-entry core ledger
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 text-xs text-[#13835D] dark:text-[#42D6B0] bg-white dark:bg-[#0B1220] px-2.5 py-1 rounded-full border border-[#DCE2E9] dark:border-[#263750]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#13835D] dark:bg-[#42D6B0] animate-pulse" />
            <span className="font-semibold text-[11px]">Core Active</span>
          </div>
        </div>

        {/* Prominent Auth Card */}
        <div className="w-full max-w-[480px] bg-white dark:bg-[#17243A] rounded-2xl border border-[#DCE2E9] dark:border-[#263750] p-7 sm:p-9 space-y-6 shadow-2xl shadow-black/25 dark:shadow-black/50 transition">
          {/* Form Header */}
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A] dark:text-[#F4F7FF]">
              {mode === 'signin' ? 'Sign in to LedgerLine' : 'Create your account'}
            </h2>
            <p className="text-xs sm:text-sm text-[#475569] dark:text-[#A5B4CC] leading-relaxed">
              {mode === 'signin'
                ? 'Access your verified double-entry operating ledger.'
                : 'Register for a new operating account with personal ledger access.'}
            </p>
          </div>

          {/* Segmented Tab Switcher */}
          <div className="grid grid-cols-2 p-1 bg-[#F0F3F7] dark:bg-[#111C30] rounded-xl border border-[#DCE2E9] dark:border-[#1D2A40] text-xs">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signin'}
              onClick={() => {
                setMode('signin');
                setError(null);
              }}
              className={`py-2.5 text-xs rounded-lg transition-all duration-150 text-center font-semibold focus-visible:ring-2 focus-visible:ring-[#79A9FF] ${
                mode === 'signin'
                  ? 'bg-white dark:bg-[#17243A] text-[#0F172A] dark:text-[#F4F7FF] border border-[#DCE2E9] dark:border-[#263750] shadow-sm'
                  : 'text-[#64748B] dark:text-[#A5B4CC] hover:text-[#0F172A] dark:hover:text-[#F4F7FF] font-medium'
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
              className={`py-2.5 text-xs rounded-lg transition-all duration-150 text-center font-semibold focus-visible:ring-2 focus-visible:ring-[#79A9FF] ${
                mode === 'signup'
                  ? 'bg-white dark:bg-[#17243A] text-[#0F172A] dark:text-[#F4F7FF] border border-[#DCE2E9] dark:border-[#263750] shadow-sm'
                  : 'text-[#64748B] dark:text-[#A5B4CC] hover:text-[#0F172A] dark:hover:text-[#F4F7FF] font-medium'
              }`}
            >
              Create account
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div
              role="alert"
              className="flex items-start p-3.5 space-x-2.5 text-xs rounded-xl border bg-red-50 dark:bg-red-950/30 border-[#D14949] dark:border-[#F07886] text-[#D14949] dark:text-[#F07886]"
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
            <div className="flex items-start p-3.5 space-x-2.5 text-xs rounded-xl border bg-[#F0F3F7] dark:bg-[#111C30] border-[#DCE2E9] dark:border-[#263750] text-[#0F172A] dark:text-[#F4F7FF]">
              <Info className="h-4 w-4 shrink-0 text-[#294B7A] dark:text-[#79A9FF] mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-xs">Password recovery</p>
                <p className="text-[#64748B] dark:text-[#A5B4CC] text-xs mt-0.5 leading-relaxed">
                  Managed by ledger security operations. For evaluation, use pre-configured demo credentials or contact admin@ledgerline.dev.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotNotice(false)}
                className="text-[#64748B] hover:text-[#0F172A] dark:text-[#A5B4CC] dark:hover:text-white p-0.5"
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
                    className="block mb-1.5 text-xs font-semibold text-[#475569] dark:text-[#A5B4CC]"
                  >
                    Email address
                  </label>
                  <div className="relative">
                    <div className="flex absolute inset-y-0 left-0 items-center pl-3.5 pointer-events-none text-[#64748B] dark:text-[#71819B]">
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
                      className="pr-3.5 pl-10 w-full h-[46px] text-xs sm:text-sm bg-white dark:bg-[#111C30] rounded-xl border border-[#DCE2E9] dark:border-[#1D2A40] text-[#0F172A] dark:text-[#F4F7FF] placeholder:text-[#94A3B8] dark:placeholder:text-[#71819B] focus:outline-none focus:border-[#79A9FF] focus:ring-1 focus:ring-[#79A9FF] transition"
                      placeholder="name@company.com"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label
                      htmlFor="signin-password"
                      className="block text-xs font-semibold text-[#475569] dark:text-[#A5B4CC]"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgotNotice(true)}
                      className="text-xs text-[#294B7A] dark:text-[#79A9FF] hover:underline font-medium"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="flex absolute inset-y-0 left-0 items-center pl-3.5 pointer-events-none text-[#64748B] dark:text-[#71819B]">
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
                      className="pr-10 pl-10 w-full h-[46px] text-xs sm:text-sm bg-white dark:bg-[#111C30] rounded-xl border border-[#DCE2E9] dark:border-[#1D2A40] text-[#0F172A] dark:text-[#F4F7FF] placeholder:text-[#94A3B8] dark:placeholder:text-[#71819B] focus:outline-none focus:border-[#79A9FF] focus:ring-1 focus:ring-[#79A9FF] transition"
                      placeholder="••••••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="flex absolute inset-y-0 right-0 items-center pr-3.5 text-[#64748B] hover:text-[#0F172A] dark:text-[#71819B] dark:hover:text-[#F4F7FF]"
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
                  className="flex justify-center items-center px-4 mt-2 w-full h-[46px] text-xs sm:text-sm font-bold text-white dark:text-[#080E1C] rounded-xl transition-all duration-150 bg-[#294B7A] dark:bg-[#79A9FF] hover:bg-[#203D65] dark:hover:bg-[#91B8FF] disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-[0.985] focus-visible:ring-2 focus-visible:ring-[#79A9FF]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin text-white dark:text-[#080E1C]" />
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
              <div className="relative pt-2">
                <div className="flex absolute inset-0 items-center" aria-hidden="true">
                  <div className="w-full border-t border-[#DCE2E9] dark:border-[#263750]" />
                </div>
                <div className="flex relative justify-center text-xs">
                  <span className="bg-white dark:bg-[#17243A] px-2.5 text-xs text-[#64748B] dark:text-[#A5B4CC] font-medium">
                    Demo accounts
                  </span>
                </div>
              </div>

              {/* Demo Account Cards */}
              <div className="grid grid-cols-3 gap-2.5">
                {/* Admin Card */}
                <button
                  type="button"
                  onClick={() => handleQuickLogin('ADMIN', 'admin@ledgerline.dev', 'Admin1234!')}
                  className={`py-2.5 px-2 rounded-xl text-left border transition-all duration-150 active:scale-95 focus-visible:ring-2 focus-visible:ring-[#79A9FF] ${
                    activeRole === 'ADMIN'
                      ? 'border-[#79A9FF] bg-[#F0F3F7] dark:bg-[#111C30] ring-1 ring-[#79A9FF]/60 shadow-sm'
                      : 'border-[#DCE2E9] dark:border-[#1D2A40] bg-white dark:bg-[#17243A] hover:bg-[#F0F3F7] dark:hover:bg-[#111C30]'
                  }`}
                  aria-label="Select Admin demo role"
                >
                  <div className="flex items-center space-x-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full bg-[#7C3AED] dark:bg-[#A78BFA] shrink-0" />
                    <span className="font-bold text-xs text-[#0F172A] dark:text-[#F4F7FF]">Admin</span>
                  </div>
                  <span className="text-[11px] font-medium text-[#294B7A] dark:text-[#79A9FF] block">
                    Superuser
                  </span>
                  <span className="text-[10px] text-[#64748B] dark:text-[#71819B] block mt-0.5 truncate">
                    Full system access
                  </span>
                </button>

                {/* Holder Card */}
                <button
                  type="button"
                  onClick={() => handleQuickLogin('HOLDER', 'holder@ledgerline.dev', 'Holder1234!')}
                  className={`py-2.5 px-2 rounded-xl text-left border transition-all duration-150 active:scale-95 focus-visible:ring-2 focus-visible:ring-[#79A9FF] ${
                    activeRole === 'HOLDER'
                      ? 'border-[#79A9FF] bg-[#F0F3F7] dark:bg-[#111C30] ring-1 ring-[#79A9FF]/60 shadow-sm'
                      : 'border-[#DCE2E9] dark:border-[#1D2A40] bg-white dark:bg-[#17243A] hover:bg-[#F0F3F7] dark:hover:bg-[#111C30]'
                  }`}
                  aria-label="Select Holder demo role"
                >
                  <div className="flex items-center space-x-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full bg-[#294B7A] dark:bg-[#79A9FF] shrink-0" />
                    <span className="font-bold text-xs text-[#0F172A] dark:text-[#F4F7FF]">Holder</span>
                  </div>
                  <span className="text-[11px] font-medium text-[#294B7A] dark:text-[#79A9FF] block">
                    Account owner
                  </span>
                  <span className="text-[10px] text-[#64748B] dark:text-[#71819B] block mt-0.5 truncate">
                    Transfers & ledger
                  </span>
                </button>

                {/* Auditor Card */}
                <button
                  type="button"
                  onClick={() => handleQuickLogin('AUDITOR', 'auditor@ledgerline.dev', 'Audit1234!')}
                  className={`py-2.5 px-2 rounded-xl text-left border transition-all duration-150 active:scale-95 focus-visible:ring-2 focus-visible:ring-[#79A9FF] ${
                    activeRole === 'AUDITOR'
                      ? 'border-[#79A9FF] bg-[#F0F3F7] dark:bg-[#111C30] ring-1 ring-[#79A9FF]/60 shadow-sm'
                      : 'border-[#DCE2E9] dark:border-[#1D2A40] bg-white dark:bg-[#17243A] hover:bg-[#F0F3F7] dark:hover:bg-[#111C30]'
                  }`}
                  aria-label="Select Auditor demo role"
                >
                  <div className="flex items-center space-x-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full bg-[#B7791F] dark:bg-[#F4B860] shrink-0" />
                    <span className="font-bold text-xs text-[#0F172A] dark:text-[#F4F7FF]">Auditor</span>
                  </div>
                  <span className="text-[11px] font-medium text-[#294B7A] dark:text-[#79A9FF] block">
                    Read-only
                  </span>
                  <span className="text-[10px] text-[#64748B] dark:text-[#71819B] block mt-0.5 truncate">
                    Audit trails & logs
                  </span>
                </button>
              </div>

              {/* Explanatory Demo Scope Note */}
              <p className="text-[11px] text-[#64748B] dark:text-[#71819B] text-center leading-relaxed">
                Selecting a demo role populates valid credentials. Real authorization is cryptographically verified and enforced by the core backend.
              </p>
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
                  className="block mb-1.5 text-xs font-semibold text-[#475569] dark:text-[#A5B4CC]"
                >
                  Email address
                </label>
                <div className="relative">
                  <div className="flex absolute inset-y-0 left-0 items-center pl-3.5 pointer-events-none text-[#64748B] dark:text-[#71819B]">
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
                    className="pr-3.5 pl-10 w-full h-[46px] text-xs sm:text-sm bg-white dark:bg-[#111C30] rounded-xl border border-[#DCE2E9] dark:border-[#1D2A40] text-[#0F172A] dark:text-[#F4F7FF] placeholder:text-[#94A3B8] dark:placeholder:text-[#71819B] focus:outline-none focus:border-[#79A9FF] focus:ring-1 focus:ring-[#79A9FF] transition"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              {/* Account Label */}
              <div>
                <label
                  htmlFor="account-name"
                  className="block mb-1.5 text-xs font-semibold text-[#475569] dark:text-[#A5B4CC]"
                >
                  Account label <span className="text-[#64748B] dark:text-[#71819B] font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <div className="flex absolute inset-y-0 left-0 items-center pl-3.5 pointer-events-none text-[#64748B] dark:text-[#71819B]">
                    <Building className="w-4 h-4" />
                  </div>
                  <input
                    id="account-name"
                    name="accountName"
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="pr-3.5 pl-10 w-full h-[46px] text-xs sm:text-sm bg-white dark:bg-[#111C30] rounded-xl border border-[#DCE2E9] dark:border-[#1D2A40] text-[#0F172A] dark:text-[#F4F7FF] placeholder:text-[#94A3B8] dark:placeholder:text-[#71819B] focus:outline-none focus:border-[#79A9FF] focus:ring-1 focus:ring-[#79A9FF] transition"
                    placeholder="e.g. Acme Operations"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="signup-password"
                  className="block mb-1.5 text-xs font-semibold text-[#475569] dark:text-[#A5B4CC]"
                >
                  Password <span className="text-[#64748B] dark:text-[#71819B] font-normal">(min 6 characters)</span>
                </label>
                <div className="relative">
                  <div className="flex absolute inset-y-0 left-0 items-center pl-3.5 pointer-events-none text-[#64748B] dark:text-[#71819B]">
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
                    className="pr-10 pl-10 w-full h-[46px] text-xs sm:text-sm bg-white dark:bg-[#111C30] rounded-xl border border-[#DCE2E9] dark:border-[#1D2A40] text-[#0F172A] dark:text-[#F4F7FF] placeholder:text-[#94A3B8] dark:placeholder:text-[#71819B] focus:outline-none focus:border-[#79A9FF] focus:ring-1 focus:ring-[#79A9FF] transition"
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="flex absolute inset-y-0 right-0 items-center pr-3.5 text-[#64748B] hover:text-[#0F172A] dark:text-[#71819B] dark:hover:text-[#F4F7FF]"
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
                  className="block mb-1.5 text-xs font-semibold text-[#475569] dark:text-[#A5B4CC]"
                >
                  Confirm password
                </label>
                <div className="relative">
                  <div className="flex absolute inset-y-0 left-0 items-center pl-3.5 pointer-events-none text-[#64748B] dark:text-[#71819B]">
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
                    className="pr-10 pl-10 w-full h-[46px] text-xs sm:text-sm bg-white dark:bg-[#111C30] rounded-xl border border-[#DCE2E9] dark:border-[#1D2A40] text-[#0F172A] dark:text-[#F4F7FF] placeholder:text-[#94A3B8] dark:placeholder:text-[#71819B] focus:outline-none focus:border-[#79A9FF] focus:ring-1 focus:ring-[#79A9FF] transition"
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    className="flex absolute inset-y-0 right-0 items-center pr-3.5 text-[#64748B] hover:text-[#0F172A] dark:text-[#71819B] dark:hover:text-[#F4F7FF]"
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
              <div className="p-3 bg-[#F0F3F7] dark:bg-[#111C30] rounded-xl border border-[#DCE2E9] dark:border-[#1D2A40] text-xs space-y-1.5">
                <div className="flex items-center space-x-2">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      signupPassword.length >= 6
                        ? 'bg-[#13835D] dark:bg-[#42D6B0]'
                        : 'bg-[#94A3B8] dark:bg-[#71819B]'
                    }`}
                  />
                  <span
                    className={
                      signupPassword.length >= 6
                        ? 'text-[#0F172A] dark:text-[#F4F7FF] font-semibold'
                        : 'text-[#64748B] dark:text-[#71819B]'
                    }
                  >
                    At least 6 characters
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      confirmPassword && signupPassword === confirmPassword
                        ? 'bg-[#13835D] dark:bg-[#42D6B0]'
                        : 'bg-[#94A3B8] dark:bg-[#71819B]'
                    }`}
                  />
                  <span
                    className={
                      confirmPassword && signupPassword === confirmPassword
                        ? 'text-[#0F172A] dark:text-[#F4F7FF] font-semibold'
                        : 'text-[#64748B] dark:text-[#71819B]'
                    }
                  >
                    Passwords match
                  </span>
                </div>
              </div>

              {/* Privilege Scope Note */}
              <div className="p-3 bg-[#F0F3F7] dark:bg-[#111C30] rounded-xl border border-[#DCE2E9] dark:border-[#1D2A40] text-xs text-[#64748B] dark:text-[#A5B4CC] flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-[#13835D] dark:text-[#42D6B0] shrink-0" />
                <span>
                  New registrations automatically receive the <strong className="text-[#0F172A] dark:text-[#F4F7FF] font-semibold">Holder</strong> role for operating accounts.
                </span>
              </div>

              {/* Primary Sign Up Button */}
              <button
                type="submit"
                disabled={loading}
                className="flex justify-center items-center px-4 mt-2 w-full h-[46px] text-xs sm:text-sm font-bold text-white dark:text-[#080E1C] rounded-xl transition-all duration-150 bg-[#294B7A] dark:bg-[#79A9FF] hover:bg-[#203D65] dark:hover:bg-[#91B8FF] disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-[0.985] focus-visible:ring-2 focus-visible:ring-[#79A9FF]"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin text-white dark:text-[#080E1C]" />
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
        <footer className="mt-8 text-center text-xs text-[#64748B] dark:text-[#71819B] lg:hidden">
          LedgerLine &copy; 2026 &middot; Double-entry core banking engine
        </footer>
      </div>
    </div>
  );
}
