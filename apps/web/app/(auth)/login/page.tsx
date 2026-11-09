'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setSession } from '@/lib/auth';
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
  Building,
  CheckCircle2,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

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
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-paper text-ink">
      {/* ============================================================ */}
      {/* Left Column: Quiet Brand Panel (Desktop Only)                 */}
      {/* ============================================================ */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-5/12 2xl:w-1/2 relative bg-[#F5F4F0] border-r border-rule flex-col justify-between p-10 xl:p-14 overflow-hidden select-none">
        {/* Low-Contrast Ledger Paper Grid Pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            backgroundImage: `
              linear-gradient(to right, var(--rule) 1px, transparent 1px),
              linear-gradient(to bottom, var(--rule) 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px',
          }}
          aria-hidden="true"
        />

        {/* Ambient Gradient Drift (Subtle motion, respects reduced-motion) */}
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-accent/5 blur-3xl pointer-events-none animate-subtle-drift"
          aria-hidden="true"
        />

        {/* Faint Connected Account Nodes & Hash-Chain Drawing */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30" aria-hidden="true">
          <svg
            className="w-[500px] h-[500px] text-accent stroke-current"
            viewBox="0 0 500 500"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Fine coordinate axes */}
            <line x1="50" y1="250" x2="450" y2="250" strokeDasharray="3 3" strokeWidth="1" opacity="0.6" />
            <line x1="250" y1="50" x2="250" y2="450" strokeDasharray="3 3" strokeWidth="1" opacity="0.6" />

            {/* Account Node Links */}
            <path
              className="animate-node-draw"
              d="M 110 180 L 250 130 L 390 210 L 310 360 L 150 330 Z"
              strokeWidth="1.2"
              strokeDasharray="4 4"
            />
            <path
              className="animate-node-draw"
              d="M 110 180 L 310 360"
              strokeWidth="1"
              opacity="0.7"
            />
            <path
              className="animate-node-draw"
              d="M 250 130 L 150 330"
              strokeWidth="1"
              opacity="0.7"
            />

            {/* Circular Nodes */}
            <circle cx="110" cy="180" r="4.5" fill="var(--accent)" />
            <circle cx="250" cy="130" r="5" fill="var(--ledger-green)" />
            <circle cx="390" cy="210" r="4.5" fill="var(--accent)" />
            <circle cx="310" cy="360" r="4.5" fill="var(--role-admin)" />
            <circle cx="150" cy="330" r="4.5" fill="var(--accent)" />
            <circle cx="250" cy="250" r="6" fill="#ffffff" stroke="var(--accent)" strokeWidth="2" />
          </svg>
        </div>

        {/* Top: Brand Identity */}
        <div className="relative z-10 flex items-center space-x-3">
          <div className="flex justify-center items-center w-9 h-9 bg-white rounded border border-rule text-accent shadow-none">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-ink">
              Ledger<span className="text-accent">Line</span>
            </span>
            <span className="block text-xs font-mono text-ink-muted">
              Double-entry core engine
            </span>
          </div>
        </div>

        {/* Center: Headline & Value Proposition */}
        <div className="relative z-10 max-w-lg space-y-6 my-auto py-12">
          <div className="inline-flex items-center space-x-2 text-xs font-mono px-2.5 py-1 rounded bg-white text-ink-muted border border-rule">
            <span className="w-1.5 h-1.5 rounded-full bg-ledger-green" />
            <span>PostgreSQL Serializable SSI</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-ink leading-tight">
              Every transaction,<br />
              <span className="text-accent">accounted for.</span>
            </h1>
            <p className="text-sm text-ink-muted leading-relaxed font-normal">
              Secure, auditable double-entry bookkeeping with cryptographic verification,
              real-time balance conservation, and append-only ledger integrity.
            </p>
          </div>

          {/* Quiet Running-Balance Specimen Card */}
          <div className="p-4 bg-white/90 backdrop-blur-xs rounded border border-rule space-y-2.5 max-w-sm text-xs shadow-none">
            <div className="flex items-center justify-between pb-2 border-b border-rule">
              <span className="font-semibold text-ink flex items-center space-x-1.5">
                <ShieldCheck className="h-4 w-4 text-ledger-green" />
                <span>Conservation Invariant</span>
              </span>
              <span className="mono-num font-mono text-xs text-ledger-green font-bold">
                ΔΣ = 0
              </span>
            </div>
            <div className="space-y-1.5 font-mono text-xs text-ink-muted">
              <div className="flex justify-between">
                <span>Debit Asset (Operating):</span>
                <span className="text-ink font-semibold mono-num">−₹500.00</span>
              </div>
              <div className="flex justify-between">
                <span>Credit Dest (Settlement):</span>
                <span className="text-ledger-green font-semibold mono-num">+₹500.00</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-rule text-ink-muted text-xs">
                <span>Cryptographic seal:</span>
                <span className="text-accent font-semibold">SHA-256 SEALED</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Regulatory & Architecture Seal */}
        <div className="relative z-10 pt-6 border-t border-rule/70 flex items-center justify-between text-xs text-ink-muted">
          <span>ACID Serializable · Append-Only Core</span>
          <span className="font-mono">FIPS 180-4 Seal</span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* Right Column: Clean, Prominent Auth Form                      */}
      {/* ============================================================ */}
      <div className="w-full lg:w-1/2 xl:w-7/12 2xl:w-1/2 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-12 xl:p-16 min-h-screen bg-paper">
        {/* Mobile Brand Header (Visible only on smaller screens) */}
        <div className="lg:hidden w-full max-w-[460px] flex items-center justify-between mb-6 pb-4 border-b border-rule">
          <div className="flex items-center space-x-2.5">
            <div className="flex justify-center items-center w-8 h-8 bg-white rounded border border-rule text-accent">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-ink">
                Ledger<span className="text-accent">Line</span>
              </span>
              <span className="block text-xs text-ink-muted">
                Double-entry core ledger
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 text-xs text-ledger-green bg-white px-2.5 py-1 rounded border border-rule">
            <span className="w-1.5 h-1.5 rounded-full bg-ledger-green" />
            <span className="font-medium">Active</span>
          </div>
        </div>

        {/* Prominent Auth Card */}
        <div className="w-full max-w-[460px] bg-white rounded border border-rule p-7 sm:p-8 space-y-5 shadow-none">
          {/* Form Header */}
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-ink">
              {mode === 'signin' ? 'Sign in to LedgerLine' : 'Create your account'}
            </h2>
            <p className="text-xs text-ink-muted leading-relaxed">
              {mode === 'signin'
                ? 'Access your verified double-entry operating ledger.'
                : 'Register for a new operating account with personal ledger access.'}
            </p>
          </div>

          {/* Segmented Tab Switcher */}
          <div className="grid grid-cols-2 p-1 bg-paper rounded border border-rule text-xs">
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
                  ? 'bg-white text-ink border border-rule shadow-none'
                  : 'text-ink-muted hover:text-ink font-medium'
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
                  ? 'bg-white text-ink border border-rule shadow-none'
                  : 'text-ink-muted hover:text-ink font-medium'
              }`}
            >
              Create account
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div
              role="alert"
              className="flex items-start p-3.5 space-x-2.5 text-xs rounded border bg-paper border-ledger-red text-ledger-red"
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
            <div className="flex items-start p-3.5 space-x-2.5 text-xs rounded border bg-paper border-rule text-ink">
              <Info className="h-4 w-4 shrink-0 text-accent mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-xs">Password recovery</p>
                <p className="text-ink-muted text-xs mt-0.5 leading-relaxed">
                  Managed by security operations. For evaluation, use pre-configured demo credentials or contact admin@ledgerline.dev.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotNotice(false)}
                className="text-ink-muted hover:text-ink p-0.5"
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
                    className="block mb-1 text-xs font-semibold text-ink-muted"
                  >
                    Email address
                  </label>
                  <div className="relative">
                    <div className="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none text-ink-muted">
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
                      className="pr-3 pl-9 w-full h-10 text-xs bg-white rounded border mono-num border-rule text-ink placeholder:text-ink-muted focus:outline-none focus:border-accent"
                      placeholder="name@company.com"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label
                      htmlFor="signin-password"
                      className="block text-xs font-semibold text-ink-muted"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgotNotice(true)}
                      className="text-xs text-accent hover:underline font-medium"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none text-ink-muted">
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
                      className="pr-9 pl-9 w-full h-10 text-xs bg-white rounded border border-rule text-ink placeholder:text-ink-muted focus:outline-none focus:border-accent"
                      placeholder="••••••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="flex absolute inset-y-0 right-0 items-center pr-3 text-ink-muted hover:text-ink"
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
                  className="flex justify-center items-center px-4 py-2 mt-2 w-full h-10 text-xs font-bold text-white rounded transition bg-accent hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed pressable"
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
              <div className="relative pt-2">
                <div className="flex absolute inset-0 items-center" aria-hidden="true">
                  <div className="w-full border-t border-rule" />
                </div>
                <div className="flex relative justify-center text-xs">
                  <span className="bg-white px-2.5 text-xs text-ink-muted font-medium">
                    Pre-configured demo accounts for evaluation
                  </span>
                </div>
              </div>

              {/* Demo Role Clarification Subtext */}
              <p className="text-xs text-ink-muted text-center leading-relaxed">
                Selecting an account loads test credentials. Permissions are authenticated and enforced server-side upon sign-in.
              </p>

              {/* Demo Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('ADMIN', 'admin@ledgerline.dev', 'Admin1234!')}
                  className={`py-2 px-1.5 rounded text-center border transition pressable text-xs ${
                    activeRole === 'ADMIN'
                      ? 'border-accent bg-paper font-semibold text-ink ring-1 ring-accent'
                      : 'border-rule hover:bg-paper text-ink'
                  }`}
                  aria-label="Load Admin demo credentials"
                >
                  <div className="flex items-center justify-center space-x-1 mb-0.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--role-admin)' }} />
                    <span className="font-semibold text-ink text-xs">Admin</span>
                  </div>
                  <span className="text-xs text-ink-muted block truncate">Superuser</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('HOLDER', 'holder@ledgerline.dev', 'Holder1234!')}
                  className={`py-2 px-1.5 rounded text-center border transition pressable text-xs ${
                    activeRole === 'HOLDER'
                      ? 'border-accent bg-paper font-semibold text-ink ring-1 ring-accent'
                      : 'border-rule hover:bg-paper text-ink'
                  }`}
                  aria-label="Load Holder demo credentials"
                >
                  <div className="flex items-center justify-center space-x-1 mb-0.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--role-holder)' }} />
                    <span className="font-semibold text-ink text-xs">Holder</span>
                  </div>
                  <span className="text-xs text-ink-muted block truncate">Account owner</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('AUDITOR', 'auditor@ledgerline.dev', 'Audit1234!')}
                  className={`py-2 px-1.5 rounded text-center border transition pressable text-xs ${
                    activeRole === 'AUDITOR'
                      ? 'border-accent bg-paper font-semibold text-ink ring-1 ring-accent'
                      : 'border-rule hover:bg-paper text-ink'
                  }`}
                  aria-label="Load Auditor demo credentials"
                >
                  <div className="flex items-center justify-center space-x-1 mb-0.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--role-auditor)' }} />
                    <span className="font-semibold text-ink text-xs">Auditor</span>
                  </div>
                  <span className="text-xs text-ink-muted block truncate">Read-only</span>
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
                  className="block mb-1 text-xs font-semibold text-ink-muted"
                >
                  Email address
                </label>
                <div className="relative">
                  <div className="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none text-ink-muted">
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
                    className="pr-3 pl-9 w-full h-10 text-xs bg-white rounded border mono-num border-rule text-ink placeholder:text-ink-muted focus:outline-none focus:border-accent"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              {/* Account Name */}
              <div>
                <label
                  htmlFor="account-name"
                  className="block mb-1 text-xs font-semibold text-ink-muted"
                >
                  Account label <span className="text-ink-muted font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <div className="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none text-ink-muted">
                    <Building className="w-4 h-4" />
                  </div>
                  <input
                    id="account-name"
                    name="accountName"
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="pr-3 pl-9 w-full h-10 text-xs bg-white rounded border border-rule text-ink placeholder:text-ink-muted focus:outline-none focus:border-accent"
                    placeholder="e.g. Acme Operations"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="signup-password"
                  className="block mb-1 text-xs font-semibold text-ink-muted"
                >
                  Password <span className="text-ink-muted font-normal">(min 6 characters)</span>
                </label>
                <div className="relative">
                  <div className="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none text-ink-muted">
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
                    className="pr-9 pl-9 w-full h-10 text-xs bg-white rounded border border-rule text-ink placeholder:text-ink-muted focus:outline-none focus:border-accent"
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="flex absolute inset-y-0 right-0 items-center pr-3 text-ink-muted hover:text-ink"
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
                  className="block mb-1 text-xs font-semibold text-ink-muted"
                >
                  Confirm password
                </label>
                <div className="relative">
                  <div className="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none text-ink-muted">
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
                    className="pr-9 pl-9 w-full h-10 text-xs bg-white rounded border border-rule text-ink placeholder:text-ink-muted focus:outline-none focus:border-accent"
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    className="flex absolute inset-y-0 right-0 items-center pr-3 text-ink-muted hover:text-ink"
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
              <div className="p-3 bg-paper rounded border border-rule text-xs space-y-1.5">
                <div className="flex items-center space-x-2">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      signupPassword.length >= 6 ? 'bg-ledger-green' : 'bg-rule-strong'
                    }`}
                  />
                  <span className={signupPassword.length >= 6 ? 'text-ink font-semibold' : 'text-ink-muted'}>
                    At least 6 characters
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      confirmPassword && signupPassword === confirmPassword
                        ? 'bg-ledger-green'
                        : 'bg-rule-strong'
                    }`}
                  />
                  <span
                    className={
                      confirmPassword && signupPassword === confirmPassword
                        ? 'text-ink font-semibold'
                        : 'text-ink-muted'
                    }
                  >
                    Passwords match
                  </span>
                </div>
              </div>

              {/* Privilege & Permission Scope Explanation */}
              <div className="p-3 bg-paper rounded border border-rule text-xs text-ink-muted flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-ledger-green shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span>
                    New accounts are registered with the <strong className="text-ink font-semibold">Holder</strong> role. This provisions your own operating account, personal statement generation, and internal double-entry transfers.
                  </span>
                  <span className="block mt-1 text-ink-muted">
                    Administrative and Auditor privileges require organization credential elevation.
                  </span>
                </div>
              </div>

              {/* Primary Sign Up Button */}
              <button
                type="submit"
                disabled={loading}
                className="flex justify-center items-center px-4 py-2 mt-2 w-full h-10 text-xs font-bold text-white rounded transition bg-accent hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed pressable"
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

          {/* Card Footer Security Seal */}
          <div className="pt-2 border-t border-rule flex items-center justify-center space-x-1.5 text-xs text-ink-muted">
            <ShieldCheck className="h-4 w-4 text-ledger-green" />
            <span>Serializable ACID · SHA-256 seal</span>
          </div>
        </div>

        {/* Small Screen Footer */}
        <footer className="mt-8 text-center text-xs text-ink-muted lg:hidden">
          LedgerLine &copy; 2026 · Double-entry core banking engine
        </footer>
      </div>
    </div>
  );
}
