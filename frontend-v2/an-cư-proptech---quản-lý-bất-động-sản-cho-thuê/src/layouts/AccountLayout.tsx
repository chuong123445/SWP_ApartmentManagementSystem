import type { ReactNode } from 'react';
import { NavLink } from 'react-router';
import { CustomerLayout } from '@/layouts/CustomerLayout';
export function AccountLayout({ children }: { children: ReactNode }) {
  return <CustomerLayout><main className="max-w-5xl mx-auto px-5 py-8"><nav className="flex gap-3 border-b mb-6 pb-3" aria-label="Quản lý tài khoản">{[['/account/profile','Hồ sơ cá nhân'],['/account/settings','Cài đặt tài khoản']].map(([path,label]) => <NavLink key={path} to={path} className={({ isActive }) => `px-4 py-2 rounded-lg font-semibold text-sm ${isActive ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border'}`}>{label}</NavLink>)}</nav>{children}</main></CustomerLayout>;
}
