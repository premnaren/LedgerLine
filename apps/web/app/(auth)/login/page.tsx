'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { setAccessToken, setUser } from '@/lib/auth';
import { Skiper56Input, Skiper56InputHandle } from '@/components/ui/skiper56';
import {
  Layers,
  Lock,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  Info,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  FileCheck,
  Activity,
  Cpu,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotNotice, setShowForgotNotice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeRole, setActiveRole] = useState<'ADMIN' | 'HOLDER' | 'AUDITOR' | null>('ADMIN');
  const skiperInputRef = useRef<Skiper56InputHandle>(null);

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

      // Store in memory (NEVER in localStorage)
      setAccessToken(data.accessToken);
      setUser(data.user);

      // Play Skiper56 particle vanish effect on authentication success
      skiperInputRef.current?.triggerVanish(() => {
        router.push('/dashboard');
      });

      // Fallback navigation timeout in case canvas loop finished earlier
      setTimeout(() => {
        router.push('/dashboard');
      }, 700);
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
    setPassword(quickPass);
    if (skiperInputRef.current) {
      skiperInputRef.current.typeText(quickEmail);
    } else {
      setEmail(quickEmail);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F3F7FB] selection:bg-[#078BCB]/20">
      {/* ========================================================= */}
      {/* LEFT PANEL: Enterprise Branding & Mini Ledger Dashboard   */}
      {/* ========================================================= */}
      <section className="relative w-full lg:w-[52%] xl:w-[55%] bg-gradient-to-br from-[#0A1629] via-[#0E1E38] to-[#0A1526] text-white flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-800/80">
        {/* Subtle Geometric Ledger Background Pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(#078BCB 1px, transparent 1px), linear-gradient(90deg, #078BCB 1px, transparent 1px)',
            backgroundSize: '36px 36px',
          }}
          aria-hidden="true"
        />

        {/* Ambient Glow Orbs */}
        <div
          className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-[#078BCB]/15 blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-10 right-0 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        {/* Header: Logo & System Identity */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#078BCB] to-sky-400 flex items-center justify-center text-white shadow-lg shadow-[#078BCB]/25 border border-sky-300/30">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white block leading-tight">
                LedgerLine
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#078BCB] block">
                Core Banking Engine
              </span>
            </div>
          </div>

          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-700/80 text-[11px] font-medium text-slate-300 backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-[#16A36A] animate-pulse" />
            <span className="tabular-nums">Live Engine · v2.4</span>
          </div>
        </div>

        {/* Hero Copy & Financial Dashboard Preview */}
        <div className="relative z-10 my-8 lg:my-auto max-w-xl">
          {/* Tagline & Description */}
          <div className="mb-7">
            <div className="inline-flex items-center space-x-2 text-xs font-semibold text-[#078BCB] uppercase tracking-wider mb-2.5">
              <Activity className="h-3.5 w-3.5" />
              <span>Cryptographic Double-Entry Architecture</span>
            </div>
            <h1 className="text-3xl sm:text-4xl xl:text-5xl font-black text-white tracking-tight leading-[1.15]">
              Every transaction.
              <br />
              Every detail.
              <br />
              <span className="bg-gradient-to-r from-[#078BCB] via-sky-300 to-emerald-300 bg-clip-text text-transparent">
                Accounted for.
              </span>
            </h1>
            <p className="mt-3.5 text-sm sm:text-base text-slate-300 font-normal leading-relaxed max-w-lg">
              Reliable, auditable financial recordkeeping powered by immutable append-only bookkeeping with PostgreSQL Serializable ACID row locks.
            </p>
          </div>

          {/* Mini Ledger Dashboard Preview Card */}
          <div className="rounded-2xl bg-slate-900/70 border border-slate-700/70 p-5 sm:p-6 backdrop-blur-md shadow-2xl relative overflow-hidden">
            {/* Top Card Bar */}
            <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Cpu className="h-4 w-4 text-[#078BCB]" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Ledger Overview
                </span>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#16A36A]/15 text-[#16A36A] border border-[#16A36A]/30">
                ΔΣ = 0.00 Conserved
              </span>
            </div>

            {/* Total Balance & Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-4">
              <div className="sm:col-span-1 bg-slate-950/60 rounded-xl p-3 border border-slate-800/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Total Balance
                </span>
                <span className="text-xl sm:text-2xl font-black text-white tabular-nums tracking-tight mt-0.5 block">
                  ₹24,850.00
                </span>
              </div>

              <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80">
                <div className="flex items-center text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <ArrowUpRight className="h-3 w-3 text-[#16A36A] mr-1" />
                  <span>Credits</span>
                </div>
                <span className="text-sm sm:text-base font-extrabold text-[#16A36A] tabular-nums tracking-tight mt-0.5 block">
                  +₹8,200.00
                </span>
              </div>

              <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80">
                <div className="flex items-center text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <ArrowDownLeft className="h-3 w-3 text-sky-400 mr-1" />
                  <span>Debits</span>
                </div>
                <span className="text-sm sm:text-base font-extrabold text-sky-400 tabular-nums tracking-tight mt-0.5 block">
                  -₹3,450.00
                </span>
              </div>
            </div>

            {/* Recent Mini Settlement Feed */}
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/60 text-xs">
                <div className="flex items-center space-x-2.5">
                  <span className="h-2 w-2 rounded-full bg-[#16A36A]" />
                  <div>
                    <p className="font-semibold text-slate-200">Inter-Bank Settlement</p>
                    <p className="text-[10px] text-slate-400 font-mono">Checking A · 2m ago</p>
                  </div>
                </div>
                <span className="font-bold text-[#16A36A] tabular-nums">+₹5,000.00</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/60 text-xs">
                <div className="flex items-center space-x-2.5">
                  <span className="h-2 w-2 rounded-full bg-sky-400" />
                  <div>
                    <p className="font-semibold text-slate-200">Operating Reserve Clearing</p>
                    <p className="text-[10px] text-slate-400 font-mono">Operating B · 14m ago</p>
                  </div>
                </div>
                <span className="font-bold text-sky-400 tabular-nums">-₹1,250.00</span>
              </div>
            </div>

            {/* Cryptographic Proof Chip */}
            <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span className="truncate max-w-[200px] sm:max-w-none">
                SHA-256: d4e5...9a12 · Sequence #14,892
              </span>
              <span className="text-[#078BCB] font-semibold shrink-0">SSI Row-Lock Active</span>
            </div>
          </div>
        </div>

        {/* Bottom Trust Pillars */}
        <div className="relative z-10 pt-4 border-t border-slate-800/70 grid grid-cols-3 gap-3 text-slate-400 text-xs font-medium">
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="h-4 w-4 text-[#16A36A] shrink-0" />
            <span className="truncate">Append-Only Immutability</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <Lock className="h-4 w-4 text-[#078BCB] shrink-0" />
            <span className="truncate">PostgreSQL SSI ACID</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <FileCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="truncate">Zero-Sum Invariant (ΔΣ=0)</span>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* RIGHT PANEL: Focused Enterprise Login Form               */}
      {/* ========================================================= */}
      <section className="w-full lg:w-[48%] xl:w-[45%] flex flex-col justify-center items-center px-4 sm:px-8 lg:px-12 xl:px-16 py-10 lg:py-16">
        <div className="w-full max-w-[440px]">
          {/* Welcome Header */}
          <div className="mb-6">
            <div className="inline-flex items-center space-x-2 text-xs font-bold text-[#078BCB] uppercase tracking-wider mb-1.5">
              <Lock className="h-3.5 w-3.5" />
              <span>Secure Authentication</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#172B45] tracking-tight">
              Welcome back
            </h2>
            <p className="mt-1.5 text-sm text-[#64748B] font-medium">
              Sign in to your LedgerLine account or choose a sample role.
            </p>
          </div>

          {/* Authentication Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#E2EAF2] p-6 sm:p-8 transition-shadow">
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
                  <p className="text-sky-800 mt-0.5 leading-relaxed">
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

            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              {/* Email Field with Skiper56 Typewriter & Vanish Animation */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-bold uppercase tracking-wider text-[#172B45] mb-1.5"
                >
                  Email Address
                </label>
                <Skiper56Input
                  ref={skiperInputRef}
                  id="email"
                  name="email"
                  value={email}
                  onChange={setEmail}
                  onSubmit={() => handleSubmit()}
                  required
                  autoComplete="email"
                  placeholders={[
                    'admin@ledgerline.dev',
                    'holder@ledgerline.dev',
                    'auditor@ledgerline.dev',
                  ]}
                />
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="password"
                    className="block text-xs font-bold uppercase tracking-wider text-[#172B45]"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotNotice(true)}
                    className="text-xs font-medium text-[#078BCB] hover:underline transition pressable"
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
                    className="h-11 w-full pl-10 pr-10 rounded-xl border border-[#E2EAF2] bg-white text-sm text-[#172B45] placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#078BCB] focus-visible:border-[#078BCB] transition"
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus-visible:outline-none transition"
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
                className="h-11 w-full flex justify-center items-center py-2.5 px-4 rounded-xl shadow-xs text-sm font-semibold text-white bg-[#078BCB] hover:bg-[#0674aa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#078BCB] disabled:opacity-60 disabled:cursor-not-allowed transition pressable mt-2"
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

            {/* Demo Access Section: 3 distinct role identities */}
            <div className="mt-6 pt-5 border-t border-[#E2EAF2]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                  Quick Demo Access
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Click to prefill</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {/* ADMIN Role Card */}
                <button
                  type="button"
                  onClick={() => handleQuickLogin('ADMIN', 'admin@ledgerline.dev', 'Admin1234!')}
                  className={`py-2.5 px-2 rounded-xl text-center border transition pressable focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
                    activeRole === 'ADMIN'
                      ? 'bg-purple-50/90 border-purple-300 text-purple-900 shadow-xs'
                      : 'bg-purple-50/50 hover:bg-purple-50 border-purple-200/70 text-purple-700'
                  }`}
                  aria-label="Sign in as Admin demo account"
                >
                  <div className="flex items-center justify-center space-x-1 mb-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                    <span className="text-xs font-bold tracking-tight">ADMIN</span>
                  </div>
                  <span className="text-[10px] text-purple-700 font-medium block">
                    Superuser
                  </span>
                </button>

                {/* HOLDER Role Card */}
                <button
                  type="button"
                  onClick={() => handleQuickLogin('HOLDER', 'holder@ledgerline.dev', 'Holder1234!')}
                  className={`py-2.5 px-2 rounded-xl text-center border transition pressable focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                    activeRole === 'HOLDER'
                      ? 'bg-sky-50/90 border-sky-300 text-sky-900 shadow-xs'
                      : 'bg-sky-50/50 hover:bg-sky-50 border-sky-200/70 text-sky-700'
                  }`}
                  aria-label="Sign in as Holder demo account"
                >
                  <div className="flex items-center justify-center space-x-1 mb-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#078BCB]" />
                    <span className="text-xs font-bold tracking-tight">HOLDER</span>
                  </div>
                  <span className="text-[10px] text-sky-700 font-medium block">
                    Account Owner
                  </span>
                </button>

                {/* AUDITOR Role Card */}
                <button
                  type="button"
                  onClick={() => handleQuickLogin('AUDITOR', 'auditor@ledgerline.dev', 'Audit1234!')}
                  className={`py-2.5 px-2 rounded-xl text-center border transition pressable focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                    activeRole === 'AUDITOR'
                      ? 'bg-amber-50/90 border-amber-300 text-amber-900 shadow-xs'
                      : 'bg-amber-50/50 hover:bg-amber-50 border-amber-200/70 text-amber-700'
                  }`}
                  aria-label="Sign in as Auditor demo account"
                >
                  <div className="flex items-center justify-center space-x-1 mb-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    <span className="text-xs font-bold tracking-tight">AUDITOR</span>
                  </div>
                  <span className="text-[10px] text-amber-700 font-medium block">
                    Compliance
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Security Credentials Footer */}
          <div className="mt-6 text-center space-y-1 text-xs text-[#64748B]">
            <div className="flex items-center justify-center space-x-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-[#16A36A]" />
              <span className="font-medium">Secure access · Role-based authorization</span>
            </div>
            <p className="text-[11px] text-slate-400">
              PostgreSQL Serializable Isolation · Immutable SHA-256 Ledger
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
