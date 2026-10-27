import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router';
import { VneidButton } from '@/components/auth/VneidButton';

export function AccountVerificationPage() {
  const { user, logout, isLoggingOut, error } = useAuth();
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md">
        <h1 className="text-xl font-bold text-slate-900">Xác thực tài khoản</h1>
        <p className="mt-3 text-sm text-slate-600">Xin chào {user!.fullName}. {user!.contactVerificationStatus === 'VERIFIED' ? 'Tài khoản đã xác thực.' : 'Bạn có thể xác thực bằng email hoặc VNeID mô phỏng trước khi gửi yêu cầu thuê hoặc sử dụng các chức năng quản lý.'}</p>
        <Link to="/" className="inline-block mt-3 text-sm text-emerald-700 underline">Tiếp tục xem căn hộ</Link>
        <Link to="/account/settings/email" className="block mt-3 text-sm text-emerald-700 underline">Xác thực email</Link>
        <VneidButton intent="verify" label="Xác thực bằng VNeID mô phỏng" />
        {error && <p role="alert" className="text-rose-700 text-sm mt-3">{error}</p>}
        <button onClick={logout} disabled={isLoggingOut} className="mt-6 px-4 py-2 rounded-lg bg-emerald-600 text-white">{isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}</button>
      </div>
    </main>
  );
}
