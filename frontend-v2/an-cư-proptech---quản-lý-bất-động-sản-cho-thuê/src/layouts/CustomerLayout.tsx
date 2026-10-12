import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { HomeIcon } from '@/components/apartments/HomeIcon';
import '@/styles/home.css';
import { useAuth } from '@/hooks/useAuth';
import { AccountMenu } from '@/components/navigation/AccountMenu';
import { useMyTenancies } from '@/hooks/useMyTenancies';
import { TenancyContext } from '@/contexts/TenancyContext';

export function CustomerLayout({ children }: { children: ReactNode }) {
  const { user, logout, isLoggingOut, error } = useAuth();
  const tenancy = useMyTenancies();
  return <TenancyContext.Provider key={user?.id ?? 'public'} value={tenancy}><div className="customer-shell min-h-screen">
    <header className="customer-header sticky top-0 z-30">
      <div className="home-wrap customer-header-inner">
        <Link to="/" className="customer-logo" aria-label="An Cư PropTech"><span className="customer-mark"><HomeIcon name="apartment" /></span><span>An Cư<small>PROPTECH</small></span></Link>
        <nav className="customer-nav">
          <Link to="/" className="customer-home-link">Trang chủ</Link>
          {user ? <AccountMenu account={user} onLogout={logout} isLoggingOut={isLoggingOut} authError={error}
            hasInvoiceHistory={tenancy.tenancies.length > 0} isTenant={tenancy.tenancies.some(contract => contract.status === 'ACTIVE')} />
            : <><Link to="/login" className="customer-login">Đăng nhập</Link><Link to="/register" className="home-primary customer-register">Đăng ký</Link></>}
        </nav>
      </div>
      {error && user && <p role="alert" className="max-w-7xl mx-auto px-5 pb-3 text-rose-700 text-sm">{error}</p>}
    </header>
    {children}
    <footer className="home-wrap customer-footer"><span>© 2026 An Cư PropTech</span><span>Tìm căn hộ · Quản lý cho thuê · Kết nối nhu cầu</span></footer>
  </div></TenancyContext.Provider>;
}
