import { Link } from 'react-router';
import { useAuth } from '@/hooks/useAuth';
import { hasManagementRole } from '@/utils/auth';

export function HeaderLinks() {
  const { user } = useAuth();
  return <nav aria-label="Điều hướng chính" className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm font-semibold">
    <Link to="/" className="rounded-lg px-2 py-2 text-emerald-800 hover:bg-emerald-50">Trang chủ</Link>
    {user && hasManagementRole(user) && <Link to={user.roles.includes('ADMIN') ? '/admin/property-dossiers' : '/app?tab=dashboard'} className="rounded-lg px-2 py-2 text-emerald-800 hover:bg-emerald-50">Trang quản lý</Link>}
    <Link to="/account/properties/new" className="rounded-lg px-2 py-2 text-emerald-800 hover:bg-emerald-50">Đăng cho thuê</Link>
    <Link to="/my/home" className="rounded-lg px-2 py-2 text-emerald-800 hover:bg-emerald-50">Nhà đang thuê</Link>
  </nav>;
}
