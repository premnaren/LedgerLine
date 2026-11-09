'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { setSession } from '@/lib/auth';
import CosmicPlanetarySystem from '@/components/CosmicPlanetarySystem';
import InteractiveLedgerNetwork, {
  InteractiveLedgerNetworkHandle,
} from '@/components/InteractiveLedgerNetwork';
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
  ShieldCheck,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const networkRef = useRef<InteractiveLedgerNetworkHandle | null>(null);

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
      className={`min-h-screen w-full relative overflow-x-hidden flex flex-col justify-between items-center transition-colors duration-700 select-none ${
        isDark ? 'dark bg-[#080712] text-[#F7F4FF]' : 'bg-[#F4F1FA] text-[#17142B]'
      }`}
    >
      {/* ============================================================ */}
      {/* LAYER 1 & 2: Full-Page Cinematic Cosmic Planet & Atmosphere   */}
      {/* ============================================================ */}
      <CosmicPlanetarySystem isDark={isDark} />

      {/* ============================================================ */}
      {/* LAYER 3: Full-Viewport Interactive Constellation Network     */}
      {/* ============================================================ */}
      <InteractiveLedgerNetwork ref={networkRef} isDark={isDark} />

      {/* ============================================================ */}
      {/* LAYER 4: Navigation Bar (Minimal Clean Inline Header)        */}
      {/* ============================================================ */}
      <header className="flex z-30 justify-between items-center px-6 sm:px-8 lg:px-10 pt-6 sm:pt-8 w-full max-w-7xl pointer-events-auto">
        {/* Left: Clean inline LedgerLine Brand without box or border */}
        <div className="flex items-center space-x-2.5">
          <Layers className="w-5 h-5 sm:w-6 sm:h-6 text-[#648EFF] dark:text-[#BD75E9]" />
          <span className="text-lg sm:text-xl font-bold tracking-tight text-[#17142B] dark:text-[#F7F4FF]">
            Ledger<span className="text-[#648EFF] dark:text-[#BD75E9]">Line</span>
          </span>
        </div>

        {/* Right: Clean Theme Toggle */}
        <div className="flex items-center">
          <ThemeToggle isDark={isDark} onToggle={handleToggleTheme} />
        </div>
      </header>

      {/* ============================================================ */}
      {/* LAYER 5: Left-Aligned Compact Authentication Card            */}
      {/* ============================================================ */}
      <main className="flex z-20 items-center justify-start w-full max-w-7xl px-6 sm:px-8 lg:px-12 py-6 sm:py-10 my-auto pointer-events-auto flex-1">
        {/* Compact Authentication Card */}
        <div
          className={`w-full max-w-[380px] sm:max-w-[395px] rounded-2xl p-5 sm:p-6 space-y-4 sm:space-y-4.5 transition-all duration-300 ${
            isDark
              ? 'bg-[#19172B]/85 backdrop-blur-2xl border border-[#34304D] shadow-2xl shadow-black/80 ring-1 ring-white/10'
              : 'bg-white/90 backdrop-blur-2xl border border-[#DED9EA] shadow-2xl shadow-[#8155D9]/15 ring-1 ring-black/5'
          }`}
          style={{
            boxShadow: isDark
              ? '0 24px 60px -12px rgba(8, 7, 18, 0.90), inset 0 1px 1px 0 rgba(255, 255, 255, 0.12), 0 0 35px -10px rgba(129, 85, 217, 0.20)'
              : '0 24px 60px -12px rgba(129, 85, 217, 0.15), inset 0 1px 1px 0 rgba(255, 255, 255, 0.9)',
          }}
        >
          {/* Card Title & Description */}
          <div className="space-y-0.5">
            <h2 className="text-lg sm:text-[22px] font-bold tracking-tight text-[#17142B] dark:text-[#F7F4FF]">
              {mode === 'signin' ? 'Sign in to LedgerLine' : 'Create operating account'}
            </h2>
            <p className="text-xs text-[#55516D] dark:text-[#C0BAD5] leading-normal">
              {mode === 'signin'
                ? 'Access your verified double-entry operating ledger.'
                : 'Register for a new operating account with personal ledger access.'}
            </p>
          </div>

          {/* Segmented Tab Switcher */}
          <div className="grid grid-cols-2 p-1 bg-[#F4F1FA] dark:bg-[#100D20]/90 rounded-xl border border-[#DED9EA] dark:border-[#221F38] text-xs">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signin'}
              onClick={() => {
                setMode('signin');
                setError(null);
              }}
              className={`py-1.5 text-xs rounded-lg transition-all duration-150 text-center font-semibold focus-visible:ring-2 focus-visible:ring-[#8155D9] ${
                mode === 'signin'
                  ? 'bg-white dark:bg-[#19172B] text-[#17142B] dark:text-[#F7F4FF] border border-[#DED9EA] dark:border-[#34304D] shadow-sm'
                  : 'text-[#77718C] dark:text-[#9189AA] hover:text-[#17142B] dark:hover:text-[#F7F4FF] font-medium'
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
              className={`py-1.5 text-xs rounded-lg transition-all duration-150 text-center font-semibold focus-visible:ring-2 focus-visible:ring-[#8155D9] ${
                mode === 'signup'
                  ? 'bg-white dark:bg-[#19172B] text-[#17142B] dark:text-[#F7F4FF] border border-[#DED9EA] dark:border-[#34304D] shadow-sm'
                  : 'text-[#77718C] dark:text-[#9189AA] hover:text-[#17142B] dark:hover:text-[#F7F4FF] font-medium'
              }`}
            >
              Create account
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div
              role="alert"
              className="flex items-start p-3 space-x-2 text-xs rounded-xl border bg-red-50 dark:bg-red-950/30 border-[#D14949] dark:border-[#F07886] text-[#D14949] dark:text-[#F07886]"
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

          {/* Password Recovery Notice */}
          {showForgotNotice && (
            <div className="flex items-start p-3 space-x-2 text-xs rounded-xl border bg-[#F6F3FC] dark:bg-[#100D20] border-[#DED9EA] dark:border-[#34304D] text-[#17142B] dark:text-[#F7F4FF]">
              <Info className="h-4 w-4 shrink-0 text-[#648EFF] dark:text-[#BD75E9] mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-xs">Password recovery</p>
                <p className="text-[#55516D] dark:text-[#C0BAD5] text-xs mt-0.5 leading-relaxed">
                  Managed by ledger security operations. For evaluation, use pre-configured demo credentials or contact admin@ledgerline.dev.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotNotice(false)}
                className="text-[#77718C] hover:text-[#17142B] dark:text-[#9189AA] dark:hover:text-white p-0.5"
                aria-label="Dismiss notice"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ============================================================ */}
          {/* SIGN IN FORM                                                 */}
          {/* ============================================================ */}
          {mode === 'signin' ? (
            <div className="space-y-4">
              <form className="space-y-3.5" onSubmit={handleSignIn} noValidate>
                {/* Email Address */}
                <div>
                  <label
                    htmlFor="signin-email"
                    className="block mb-1 text-xs font-semibold text-[#55516D] dark:text-[#C0BAD5]"
                  >
                    Email address
                  </label>
                  <div className="relative">
                    <div className="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none text-[#77718C] dark:text-[#9189AA]">
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
                      className="pr-3 pl-9 w-full h-[44px] text-sm bg-white dark:bg-[#100D20]/90 rounded-xl border border-[#DED9EA] dark:border-[#221F38] text-[#17142B] dark:text-[#F7F4FF] placeholder:text-[#94A3B8] dark:placeholder:text-[#77718C] focus:outline-none focus:border-[#8155D9] focus:ring-1 focus:ring-[#8155D9] transition"
                      placeholder="name@company.com"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label
                      htmlFor="signin-password"
                      className="block text-xs font-semibold text-[#55516D] dark:text-[#C0BAD5]"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgotNotice(true)}
                      className="text-xs text-[#648EFF] dark:text-[#BD75E9] hover:underline font-medium"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none text-[#77718C] dark:text-[#9189AA]">
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
                      className="pr-10 pl-9 w-full h-[44px] text-sm bg-white dark:bg-[#100D20]/90 rounded-xl border border-[#DED9EA] dark:border-[#221F38] text-[#17142B] dark:text-[#F7F4FF] placeholder:text-[#94A3B8] dark:placeholder:text-[#77718C] focus:outline-none focus:border-[#8155D9] focus:ring-1 focus:ring-[#8155D9] transition"
                      placeholder="••••••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="flex absolute inset-y-0 right-0 items-center pr-3 text-[#77718C] hover:text-[#17142B] dark:text-[#9189AA] dark:hover:text-[#F7F4FF]"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Primary Sign In Button with Cosmic Gradient */}
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex justify-center items-center px-4 mt-1.5 w-full h-[46px] text-sm font-bold text-white rounded-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-md active:scale-[0.985] focus-visible:ring-2 focus-visible:ring-[#8155D9] ${
                    isDark
                      ? 'bg-gradient-to-r from-[#8155D9] via-[#9266EA] to-[#648EFF] hover:opacity-95 shadow-[#8155D9]/30'
                      : 'bg-[#294B7A] hover:bg-[#1E375B] shadow-slate-900/10'
                  }`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 w-4 h-4 text-white animate-spin" />
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
              <div className="relative pt-0.5">
                <div className="flex absolute inset-0 items-center" aria-hidden="true">
                  <div className="w-full border-t border-[#DED9EA] dark:border-[#221F38]" />
                </div>
                <div className="flex relative justify-center text-xs">
                  <span className="bg-white dark:bg-[#19172B] px-2.5 text-xs text-[#77718C] dark:text-[#9189AA] font-semibold">
                    Demo accounts
                  </span>
                </div>
              </div>

              {/* Compact Demo Account Choices */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                {/* Admin Card */}
                <button
                  type="button"
                  onClick={() => handleQuickLogin('ADMIN', 'admin@ledgerline.dev', 'Admin1234!')}
                  className={`py-2 px-1.5 rounded-xl text-center border transition-all duration-150 active:scale-95 focus-visible:ring-2 focus-visible:ring-[#8155D9] ${
                    activeRole === 'ADMIN'
                      ? 'border-[#BD75E9] bg-[#8155D9]/20 dark:bg-[#BD75E9]/20 ring-1.5 ring-[#BD75E9] shadow-sm'
                      : 'border-[#DED9EA] dark:border-[#34304D] bg-white/60 dark:bg-[#100D20]/60 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                  aria-label="Select Admin demo role"
                >
                  <div className="flex items-center justify-center space-x-1 mb-0.5">
                    <span className="w-2 h-2 rounded-full bg-[#BD75E9] shrink-0" />
                    <span className="font-bold text-xs text-[#17142B] dark:text-[#F7F4FF]">
                      Admin
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-[#648EFF] dark:text-[#BD75E9] block leading-tight">
                    Superuser
                  </span>
                  <span className="text-[11px] text-[#55516D] dark:text-[#C0BAD5] block mt-0.5 leading-tight">
                    Full system
                  </span>
                </button>

                {/* Holder Card */}
                <button
                  type="button"
                  onClick={() => handleQuickLogin('HOLDER', 'holder@ledgerline.dev', 'Holder1234!')}
                  className={`py-2 px-1.5 rounded-xl text-center border transition-all duration-150 active:scale-95 focus-visible:ring-2 focus-visible:ring-[#8155D9] ${
                    activeRole === 'HOLDER'
                      ? 'border-[#BD75E9] bg-[#8155D9]/20 dark:bg-[#BD75E9]/20 ring-1.5 ring-[#BD75E9] shadow-sm'
                      : 'border-[#DED9EA] dark:border-[#34304D] bg-white/60 dark:bg-[#100D20]/60 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                  aria-label="Select Holder demo role"
                >
                  <div className="flex items-center justify-center space-x-1 mb-0.5">
                    <span className="w-2 h-2 rounded-full bg-[#648EFF] shrink-0" />
                    <span className="font-bold text-xs text-[#17142B] dark:text-[#F7F4FF]">
                      Holder
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-[#648EFF] dark:text-[#BD75E9] block leading-tight">
                    Account owner
                  </span>
                  <span className="text-[11px] text-[#55516D] dark:text-[#C0BAD5] block mt-0.5 leading-tight">
                    Transfers
                  </span>
                </button>

                {/* Auditor Card */}
                <button
                  type="button"
                  onClick={() => handleQuickLogin('AUDITOR', 'auditor@ledgerline.dev', 'Audit1234!')}
                  className={`py-2 px-1.5 rounded-xl text-center border transition-all duration-150 active:scale-95 focus-visible:ring-2 focus-visible:ring-[#8155D9] ${
                    activeRole === 'AUDITOR'
                      ? 'border-[#BD75E9] bg-[#8155D9]/20 dark:bg-[#BD75E9]/20 ring-1.5 ring-[#BD75E9] shadow-sm'
                      : 'border-[#DED9EA] dark:border-[#34304D] bg-white/60 dark:bg-[#100D20]/60 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                  aria-label="Select Auditor demo role"
                >
                  <div className="flex items-center justify-center space-x-1 mb-0.5">
                    <span className="w-2 h-2 rounded-full bg-[#F4B860] shrink-0" />
                    <span className="font-bold text-xs text-[#17142B] dark:text-[#F7F4FF]">
                      Auditor
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-[#648EFF] dark:text-[#BD75E9] block leading-tight">
                    Read-only
                  </span>
                  <span className="text-[11px] text-[#55516D] dark:text-[#C0BAD5] block mt-0.5 leading-tight">
                    Audit logs
                  </span>
                </button>
              </div>
            </div>
          ) : (
            /* ============================================================ */
            /* CREATE ACCOUNT FORM                                          */
            /* ============================================================ */
            <form className="space-y-3.5" onSubmit={handleSignUp} noValidate>
              {/* Email Address */}
              <div>
                <label
                  htmlFor="signup-email"
                  className="block mb-1 text-xs font-semibold text-[#55516D] dark:text-[#C0BAD5]"
                >
                  Email address
                </label>
                <div className="relative">
                  <div className="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none text-[#77718C] dark:text-[#9189AA]">
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
                    className="pr-3 pl-9 w-full h-[44px] text-sm bg-white dark:bg-[#100D20]/90 rounded-xl border border-[#DED9EA] dark:border-[#221F38] text-[#17142B] dark:text-[#F7F4FF] placeholder:text-[#94A3B8] dark:placeholder:text-[#77718C] focus:outline-none focus:border-[#8155D9] focus:ring-1 focus:ring-[#8155D9] transition"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              {/* Account Label */}
              <div>
                <label
                  htmlFor="account-name"
                  className="block mb-1 text-xs font-semibold text-[#55516D] dark:text-[#C0BAD5]"
                >
                  Account label <span className="text-[#77718C] dark:text-[#9189AA] font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <div className="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none text-[#77718C] dark:text-[#9189AA]">
                    <Building className="w-4 h-4" />
                  </div>
                  <input
                    id="account-name"
                    name="accountName"
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="pr-3 pl-9 w-full h-[44px] text-sm bg-white dark:bg-[#100D20]/90 rounded-xl border border-[#DED9EA] dark:border-[#221F38] text-[#17142B] dark:text-[#F7F4FF] placeholder:text-[#94A3B8] dark:placeholder:text-[#77718C] focus:outline-none focus:border-[#8155D9] focus:ring-1 focus:ring-[#8155D9] transition"
                    placeholder="e.g. Acme Operations"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="signup-password"
                  className="block mb-1 text-xs font-semibold text-[#55516D] dark:text-[#C0BAD5]"
                >
                  Password <span className="text-[#77718C] dark:text-[#9189AA] font-normal">(min 6 chars)</span>
                </label>
                <div className="relative">
                  <div className="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none text-[#77718C] dark:text-[#9189AA]">
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
                    className="pr-10 pl-9 w-full h-[44px] text-sm bg-white dark:bg-[#100D20]/90 rounded-xl border border-[#DED9EA] dark:border-[#221F38] text-[#17142B] dark:text-[#F7F4FF] placeholder:text-[#94A3B8] dark:placeholder:text-[#77718C] focus:outline-none focus:border-[#8155D9] focus:ring-1 focus:ring-[#8155D9] transition"
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="flex absolute inset-y-0 right-0 items-center pr-3 text-[#77718C] hover:text-[#17142B] dark:text-[#9189AA] dark:hover:text-[#F7F4FF]"
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
                  className="block mb-1 text-xs font-semibold text-[#55516D] dark:text-[#C0BAD5]"
                >
                  Confirm password
                </label>
                <div className="relative">
                  <div className="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none text-[#77718C] dark:text-[#9189AA]">
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
                    className="pr-10 pl-9 w-full h-[44px] text-sm bg-white dark:bg-[#100D20]/90 rounded-xl border border-[#DED9EA] dark:border-[#221F38] text-[#17142B] dark:text-[#F7F4FF] placeholder:text-[#94A3B8] dark:placeholder:text-[#77718C] focus:outline-none focus:border-[#8155D9] focus:ring-1 focus:ring-[#8155D9] transition"
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    className="flex absolute inset-y-0 right-0 items-center pr-3 text-[#77718C] hover:text-[#17142B] dark:text-[#9189AA] dark:hover:text-[#F7F4FF]"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Password Requirements Checklist */}
              <div className="p-2.5 bg-[#F4F1FA] dark:bg-[#100D20]/90 rounded-xl border border-[#DED9EA] dark:border-[#221F38] text-xs space-y-1">
                <div className="flex items-center space-x-2">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      signupPassword.length >= 6
                        ? 'bg-[#13835D] dark:bg-[#42D6B0]'
                        : 'bg-[#94A3B8] dark:text-[#77718C]'
                    }`}
                  />
                  <span
                    className={
                      signupPassword.length >= 6
                        ? 'text-[#17142B] dark:text-[#F7F4FF] font-semibold'
                        : 'text-[#77718C] dark:text-[#9189AA]'
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
                        : 'bg-[#94A3B8] dark:text-[#77718C]'
                    }`}
                  />
                  <span
                    className={
                      confirmPassword && signupPassword === confirmPassword
                        ? 'text-[#17142B] dark:text-[#F7F4FF] font-semibold'
                        : 'text-[#77718C] dark:text-[#9189AA]'
                    }
                  >
                    Passwords match
                  </span>
                </div>
              </div>

              {/* Privilege Scope Note */}
              <div className="p-2.5 bg-[#F4F1FA] dark:bg-[#100D20]/90 rounded-xl border border-[#DED9EA] dark:border-[#221F38] text-xs text-[#55516D] dark:text-[#C0BAD5] flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-[#13835D] dark:text-[#42D6B0] shrink-0" />
                <span>
                  New accounts receive the <strong className="text-[#17142B] dark:text-[#F7F4FF] font-semibold">Holder</strong> role.
                </span>
              </div>

              {/* Primary Sign Up Button */}
              <button
                type="submit"
                disabled={loading}
                className={`flex justify-center items-center px-4 mt-1.5 w-full h-[46px] text-sm font-bold text-white rounded-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-md active:scale-[0.985] focus-visible:ring-2 focus-visible:ring-[#8155D9] ${
                  isDark
                    ? 'bg-gradient-to-r from-[#8155D9] via-[#9266EA] to-[#648EFF] hover:opacity-95 shadow-[#8155D9]/30'
                    : 'bg-[#294B7A] hover:bg-[#1E375B] shadow-slate-900/10'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 text-white animate-spin" />
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
      </main>

      {/* ============================================================ */}
      {/* LAYER 6: Balanced Footer                                     */}
      {/* ============================================================ */}
      <footer className="w-full max-w-7xl px-6 sm:px-8 lg:px-12 py-5 sm:py-6 flex items-center justify-between text-xs text-[#55516D] dark:text-[#C0BAD5] z-30 pointer-events-auto">
        <div className="font-medium">
          LedgerLine &copy; 2026 &middot; Double-entry core engine
        </div>
      </footer>
    </div>
  );
}
