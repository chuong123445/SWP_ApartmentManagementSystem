import { SiteHeader } from '@/components/navigation/SiteHeader';
import type { ReactNode } from 'react';
import '@/styles/home.css';
import { useAuth } from '@/hooks/useAuth';
import { useMyTenancies } from '@/hooks/useMyTenancies';
import { TenancyContext } from '@/contexts/TenancyContext';

export function CustomerLayout({ children }: { children: ReactNode }) {
  const { user, logout, isLoggingOut, error } = useAuth();
  const tenancy = useMyTenancies();
  return <TenancyContext.Provider key={user?.id ?? 'public'} value={tenancy}><div className="customer-shell min-h-screen">
    <SiteHeader account={user} onLogout={logout} isLoggingOut={isLoggingOut} authError={error} isTenant={tenancy.tenancies.some(contract => contract.status === 'ACTIVE')} />

    {children}
    <footer className="home-wrap customer-footer"><span>© 2026 An Cư PropTech</span><span>Tìm căn hộ · Quản lý cho thuê · Kết nối nhu cầu</span></footer>
  </div></TenancyContext.Provider>;
}
