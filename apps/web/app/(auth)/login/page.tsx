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

      // Store credentials in memory (never localStorage)
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
    <div className="min-h-screen w-full flex flex-col justify-between items-center py-10 sm:py-14 px-4 sm:px-6 bg-[#F5F8FC] selection:bg-[#078BCB]/20">
      {/* Spacer to balance layout vertically */}
      <div className="w-full max-w-[440px] hidden sm:block" aria-hidden="true" />

      {/* Main Container: Centered Single Column */}
      <div className="w-full max-w-[440px] my-auto">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-10 w-10 rounded-[10px] bg-[#078BCB] text-white shadow-xs mb-3">
            <Layers className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#172B45] leading-snug">
            LedgerLine
          </h1>
          <p className="mt-1 text-xs text-[#64748B] font-medium">
            Financial recordkeeping, made accountable.
          </p>
        </div>

        {/* Authentication Card */}
        <div className="bg-white border border-[#E2E8F0] rounded-[14px] p-6 sm:p-8 shadow-[0_1px_3px_0_rgba(0,0,0,0.04),0_1px_2px_0_rgba(0,0,0,0.02)]">
          {/* Card Heading */}
          <div className="mb-5">
            <h2 className="text-2xl font-bold text-[#172B45] tracking-tight">
              Welcome back
            </h2>
            <p className="text-sm text-[#64748B] mt-1 font-normal">
              Sign in to continue to your workspace.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div
              role="alert"
              className="mb-4 p-3 bg-red-50 border border-red-200 rounded-[10px] flex items-start space-x-2.5 text-xs text-red-700 animate-in fade-in-50 duration-150"
            >
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-red-900">Authentication failed</p>
                <p className="text-red-700 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Forgot Password Information Banner */}
          {showForgotNotice && (
            <div className="mb-4 p-3 bg-sky-50 border border-sky-200 rounded-[10px] text-xs text-sky-900 flex items-start space-x-2.5 animate-in fade-in-50 duration-150">
              <Info className="h-4 w-4 shrink-0 text-sky-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-sky-950">Password Recovery</p>
                <p className="text-sky-800 mt-0.5 leading-relaxed">
                  In LedgerLine&apos;s multi-tenant core engine, credentials are managed by your administrator. Contact security operations or select a demo role below to explore.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotNotice(false)}
                className="text-sky-600 hover:text-sky-900 p-0.5 rounded transition-colors"
                aria-label="Dismiss notice"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            {/* Email Address Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-wider text-[#172B45] mb-1.5"
              >
                Email Address
              </label>
              <div className="relative rounded-[10px]">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                  <Mail className="h-4 w-4" />
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
                  className="h-11 w-full pl-10 pr-3.5 rounded-[10px] border border-[#E2E8F0] bg-white text-sm text-[#172B45] placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#078BCB] focus-visible:border-[#078BCB] transition-colors duration-150"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#172B45]"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotNotice(true)}
                  className="text-xs font-medium text-[#078BCB] hover:text-[#0576AD] focus-visible:outline-none focus-visible:underline transition-colors duration-150 pressable"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative rounded-[10px]">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
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
                  className="h-11 w-full pl-10 pr-10 rounded-[10px] border border-[#E2E8F0] bg-white text-sm text-[#172B45] placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#078BCB] focus-visible:border-[#078BCB] transition-colors duration-150"
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus-visible:outline-none transition-colors duration-150"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-slate-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-slate-500" />
                  )}
                </button>
              </div>
            </div>

            {/* Primary Action Button */}
            <button
              type="submit"
              disabled={loading}
              className="h-11 w-full flex justify-center items-center py-2.5 px-4 rounded-[10px] text-sm font-semibold text-white bg-[#078BCB] hover:bg-[#0576AD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#078BCB] disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-150 pressable shadow-xs mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-[#E2E8F0]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-xs text-[#64748B] font-medium">
                Or explore with a demo account
              </span>
            </div>
          </div>

          {/* Demo Access: 3 Compact Role Selection Cards */}
          <div className="grid grid-cols-3 gap-2">
            {/* ADMIN Card */}
            <button
              type="button"
              onClick={() => handleQuickLogin('ADMIN', 'admin@ledgerline.dev', 'Admin1234!')}
              className={`py-2 px-1.5 sm:px-2 rounded-[10px] text-center border transition-all duration-150 pressable focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9333EA] ${
                activeRole === 'ADMIN'
                  ? 'bg-purple-50 border-[#9333EA] text-purple-900 shadow-xs ring-1 ring-[#9333EA]'
                  : 'bg-purple-50/50 hover:bg-purple-50/90 border-purple-200/80 text-purple-800'
              }`}
              aria-label="Sign in as Admin demo account"
            >
              <div className="flex items-center justify-center space-x-1 mb-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#9333EA]" />
                <span className="text-xs font-bold tracking-tight">ADMIN</span>
              </div>
              <span className="text-[10px] text-purple-700 font-medium block">
                Superuser
              </span>
            </button>

            {/* HOLDER Card */}
            <button
              type="button"
              onClick={() => handleQuickLogin('HOLDER', 'holder@ledgerline.dev', 'Holder1234!')}
              className={`py-2 px-1.5 sm:px-2 rounded-[10px] text-center border transition-all duration-150 pressable focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284C7] ${
                activeRole === 'HOLDER'
                  ? 'bg-sky-50 border-[#0284C7] text-sky-900 shadow-xs ring-1 ring-[#0284C7]'
                  : 'bg-sky-50/50 hover:bg-sky-50/90 border-sky-200/80 text-sky-800'
              }`}
              aria-label="Sign in as Holder demo account"
            >
              <div className="flex items-center justify-center space-x-1 mb-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0284C7]" />
                <span className="text-xs font-bold tracking-tight">HOLDER</span>
              </div>
              <span className="text-[10px] text-sky-700 font-medium block">
                Account Owner
              </span>
            </button>

            {/* AUDITOR Card */}
            <button
              type="button"
              onClick={() => handleQuickLogin('AUDITOR', 'auditor@ledgerline.dev', 'Audit1234!')}
              className={`py-2 px-1.5 sm:px-2 rounded-[10px] text-center border transition-all duration-150 pressable focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
                activeRole === 'AUDITOR'
                  ? 'bg-amber-50 border-[#D97706] text-amber-900 shadow-xs ring-1 ring-[#D97706]'
                  : 'bg-amber-50/50 hover:bg-amber-50/90 border-amber-200/80 text-amber-800'
              }`}
              aria-label="Sign in as Auditor demo account"
            >
              <div className="flex items-center justify-center space-x-1 mb-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#D97706]" />
                <span className="text-xs font-bold tracking-tight">AUDITOR</span>
              </div>
              <span className="text-[10px] text-amber-700 font-medium block">
                Compliance
              </span>
            </button>
          </div>
        </div>

        {/* Security Badge Below Card */}
        <div className="mt-5 flex items-center justify-center space-x-1.5 text-xs text-[#64748B]">
          <ShieldCheck className="h-3.5 w-3.5 text-[#16A36A]" />
          <span>Secure authentication · SHA-256 integrity</span>
        </div>
      </div>

      {/* Page Footer */}
      <footer className="w-full text-center py-2 text-[11px] text-[#64748B]/70 font-normal">
        LedgerLine &copy; 2026
      </footer>
    </div>
  );
}
