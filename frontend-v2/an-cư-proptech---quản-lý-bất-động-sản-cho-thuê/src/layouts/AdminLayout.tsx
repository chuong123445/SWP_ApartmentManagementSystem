import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import {
  LayoutDashboard,
  ShieldCheck,
  FileEdit,
  UserRound,
  Settings,
  ExternalLink,
  Menu,
  X,
  LogOut,
  Building2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { AccountMenu } from '@/components/navigation/AccountMenu';

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  pendingDossierCount?: number;
  pendingEditCount?: number;
}

export function AdminLayout({
  children,
  title,
  subtitle,
  pendingDossierCount,
  pendingEditCount,
}: AdminLayoutProps) {
  const { user, logout, isLoggingOut, error: authError } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    {
      to: '/admin',
      label: 'Tổng quan Dashboard',
      icon: LayoutDashboard,
      active: location.pathname === '/admin' || location.pathname === '/admin/dashboard',
      badge: null,
    },
    {
      to: '/admin/property-dossiers',
      label: 'Duyệt hồ sơ bất động sản',
      icon: ShieldCheck,
      active: location.pathname.startsWith('/admin/property-dossiers'),
      badge: pendingDossierCount && pendingDossierCount > 0 ? pendingDossierCount : null,
      badgeColor: 'bg-amber-500 text-slate-900',
    },
    {
      to: '/admin/apartment-edits',
      label: 'Duyệt sửa đổi căn hộ',
      icon: FileEdit,
      active: location.pathname.startsWith('/admin/apartment-edits'),
      badge: pendingEditCount && pendingEditCount > 0 ? pendingEditCount : null,
      badgeColor: 'bg-emerald-500 text-slate-900',
    },
  ];

  const secondaryLinks = [
    { to: '/account/profile', label: 'Hồ sơ cá nhân', icon: UserRound },
    { to: '/account/settings', label: 'Cài đặt tài khoản', icon: Settings },
    { to: '/', label: 'Xem trang chủ sàn', icon: ExternalLink, external: true },
  ];

  return (
    <div className="flex h-screen bg-slate-100 font-sans antialiased text-slate-800 overflow-hidden">
      {/* Mobile Backdrop */}
      {menuOpen && (
        <button
          aria-label="Đóng menu quản trị"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        id="admin-sidebar"
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        } border-r border-slate-800 shadow-2xl md:shadow-none`}
      >
        {/* Brand header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <Link
            to="/admin"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-3 group focus:outline-none"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-900/40">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base text-white tracking-tight group-hover:text-emerald-400 transition-colors">
                  An Cư
                </span>
                <span className="text-xs bg-emerald-500/20 text-emerald-400 font-mono font-semibold px-1.5 py-0.5 rounded border border-emerald-500/30">
                  ADMIN
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Hệ thống Quản trị & Thẩm định</p>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            aria-label="Đóng menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <div>
            <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Phân hệ thẩm định
            </span>
            <nav className="mt-2 space-y-1">
              {navLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      item.active
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950 font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${item.active ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== null && (
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          item.badgeColor || 'bg-amber-400 text-slate-900'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div>
            <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Hệ thống & Cá nhân
            </span>
            <nav className="mt-2 space-y-1">
              {secondaryLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    target={item.external ? '_blank' : undefined}
                    rel={item.external ? 'noreferrer' : undefined}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all"
                  >
                    <Icon className="w-4 h-4 text-slate-400" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Verification standard badge */}
          <div className="mx-1 p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Chuẩn an toàn SWP391</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Kiểm duyệt 2 tầng: Đối chiếu hồ sơ quyền sở hữu và thẩm định mọi thay đổi nhạy cảm trước khi công khai.
            </p>
          </div>
        </div>

        {/* User profile footer */}
        {user && (
          <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold text-sm shrink-0">
                  {user.fullName?.charAt(0).toUpperCase() || 'A'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{user.fullName}</p>
                  <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                disabled={isLoggingOut}
                title="Đăng xuất"
                aria-label="Đăng xuất khỏi Admin Portal"
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-lg transition-colors disabled:opacity-50"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 md:px-8 py-3.5 flex items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label="Mở menu quản trị"
              onClick={() => setMenuOpen(true)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg md:text-xl font-bold text-slate-900 truncate">
                  {title || 'Bảng điều khiển Quản trị'}
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Hệ thống bảo mật
                </span>
              </div>
              {subtitle && <p className="text-xs text-slate-500 truncate hidden sm:block">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <AccountMenu
                account={user}
                onLogout={logout}
                isLoggingOut={isLoggingOut}
                authError={authError}
              />
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
