import { Link } from 'react-router';
import type { AuthUser } from '@/types/auth';
import { Building2 } from 'lucide-react';
import { HeaderLinks } from './HeaderLinks';
import { NotificationBell } from './NotificationBell';
import { AccountMenu } from './AccountMenu';
import '@/styles/home.css';

interface SiteHeaderProps {
  account: AuthUser | null;
  onLogout: () => Promise<void>;
  isLoggingOut: boolean;
  authError: string;
}
export function SiteHeader({ account, onLogout, isLoggingOut, authError }: SiteHeaderProps) {
  return <header className="customer-header site-header sticky top-0 z-30 shrink-0">
    <div className="home-wrap customer-header-inner">
      <Link to="/" className="customer-logo" aria-label="An Cư PropTech"><span className="customer-mark"><Building2 size={27} strokeWidth={1.7} aria-hidden="true" /></span><span className="brand-lockup">An Cư<small>PROPTECH</small></span></Link>
      <div className="customer-nav">
        {account ? <HeaderLinks /> : <Link to="/" className="customer-home-link">Trang chủ</Link>}
        {account && <NotificationBell key={account.id} accountId={account.id} />}
        {account ? <AccountMenu account={account} onLogout={onLogout} isLoggingOut={isLoggingOut} authError={authError} /> : <><Link to="/login" className="customer-login">Đăng nhập</Link><Link to="/register" className="home-primary customer-register">Đăng ký</Link></>}
      </div>
    </div>
  </header>;
}
