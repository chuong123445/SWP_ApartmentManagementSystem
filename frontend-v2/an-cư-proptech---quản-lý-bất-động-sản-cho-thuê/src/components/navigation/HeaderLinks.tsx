import { Link } from 'react-router';

export function HeaderLinks({ embeddedHome = false }: { embeddedHome?: boolean }) {
  return <nav aria-label="Điều hướng chính" className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm font-semibold">
    <Link to={embeddedHome ? '/app?tab=home' : '/'} className="rounded-lg px-2 py-2 text-emerald-800 hover:bg-emerald-50">Trang chủ</Link>
    <Link to="/account/properties/new" className="rounded-lg px-2 py-2 text-emerald-800 hover:bg-emerald-50">Đăng cho thuê</Link>
    <Link to="/my/home" className="rounded-lg px-2 py-2 text-emerald-800 hover:bg-emerald-50">Nhà đang thuê</Link>
  </nav>;
}
