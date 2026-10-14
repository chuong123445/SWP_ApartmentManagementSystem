import { Link, useLocation } from 'react-router';
import { AccountLayout } from '@/layouts/AccountLayout';
import { useAccountProfile } from '@/hooks/useAccountProfile';
export function AccountSettingsPage() {
  const { profile, error, loading, reload } = useAccountProfile();
  const location = useLocation();
  const linkClass = 'inline-block mt-4 border border-emerald-300 text-emerald-700 rounded-lg px-4 py-2 text-sm font-semibold';
  return <AccountLayout><h1 className="text-2xl font-bold mb-5">Cài đặt tài khoản</h1>
    {loading && <p role="status">Đang tải cài đặt...</p>}
    {error && <p role="alert" className="text-rose-700">{error}<button onClick={reload} className="ml-3 underline">Tải lại thông tin</button></p>}
    {typeof location.state?.notice === 'string' && <p role="status" className="bg-emerald-50 p-3 rounded-lg mb-4">{location.state.notice}</p>}
    {profile && !loading && <div className="space-y-5">
      <section className="bg-white border rounded-xl p-6"><h2 className="text-lg font-bold">Mật khẩu</h2><p className="text-sm text-slate-500 mt-2">Quản lý mật khẩu đăng nhập của bạn.</p><Link className={linkClass} to="/account/settings/password">Đổi mật khẩu</Link></section>
      <section className="bg-white border rounded-xl p-6"><h2 className="text-lg font-bold">Email</h2><p className="text-sm text-slate-500 mt-2 break-all">{profile.email || 'Chưa thêm email'} · {profile.emailVerified ? 'Đã xác thực' : 'Chưa xác thực'}</p>
        {!profile.emailVerified && <Link className={linkClass} to="/account/settings/email">{profile.email ? 'Xác thực email' : 'Thêm email'}</Link>}
        {profile.email && <Link className={`${linkClass} ${!profile.emailVerified ? 'ml-3' : ''}`} to="/account/settings/email">{profile.emailVerified ? 'Cập nhật email' : 'Thêm email khác'}</Link>}
      </section>
      <section className="bg-white border rounded-xl p-6"><h2 className="text-lg font-bold">Số điện thoại</h2><p className="text-sm text-slate-500 mt-2">{profile.phone || 'Chưa thêm số điện thoại'} · {profile.phoneVerified ? 'Đã xác thực' : 'Chưa xác thực'}</p><Link className={linkClass} to="/account/settings/phone">Cập nhật số điện thoại</Link></section>
      <section className="bg-white border rounded-xl p-6"><h2 className="text-lg font-bold">Danh tính</h2><p className="text-sm text-slate-500 mt-2">Quản lý thông tin căn cước, địa chỉ và ảnh giấy tờ riêng tư. Hiện hỗ trợ lưu hồ sơ; chưa hỗ trợ kiểm tra eKYC.</p><Link className={linkClass} to="/account/settings/identity">Xác thực danh tính</Link></section>
    </div>}
  </AccountLayout>;
}
