import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { ChevronDown, ClipboardList, LayoutDashboard, LogOut, Home, UserRound, ReceiptText, Settings } from 'lucide-react';
import type { AuthUser } from '@/types/auth';
import { hasManagementRole } from '@/utils/auth';

interface AccountMenuProps {
  account: AuthUser;
  onLogout: () => Promise<void>;
  isLoggingOut: boolean;
  authError: string;
  isTenant?: boolean;
}

export function AccountMenu({ account, onLogout, isLoggingOut, authError, isTenant = false }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);const trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();const location = useLocation();
  const manager = hasManagementRole(account);
  const canRent = account.roles.some(role => role === 'CUSTOMER' || role === 'OWNER');
  const roleLabel = account.roles.includes('OWNER') ? 'Chủ nhà (Owner)' : account.roles.includes('ADMIN') ? 'Quản trị viên (Admin)' : isTenant ? 'Cư dân (Tenant)' : 'Khách thuê (Customer)';
  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false);trigger.current?.focus(); } };
    document.addEventListener('pointerdown', outside);document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside);document.removeEventListener('keydown', escape); };
  }, [open]);
  const linkClass = 'flex items-center gap-2 px-3 py-2.5 rounded-lg text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 focus-visible:outline-emerald-600';
  return <div ref={root} className="relative">
    <button ref={trigger} type="button" aria-label="Vai trò và tài khoản" aria-expanded={open} aria-controls={menuId}
      onClick={() => setOpen(value => !value)} className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100">
      <span className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center"><UserRound className="w-4 h-4" /></span>
      <span className="text-left hidden sm:block"><span className="block text-xs font-bold text-slate-900">{roleLabel}</span><span className="block text-[11px] text-slate-500 max-w-36 truncate">{account.fullName}</span></span>
      <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <nav id={menuId} aria-label="Điều hướng tài khoản" className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 text-sm">
      <div className="px-3 py-2 mb-1 border-b border-slate-100"><p className="font-semibold text-slate-900">{roleLabel}</p><p className="text-xs text-slate-500 truncate">{account.email}</p></div>
      {manager && <Link to="/app" onClick={() => setOpen(false)} className={linkClass}><LayoutDashboard className="w-4 h-4" />Trang quản lý</Link>}
      {canRent&&<Link to="/my/home" onClick={()=>setOpen(false)} className={linkClass}><Home className="w-4 h-4"/>Nhà đang thuê</Link>}
      {canRent && <Link to="/my/rental-requests" onClick={() => setOpen(false)} className={linkClass}><ClipboardList className="w-4 h-4" />Yêu cầu & hợp đồng</Link>}
      {canRent&&<Link to="/my/invoices" onClick={()=>setOpen(false)} className={linkClass}><ReceiptText className="w-4 h-4"/>Hóa đơn của tôi</Link>}
      <Link to="/account/settings" onClick={()=>setOpen(false)} className={linkClass}><Settings className="w-4 h-4"/>Cài đặt tài khoản</Link>
      <Link to="/account/profile" onClick={() => setOpen(false)} className={linkClass}><UserRound className="w-4 h-4" />Hồ sơ & tài khoản</Link>
      {canRent&&<details className="border-t border-slate-100 mt-2 pt-1"><summary className={`${linkClass} cursor-pointer text-xs`}>{manager?'Hồ sơ cho thuê':'Dành cho người muốn cho thuê'}</summary><div className="pl-2 border-l border-slate-100 ml-3">
        <Link to="/account/properties" onClick={()=>setOpen(false)} className={linkClass}><LayoutDashboard className="w-4 h-4"/>Quản lý tài sản</Link>
        <Link to="/account/rental-properties" onClick={()=>setOpen(false)} className={linkClass}><ClipboardList className="w-4 h-4"/>Hồ sơ quyền cho thuê</Link>
        <Link to="/account/property-notices" onClick={()=>setOpen(false)} className={linkClass}><ClipboardList className="w-4 h-4"/>Thông báo thời hạn</Link>
      </div></details>}
      <div className="border-t border-slate-100 mt-1 pt-1">
        {authError && <p role="alert" className="px-3 py-2 text-rose-700 text-xs">{authError}</p>}
        <button id="btn-logout" type="button" onClick={onLogout} disabled={isLoggingOut} className="w-full flex items-center gap-2 text-left px-3 py-2.5 rounded-lg text-rose-700 hover:bg-rose-50 disabled:opacity-50"><LogOut className="w-4 h-4" />{isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}</button>
      </div>
    </nav>}
  </div>;
}
