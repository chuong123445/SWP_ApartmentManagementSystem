import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Building2, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { hasManagementRole } from '@/utils/auth';
import { useMyTenancies } from '@/hooks/useMyTenancies';
import { TenancyContext } from '@/contexts/TenancyContext';

export function CustomerLayout({ children }: { children: ReactNode }) {
  const { user, logout, isLoggingOut, error } = useAuth();
  const tenancy = useMyTenancies();
  return <TenancyContext.Provider key={user?.id ?? 'public'} value={tenancy}><div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-5 py-4 flex flex-wrap items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3 font-bold text-xl text-slate-900"><span className="bg-emerald-600 p-2 rounded-xl text-white"><Building2 className="w-5 h-5" /></span>An Cư PropTech</Link>
        <nav className="flex flex-wrap items-center gap-5 text-sm font-medium">
          <Link to="/" className="hover:text-emerald-700">Tìm căn hộ</Link>
          {user?.roles.includes('CUSTOMER') && <Link to="/my/rental-requests" className="hover:text-emerald-700">Yêu cầu của tôi</Link>}
          {tenancy.tenancies.length > 0 && <Link to="/my/invoices" className="hover:text-emerald-700">Hóa đơn của tôi</Link>}
          {user && hasManagementRole(user) && <Link to="/app" className="hover:text-emerald-700">Trang quản lý</Link>}
          {user && <><Link to="/account/profile" className="hover:text-emerald-700">Hồ sơ cá nhân</Link><Link to="/account/settings" className="hover:text-emerald-700">Cài đặt tài khoản</Link></>}
          {user ? <><span className="text-slate-500">{user.fullName}</span><button onClick={logout} disabled={isLoggingOut} className="flex items-center gap-1.5 text-rose-700 disabled:opacity-50"><LogOut className="w-4 h-4" />{isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}</button></>
            : <Link to="/login" className="bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white px-4 py-2">Đăng nhập</Link>}
        </nav>
      </div>
      {error && user && <p role="alert" className="max-w-7xl mx-auto px-5 pb-3 text-rose-700 text-sm">{error}</p>}
    </header>
    {children}
    <footer className="max-w-7xl mx-auto px-5 py-8 text-xs text-slate-500">An Cư PropTech · Kết nối người thuê và chủ nhà</footer>
  </div></TenancyContext.Provider>;
}
