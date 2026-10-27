import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router';
import { VneidButton } from '@/components/auth/VneidButton';
import { useAccountVerification } from '@/hooks/useAccountVerification';
import { VerifiedCitizenDetails } from '@/components/identity/VerifiedCitizenDetails';

export function AccountVerificationPage() {
  const { user, logout, isLoggingOut, error: sessionError } = useAuth();
  const { data, loading, error, reload } = useAccountVerification();
  return <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
    <div className="w-full bg-white rounded-2xl border border-slate-200 p-5 sm:p-8 max-w-2xl">
      <h1 className="text-xl font-bold text-slate-900">Xác thực tài khoản</h1>
      <p className="mt-3 text-sm text-slate-600">Xin chào {user!.fullName}. {user!.contactVerificationStatus === 'VERIFIED' ? 'Tài khoản đã xác thực.' : 'Bạn có thể xác thực bằng email hoặc VNeID mô phỏng trước khi gửi yêu cầu thuê hoặc sử dụng các chức năng quản lý.'}</p>
      <div className="flex flex-wrap gap-4 mt-3"><Link to="/" className="text-sm text-emerald-700 underline">Tiếp tục xem căn hộ</Link><Link to="/account/settings" className="text-sm text-emerald-700 underline">Cài đặt tài khoản</Link></div>
      {loading && <p role="status" className="mt-5 text-slate-600">Đang tải trạng thái xác thực...</p>}
      {error && <p role="alert" className="mt-5 text-rose-700">{error}<button type="button" onClick={reload} className="ml-2 underline">Thử lại</button></p>}
      {data && <div className="mt-6 space-y-4">
        <section aria-label="Xác thực email" className="border border-slate-200 rounded-xl p-4">
          <div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold">Email</h2><span className={data.emailVerified ? 'text-sm font-semibold text-emerald-700' : 'text-sm text-slate-500'}>{data.emailVerified ? 'Đã xác thực' : 'Chưa xác thực'}</span></div>
          <p className="text-sm text-slate-600 mt-2 break-all">{user!.email}</p>
          {!data.emailVerified && <Link to="/account/settings/email" className="inline-block mt-3 text-sm text-emerald-700 underline">Xác thực email</Link>}
        </section>
        <section id="vneid" aria-label="Xác thực VNeID" className="border border-slate-200 rounded-xl p-4">
          <div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold">VNeID</h2><span className={data.vneid.status === 'VERIFIED' ? 'text-sm font-semibold text-emerald-700' : 'text-sm text-slate-500'}>{data.vneid.status === 'VERIFIED' ? 'Đã xác thực' : 'Chưa xác thực'}</span></div>
          {data.vneid.status === 'VERIFIED' ? <VerifiedCitizenDetails verification={data.vneid} /> : <VneidButton intent="verify" label="Xác thực bằng VNeID mô phỏng" />}
        </section>
      </div>}
      {sessionError && <p role="alert" className="text-rose-700 text-sm mt-3">{sessionError}</p>}
      <button onClick={logout} disabled={isLoggingOut} className="mt-6 px-4 py-2 rounded-lg bg-emerald-600 text-white">{isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}</button>
    </div>
  </main>;
}
