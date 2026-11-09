'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, UserSession } from '@/lib/auth';
import { fetchWithAuth } from '@/lib/api';
import {
  Users,
  Shield,
  UserPlus,
  Search,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  X,
  CreditCard,
  Lock,
  Mail,
  ChevronDown,
} from 'lucide-react';

interface AccountSummary {
  id: string;
  name: string;
  balancePence: string;
  balanceRupees: string;
  overdraftLimitPence: string;
}

interface UserRecord {
  id: string;
  email: string;
  role: 'ADMIN' | 'HOLDER' | 'AUDITOR';
  createdAt: string;
  accounts: AccountSummary[];
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'HOLDER' | 'AUDITOR'>('ALL');

  // Onboard modal state
  const [showModal, setShowModal] = useState(false);
  const [onboardEmail, setOnboardEmail] = useState('');
  const [onboardPassword, setOnboardPassword] = useState('');
  const [onboardRole, setOnboardRole] = useState<'ADMIN' | 'HOLDER' | 'AUDITOR'>('HOLDER');
  const [onboardAccountName, setOnboardAccountName] = useState('');
  const [onboardLoading, setOnboardLoading] = useState(false);
  const [onboardError, setOnboardError] = useState<string | null>(null);
  const [onboardSuccess, setOnboardSuccess] = useState<string | null>(null);

  // Updating role state
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  useEffect(() => {
    const user = getUser();
    if (!user || user.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }
    setCurrentUser(user);
    loadUsers();
  }, [router]);

