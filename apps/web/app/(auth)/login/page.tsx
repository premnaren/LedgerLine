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
    <div className="flex flex-col justify-center items-center px-4 py-8 w-full min-h-screen sm:px-6 bg-paper text-ink">
      {/* Compact Auth Card */}
      <div className="w-full max-w-[420px] bg-white rounded border border-rule p-6 sm:p-7 shadow-none">
        {/* Brand Header */}
        <div className="flex items-center justify-between mb-5 pb-4 border-b border-rule">
          <div className="flex items-center space-x-2.5">
            <div className="flex justify-center items-center w-8 h-8 bg-paper rounded border border-rule text-accent">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-ink">
                Ledger<span className="text-accent">Line</span>
              </span>
              <span className="block text-xs text-ink-muted leading-tight">
                Double-entry core ledger
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 text-xs text-ledger-green bg-paper px-2.5 py-1 rounded border border-rule">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--ledger-green)' }} />
            <span className="font-medium">Active</span>
          </div>
        </div>

        {/* Tab Switcher: Sign in / Create account */}
        <div className="grid grid-cols-2 p-1 mb-5 bg-paper rounded border border-rule text-xs">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setError(null);
            }}
            className={`py-1.5 text-xs rounded transition text-center ${
              mode === 'signin'
                ? 'bg-white text-ink font-semibold border border-rule shadow-none'
                : 'text-ink-muted hover:text-ink font-medium'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
              setActiveRole(null);
            }}
            className={`py-1.5 text-xs rounded transition text-center ${
              mode === 'signup'
                ? 'bg-white text-ink font-semibold border border-rule shadow-none'
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
            className="flex items-start p-3 mb-4 space-x-2 text-xs rounded border bg-paper border-ledger-red text-ledger-red"
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
          <div className="flex items-start p-3 mb-4 space-x-2 text-xs rounded border bg-paper border-rule text-ink">
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

        {/* SIGN IN FORM */}
        {mode === 'signin' ? (
          <div>
            <form className="space-y-3.5" onSubmit={handleSignIn} noValidate>
              {/* Email Address */}
              <div>
                <label
                  htmlFor="signin-email"
                  className="block mb-1 text-xs font-medium text-ink-muted"
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
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setActiveRole(null);
                    }}
                    className="pr-3 pl-9 w-full h-9 text-xs bg-white rounded border mono-num border-rule text-ink placeholder:text-ink-muted focus:outline-none focus:border-accent"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label
                    htmlFor="signin-password"
                    className="block text-xs font-medium text-ink-muted"
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
                    className="pr-9 pl-9 w-full h-9 text-xs bg-white rounded border border-rule text-ink placeholder:text-ink-muted focus:outline-none focus:border-accent"
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
                className="flex justify-center items-center px-4 py-2 mt-2 w-full h-9 text-xs font-semibold text-white rounded transition bg-accent hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed pressable"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin text-white" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign in</span>
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Access Divider */}
            <div className="relative my-4">
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
            <p className="text-xs text-ink-muted mb-2 text-center leading-relaxed">
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
          /* CREATE ACCOUNT FORM */
          <form className="space-y-3.5" onSubmit={handleSignUp} noValidate>
            {/* Email Address */}
            <div>
              <label
                htmlFor="signup-email"
                className="block mb-1 text-xs font-medium text-ink-muted"
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
                  autoComplete="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  className="pr-3 pl-9 w-full h-9 text-xs bg-white rounded border mono-num border-rule text-ink placeholder:text-ink-muted focus:outline-none focus:border-accent"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            {/* Account Name */}
            <div>
              <label
                htmlFor="account-name"
                className="block mb-1 text-xs font-medium text-ink-muted"
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
                  className="pr-3 pl-9 w-full h-9 text-xs bg-white rounded border border-rule text-ink placeholder:text-ink-muted focus:outline-none focus:border-accent"
                  placeholder="e.g. Acme Operations"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="signup-password"
                className="block mb-1 text-xs font-medium text-ink-muted"
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
                  className="pr-9 pl-9 w-full h-9 text-xs bg-white rounded border border-rule text-ink placeholder:text-ink-muted focus:outline-none focus:border-accent"
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
                className="block mb-1 text-xs font-medium text-ink-muted"
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
                  className="pr-9 pl-9 w-full h-9 text-xs bg-white rounded border border-rule text-ink placeholder:text-ink-muted focus:outline-none focus:border-accent"
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
            <div className="p-2.5 bg-paper rounded border border-rule text-xs space-y-1">
              <div className="flex items-center space-x-2">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    signupPassword.length >= 6 ? 'bg-ledger-green' : 'bg-rule-strong'
                  }`}
                />
                <span className={signupPassword.length >= 6 ? 'text-ink font-medium' : 'text-ink-muted'}>
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
                      ? 'text-ink font-medium'
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
                  New accounts are registered with the <strong className="text-ink">Holder</strong> role. This provisions your own operating account, personal statement generation, and internal double-entry transfers.
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
              className="flex justify-center items-center px-4 py-2 mt-2 w-full h-9 text-xs font-semibold text-white rounded transition bg-accent hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed pressable"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin text-white" />
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <span>Create account</span>
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Card Footer Security Seal */}
        <div className="mt-5 pt-3 border-t border-rule flex items-center justify-center space-x-1.5 text-xs text-ink-muted">
          <ShieldCheck className="h-4 w-4 text-ledger-green" />
          <span>Serializable ACID · SHA-256 seal</span>
        </div>
      </div>

      {/* Page Footer */}
      <footer className="mt-5 text-center text-xs text-ink-muted">
        LedgerLine &copy; 2026 · Double-entry core banking engine
      </footer>
    </div>
  );
}
