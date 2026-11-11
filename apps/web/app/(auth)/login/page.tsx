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
  Sparkles,
  RotateCw,
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
      <header className="flex z-30 justify-between items-center px-6 sm:px-8 lg:px-10 pt-6 sm:pt-8 w-full max-w-7xl pointer-events-none">
        {/* Left: Clean inline LedgerLine Brand without box or border */}
        <div className="flex items-center space-x-2.5 pointer-events-auto">
          <Layers className="w-5 h-5 sm:w-6 sm:h-6 text-[#648EFF] dark:text-[#BD75E9]" />
          <span className="text-lg sm:text-xl font-bold tracking-tight text-[#17142B] dark:text-[#F7F4FF]">
            Ledger<span className="text-[#648EFF] dark:text-[#BD75E9]">Line</span>
          </span>
        </div>

        {/* Right: Theme Toggle (Animated Switch) */}
        <div className="flex items-center space-x-2 pointer-events-auto">
          <ThemeToggle isDark={isDark} onToggle={handleToggleTheme} />
        </div>
      </header>

      {/* ============================================================ */}
      {/* LAYER 5: Left-Aligned Cosmic Glassmorphic Auth Card          */}
      {/* ============================================================ */}
      <main className="flex z-20 items-center justify-start w-full max-w-7xl px-6 sm:px-8 lg:px-12 py-6 sm:py-10 my-auto pointer-events-none flex-1">
        <div className={`login-wrapper pointer-events-auto ${isDark ? 'dark-card' : 'light-card'}`}>
          <div className={`login-card ${isDark ? 'dark-card' : 'light-card'}`}>
            <div className="glow-blob blob-1"></div>
            <div className="glow-blob blob-2"></div>
            <div className="dark-overlay"></div>

            <div className="view-container">
              {/* Error Alert */}
              {error && (
                <div
                  role="alert"
                  className="mb-4 flex items-start p-3 space-x-2 text-xs rounded-xl border bg-red-950/50 border-[#F07886] text-[#F07886]"
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
                <div className={`mb-4 flex items-start p-3 space-x-2 text-xs rounded-xl border ${
                  isDark
                    ? 'bg-[#100D20]/95 border-[#34304D] text-[#F7F4FF]'
                    : 'bg-white/95 border-[#DED9EA] text-[#17142B] shadow-sm'
                }`}>
                  <Info className="h-4 w-4 shrink-0 text-[#8155D9] mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-xs">Password recovery</p>
                    <p className={`text-[11px] mt-0.5 leading-relaxed ${isDark ? 'text-[#C0BAD5]' : 'text-[#55516D]'}`}>
                      Managed by ledger operations. Use pre-configured demo credentials or contact admin@ledgerline.dev.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowForgotNotice(false)}
                    className="text-[#9189AA] hover:text-white p-0.5"
                    aria-label="Dismiss notice"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {mode === 'signin' ? (
                /* ----------------- SIGN IN VIEW ----------------- */
                <div className="form-view" id="login-view" key="signin">
                  <div className="header">
                    <div className="decorative-dot"></div>
                    <div className="title">Welcome Back</div>
                    <p className="subtitle">Please enter your details to sign in.</p>
                  </div>

                  <form onSubmit={handleSignIn}>
                    <div className="input-group">
                      <input
                        type="email"
                        className="input-field"
                        placeholder="Email address"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setActiveRole(null);
                        }}
                      />
                    </div>

                    <div className="input-group">
                      <input
                        type="password"
                        className="input-field"
                        placeholder="Password"
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>

                    <a
                      href="#"
                      className="forgot-link"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowForgotNotice(true);
                      }}
                    >
                      Forgot password?
                    </a>

                    <button type="submit" className="animated-button" disabled={loading}>
                      <svg viewBox="0 0 24 24" className="arr-2" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z"
                        ></path>
                      </svg>
                      <span className="text">{loading ? 'SIGNING IN...' : 'SIGN IN'}</span>
                      <span className="circle"></span>
                      <svg viewBox="0 0 24 24" className="arr-1" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z"
                        ></path>
                      </svg>
                    </button>
                  </form>

                  <div className="signup-prompt">
                    Don&apos;t have an account?{' '}
                    <button
                      type="button"
                      className="toggle-link"
                      onClick={() => {
                        setMode('signup');
                        setError(null);
                      }}
                    >
                      Sign up
                    </button>
                  </div>

                  {/* Quick Demo Access Pills */}
                  <div className={`mt-5 pt-3 border-t ${isDark ? 'border-white/10' : 'border-[#DED9EA]'}`}>
                    <div className={`text-[11px] font-semibold text-center mb-2 ${
                      isDark ? 'text-white/50' : 'text-[#747B91]'
                    }`}>
                      Demo accounts
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleQuickLogin('ADMIN', 'admin@ledgerline.dev', 'Admin1234!')}
                        className={`py-1.5 px-1 rounded-lg text-center border transition-all text-[11px] font-medium ${
                          activeRole === 'ADMIN'
                            ? isDark
                              ? 'border-[#2ff8ff] bg-[#2ff8ff]/15 text-[#2ff8ff] font-bold'
                              : 'border-[#6E56CF] bg-[#6E56CF]/12 text-[#6E56CF] font-bold shadow-sm'
                            : isDark
                            ? 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                            : 'border-[#DED9EA] bg-white/80 text-[#17142B] hover:bg-white shadow-xs'
                        }`}
                      >
                        Admin
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickLogin('HOLDER', 'holder@ledgerline.dev', 'Holder1234!')}
                        className={`py-1.5 px-1 rounded-lg text-center border transition-all text-[11px] font-medium ${
                          activeRole === 'HOLDER'
                            ? isDark
                              ? 'border-[#2ff8ff] bg-[#2ff8ff]/15 text-[#2ff8ff] font-bold'
                              : 'border-[#6E56CF] bg-[#6E56CF]/12 text-[#6E56CF] font-bold shadow-sm'
                            : isDark
                            ? 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                            : 'border-[#DED9EA] bg-white/80 text-[#17142B] hover:bg-white shadow-xs'
                        }`}
                      >
                        Holder
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickLogin('AUDITOR', 'auditor@ledgerline.dev', 'Audit1234!')}
                        className={`py-1.5 px-1 rounded-lg text-center border transition-all text-[11px] font-medium ${
                          activeRole === 'AUDITOR'
                            ? isDark
                              ? 'border-[#2ff8ff] bg-[#2ff8ff]/15 text-[#2ff8ff] font-bold'
                              : 'border-[#6E56CF] bg-[#6E56CF]/12 text-[#6E56CF] font-bold shadow-sm'
                            : isDark
                            ? 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                            : 'border-[#DED9EA] bg-white/80 text-[#17142B] hover:bg-white shadow-xs'
                        }`}
                      >
                        Auditor
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* ----------------- SIGN UP VIEW ----------------- */
                <div className="form-view" id="signup-view" key="signup">
                  <div className="header">
                    <div className="decorative-dot"></div>
                    <div className="title">Create Account</div>
                    <p className="subtitle">Join us to get started.</p>
                  </div>

                  <form onSubmit={handleSignUp}>
                    <div className="input-group">
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Account Name (e.g. Acme Ops)"
                        autoComplete="name"
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                      />
                    </div>

                    <div className="input-group">
                      <input
                        type="email"
                        className="input-field"
                        placeholder="Email address"
                        required
                        autoComplete="email"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                      />
                    </div>

                    <div className="input-group">
                      <input
                        type="password"
                        className="input-field"
                        placeholder="Password (min 6 chars)"
                        required
                        autoComplete="new-password"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                      />
                    </div>

                    <div className="input-group">
                      <input
                        type="password"
                        className="input-field"
                        placeholder="Confirm Password"
                        required
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>

                    <div style={{ height: '8px' }}></div>

                    <button type="submit" className="animated-button" disabled={loading}>
                      <svg viewBox="0 0 24 24" className="arr-2" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z"
                        ></path>
                      </svg>
                      <span className="text">{loading ? 'CREATING...' : 'SIGN UP'}</span>
                      <span className="circle"></span>
                      <svg viewBox="0 0 24 24" className="arr-1" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z"
                        ></path>
                      </svg>
                    </button>
                  </form>

                  <div className="signup-prompt">
                    Already have an account?{' '}
                    <button
                      type="button"
                      className="toggle-link"
                      onClick={() => {
                        setMode('signin');
                        setError(null);
                      }}
                    >
                      Sign in
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ============================================================ */}
      {/* LAYER 6: Balanced Footer                                     */}
      {/* ============================================================ */}
      <footer className="w-full max-w-7xl px-6 sm:px-8 lg:px-12 py-5 sm:py-6 flex items-center justify-between text-xs text-[#55516D] dark:text-[#C0BAD5] z-30 pointer-events-none">
        <div className="font-medium pointer-events-auto">
          LedgerLine &copy; 2026 &middot; Double-entry core engine
        </div>
      </footer>
    </div>
  );
}