  const loadUsers = async () => {
    try {
      setError(null);
      const res = await fetchWithAuth('/api/admin/users');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to fetch users');
      }
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err: any) {
      setError(err.message || 'Error loading users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  const handleUpdateRole = async (userId: string, newRole: 'ADMIN' | 'HOLDER' | 'AUDITOR') => {
    try {
      setUpdatingUserId(userId);
      const res = await fetchWithAuth(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update role');
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update user role');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardError(null);
    setOnboardSuccess(null);

    if (!onboardEmail || !onboardPassword) {
      setOnboardError('Email and password are required');
      return;
    }

    try {
      setOnboardLoading(true);
      const res = await fetchWithAuth('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          email: onboardEmail,
          password: onboardPassword,
          role: onboardRole,
          accountName: onboardAccountName,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to onboard user');
      }

      setOnboardSuccess(`Successfully onboarded ${data.user.email} as ${data.user.role}!`);
      setOnboardEmail('');
      setOnboardPassword('');
      setOnboardAccountName('');
      setOnboardRole('HOLDER');
      loadUsers();

      setTimeout(() => {
        setShowModal(false);
        setOnboardSuccess(null);
      }, 1400);
    } catch (err: any) {
      setOnboardError(err.message || 'Failed to onboard user');
    } finally {
      setOnboardLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  const counts = useMemo(() => {
    return {
      total: users.length,
      admin: users.filter((u) => u.role === 'ADMIN').length,
      holder: users.filter((u) => u.role === 'HOLDER').length,
      auditor: users.filter((u) => u.role === 'AUDITOR').length,
    };
  }, [users]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="space-y-1">
        <div className="text-[11px] font-semibold tracking-widest uppercase text-primary">
          ADMIN / USER ROLES &amp; ACCESS CONTROL
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-rule">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-ink">
                  User Role Administration
                </h1>
                <p className="text-xs sm:text-sm text-ink-muted mt-0.5">
                  Server-enforced role assignments, user onboarding, and cryptographic account ownership.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-surface hover:bg-surface-secondary text-ink border border-rule transition shadow-xs flex items-center space-x-1.5 pressable"
              title="Refresh user list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-primary hover:bg-primary-hover text-white shadow-xs transition flex items-center space-x-1.5 pressable"
            >
              <UserPlus className="w-4 h-4" />
              <span>Onboard New User</span>
            </button>
          </div>
        </div>
      </div>

      {/* Role Architecture Explainer Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="p-5 cosmic-card shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-primary uppercase tracking-wider">
              ADMIN Role
            </span>
            <span className="cosmic-pill text-primary border-primary/30 bg-primary/10">
              {counts.admin} active
            </span>
          </div>
          <p className="text-xs text-ink-muted leading-relaxed">
            Full authority across all accounts. Can execute inter-account transfers, simulate stress, access audit logs, and onboard users.
          </p>
        </div>

        <div className="p-5 cosmic-card shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#60C9BC] uppercase tracking-wider">
              HOLDER Role
            </span>
            <span className="cosmic-pill text-[#60C9BC] border-[#60C9BC]/30 bg-[#60C9BC]/10">
              {counts.holder} active
            </span>
          </div>
          <p className="text-xs text-ink-muted leading-relaxed">
            Strictly limited to own accounts where registered in account holders. Cross-user operations return HTTP 403 Forbidden.
          </p>
        </div>

        <div className="p-5 cosmic-card shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#F0B85A] uppercase tracking-wider">
              AUDITOR Role
            </span>
            <span className="cosmic-pill text-[#F0B85A] border-[#F0B85A]/30 bg-[#F0B85A]/10">
              {counts.auditor} active
            </span>
          </div>
          <p className="text-xs text-ink-muted leading-relaxed">
            Global read-only observation. Can inspect statements and declined entries across all accounts, but cannot execute money movement.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 cosmic-card p-3.5 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users by email or user ID..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-surface-secondary border border-rule rounded-lg text-ink placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'ADMIN', 'HOLDER', 'AUDITOR'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                roleFilter === r
                  ? 'bg-primary text-white dark:text-[#0B1220]'
                  : 'bg-surface-secondary text-ink-muted hover:text-ink'
              }`}
            >
              {r === 'ALL' ? `All (${counts.total})` : `${r} (${counts[r.toLowerCase() as keyof typeof counts]})`}
            </button>
          ))}
        </div>
      </div>

      {/* User Table */}
      <div className="cosmic-card shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-primary mx-auto" />
            <p className="text-xs text-ink-muted">Loading registered users and role assignments...</p>
          </div>
        ) : error ? (
          <div className="py-12 text-center space-y-2">
            <AlertCircle className="w-6 h-6 text-danger mx-auto" />
            <p className="text-xs text-danger font-semibold">{error}</p>
            <button
              onClick={handleRefresh}
              className="text-xs text-primary underline hover:opacity-80"
            >
              Try again
            </button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-12 text-center space-y-1">
            <Users className="w-6 h-6 text-ink-muted mx-auto opacity-50" />
            <p className="text-xs text-ink font-semibold">No users found</p>
            <p className="text-xs text-ink-muted">Try clearing your search query or filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-rule bg-surface-secondary/50 text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role & Authority</th>
                  <th className="py-3 px-4">Linked Accounts</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule text-xs">
                {filteredUsers.map((u) => {
                  const isCurrent = currentUser?.email === u.email;
                  const totalBalance = u.accounts.reduce(
                    (acc, a) => acc + (Number(a.balancePence) || 0),
                    0
                  );

                  return (
                    <tr key={u.id} className="hover:bg-surface-secondary/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-full bg-surface-secondary border border-rule flex items-center justify-center font-bold text-ink shrink-0">
                            {u.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-ink flex items-center space-x-1.5">
                              <span>{u.email}</span>
                              {isCurrent && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/10 text-primary font-bold">
                                  YOU
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] mono-num text-ink-muted block">
                              ID: {u.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`cosmic-pill ${
                            u.role === 'ADMIN'
                              ? 'text-primary border-primary/30 bg-primary/10'
                              : u.role === 'AUDITOR'
                              ? 'text-[#F0B85A] border-[#F0B85A]/30 bg-[#F0B85A]/10'
                              : 'text-[#60C9BC] border-[#60C9BC]/30 bg-[#60C9BC]/10'
                          }`}
                        >
                          <Shield className="w-3 h-3" />
                          <span>{u.role}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {u.accounts.length === 0 ? (
                          <span className="text-ink-muted text-[11px]">No linked accounts</span>
                        ) : (
                          <div className="space-y-1">
                            {u.accounts.map((acc) => (
                              <div
                                key={acc.id}
                                className="flex items-center space-x-2 text-[11px]"
                              >
                                <CreditCard className="w-3 h-3 text-ink-muted" />
                                <span className="font-medium text-ink truncate max-w-[160px]">
                                  {acc.name}
                                </span>
                                <span className="mono-num text-primary font-bold">
                                  ₹{acc.balanceRupees}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-ink-muted mono-num text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center space-x-1.5">
                          <select
                            value={u.role}
                            disabled={isCurrent || updatingUserId === u.id}
                            onChange={(e) =>
                              handleUpdateRole(
                                u.id,
                                e.target.value as 'ADMIN' | 'HOLDER' | 'AUDITOR'
                              )
                            }
                            className="text-xs bg-surface-secondary border border-rule rounded-lg px-2 py-1 text-ink focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 cursor-pointer"
                          >
                            <option value="HOLDER">HOLDER</option>
                            <option value="ADMIN">ADMIN</option>
                            <option value="AUDITOR">AUDITOR</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Onboard New User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface border border-rule rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-ink-muted hover:text-ink p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h2 className="text-lg font-bold text-ink flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-primary" />
                <span>Onboard New User & Account</span>
              </h2>
              <p className="text-xs text-ink-muted">
                Create new user credentials, assign an RBAC role, and initialize an operating ledger.
              </p>
            </div>

            {onboardError && (
              <div className="p-3 bg-danger/10 border border-danger/30 rounded-lg text-danger text-xs font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{onboardError}</span>
              </div>
            )}

            {onboardSuccess && (
              <div className="p-3 bg-success/10 border border-success/30 rounded-lg text-success text-xs font-semibold flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{onboardSuccess}</span>
              </div>
            )}

            <form onSubmit={handleOnboardSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                  <input
                    type="email"
                    required
                    value={onboardEmail}
                    onChange={(e) => setOnboardEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-surface-secondary border border-rule rounded-lg text-ink placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                  <input
                    type="password"
                    required
                    value={onboardPassword}
                    onChange={(e) => setOnboardPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-surface-secondary border border-rule rounded-lg text-ink placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Role Assignment
                </label>
                <select
                  value={onboardRole}
                  onChange={(e) => setOnboardRole(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-surface-secondary border border-rule rounded-lg text-ink focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="HOLDER">HOLDER — Account Owner (Debits & Credits own accounts)</option>
                  <option value="ADMIN">ADMIN — Full System Authority</option>
                  <option value="AUDITOR">AUDITOR — Compliance Read-Only</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Operating Account Name (Optional)
                </label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                  <input
                    type="text"
                    value={onboardAccountName}
                    onChange={(e) => setOnboardAccountName(e.target.value)}
                    placeholder="e.g. Commercial Checking"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-surface-secondary border border-rule rounded-lg text-ink placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-surface hover:bg-surface-secondary text-ink border border-rule"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={onboardLoading}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary hover:opacity-95 text-white dark:text-[#0B1220] shadow-xs flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {onboardLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{onboardLoading ? 'Onboarding...' : 'Confirm Onboard'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
