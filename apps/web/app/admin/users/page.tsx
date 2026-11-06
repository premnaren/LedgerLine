'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, UserSession } from '@/lib/auth';
import { Users, Shield } from 'lucide-react';

export default function AdminUsersPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser || currentUser.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }
    setUser(currentUser);
  }, [router]);

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center space-x-2">
          <Users className="h-6 w-6 text-sky-600" />
          <span>User Role Administration</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Server-enforced role assignments across LedgerLine accounts
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
            <h3 className="font-bold text-purple-950">ADMIN Role</h3>
            <p className="text-xs text-purple-800 mt-1">
              Full authority across all accounts. Can execute multi-account transfers, deposits, withdrawals, and account creation.
            </p>
          </div>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <h3 className="font-bold text-blue-950">HOLDER Role</h3>
            <p className="text-xs text-blue-800 mt-1">
              Strictly limited to own accounts where registered in account_holders. Cross-user operations return HTTP 403.
            </p>
          </div>
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <h3 className="font-bold text-amber-950">AUDITOR Role</h3>
            <p className="text-xs text-amber-800 mt-1">
              Global read-only observation. Can inspect statements and declined entries across all accounts, but cannot move money.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

