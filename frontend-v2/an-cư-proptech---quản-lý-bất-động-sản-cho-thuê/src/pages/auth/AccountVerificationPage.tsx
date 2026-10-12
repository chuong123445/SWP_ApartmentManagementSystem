import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router';

export function AccountVerificationPage() {
  const { user, logout, isLoggingOut, error } = useAuth();
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md">
        <h1 className="text-xl font-bold text-slate-900">Tài khoản cần xác minh</h1>
        <p className="mt-3 text-sm text-slate-600">Xin chào {user!.fullName}. Tài khoản của bạn chưa được phép truy cập các chức năng quản lý.</p>
        <Link to="/" className="inline-block mt-3 text-sm text-emerald-700 underline">Tiếp tục xem căn hộ</Link>
        <Link to="/account/settings" className="block mt-3 text-sm text-emerald-700 underline">Xác minh email trong cài đặt tài khoản</Link>
        {error && <p role="alert" className="text-rose-700 text-sm mt-3">{error}</p>}
        <button onClick={logout} disabled={isLoggingOut} className="mt-6 px-4 py-2 rounded-lg bg-emerald-600 text-white">{isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}</button>
      </div>
    </main>
  );
}
