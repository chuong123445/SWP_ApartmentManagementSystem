import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { AccountMenu } from '@/components/navigation/AccountMenu';
import { useAuth } from '@/hooks/useAuth';

export function AdminLayout({ children }: { children: ReactNode }) {
  const { user, logout, isLoggingOut, error } = useAuth();
  return <div className="min-h-screen bg-slate-50 text-slate-800">
    <header className="bg-white border-b px-4 md:px-8 py-4 flex items-center justify-between gap-3">
      <Link to="/" className="font-bold text-emerald-700">An Cư PropTech</Link>
      {user && <AccountMenu account={user} onLogout={logout} isLoggingOut={isLoggingOut}
        authError={error} showAccountLinks={false} />}
    </header>
    <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-5">{children}</main>
  </div>;
}
