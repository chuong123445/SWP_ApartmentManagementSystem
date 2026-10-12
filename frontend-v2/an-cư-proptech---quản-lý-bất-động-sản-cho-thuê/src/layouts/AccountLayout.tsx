import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { hasManagementRole } from '@/utils/auth';
import { CustomerLayout } from '@/layouts/CustomerLayout';
export function AccountLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();const manager = !!user && hasManagementRole(user);
  return <CustomerLayout><main className="max-w-5xl mx-auto px-5 py-8">
    <Link to={manager ? '/app' : '/'} className="inline-flex items-center gap-2 mb-5 text-sm font-semibold text-emerald-700 hover:underline"><ArrowLeft className="w-4 h-4" />{manager ? 'Quay lại trang quản lý' : 'Quay lại trang chủ'}</Link>
    <nav className="flex flex-wrap gap-3 border-b mb-6 pb-3" aria-label="Quản lý tài khoản">{[['/account/profile','Hồ sơ cá nhân'],['/account/settings','Cài đặt tài khoản']].map(([path,label]) => <NavLink key={path} to={path} className={({ isActive }) => `px-4 py-2 rounded-lg font-semibold text-sm ${isActive ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border'}`}>{label}</NavLink>)}</nav>{children}</main></CustomerLayout>;
}
