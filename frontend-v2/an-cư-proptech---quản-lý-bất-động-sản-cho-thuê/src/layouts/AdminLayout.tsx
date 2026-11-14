import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { AccountMenu } from '@/components/navigation/AccountMenu';
import { BrandLogo } from '@/components/navigation/BrandLogo';
import { useAuth } from '@/hooks/useAuth';

export function AdminLayout({ children }: { children: ReactNode }) {
  const { user, logout, isLoggingOut, error } = useAuth();
  return <div className="min-h-dvh bg-brand-50 text-slate-800">
    <header className="bg-white border-b border-brand-100 px-4 md:px-8 py-3 flex items-center justify-between gap-3">
      <Link to="/" aria-label="An Cư PropTech"><BrandLogo /></Link>
      {user && <AccountMenu account={user} onLogout={logout} isLoggingOut={isLoggingOut}
        authError={error} showAccountLinks={false} />}
    </header>
    <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-5">{children}</main>
  </div>;
}
