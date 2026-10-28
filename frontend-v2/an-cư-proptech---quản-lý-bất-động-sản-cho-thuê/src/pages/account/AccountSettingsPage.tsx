import { Link, useLocation } from 'react-router';
import { AccountLayout } from '@/layouts/AccountLayout';
import { useAccountProfile } from '@/hooks/useAccountProfile';
import { useAccountVerification } from '@/hooks/useAccountVerification';
export function AccountSettingsPage() {
  const { profile, error, loading, reload } = useAccountProfile();
  const verification = useAccountVerification();
  const location = useLocation();
  const linkClass = 'inline-block mt-4 border border-emerald-300 text-emerald-700 rounded-lg px-4 py-2 text-sm font-semibold';
  return <AccountLayout><h1 className="text-2xl font-bold mb-5">Cài đặt tài khoản</h1>
    {loading && <p role="status">Đang tải cài đặt...</p>}
    {error && <p role="alert" className="text-rose-700">{error}<button onClick={reload} className="ml-3 underline">Tải lại thông tin</button></p>}
    {typeof location.state?.notice === 'string' && <p role="status" className="bg-emerald-50 p-3 rounded-lg mb-4">{location.state.notice}</p>}
    {profile && !loading && <div className="space-y-5">
      {profile.roles.some(r=>r==='CUSTOMER'||r==='OWNER')&&<section className="bg-white border rounded-xl p-6"><h2 className="text-lg font-bold">Hồ sơ quyền cho thuê và thời hạn</h2><p className="text-sm text-slate-500 mt-2">Đã xác thực VNeID có thể nộp hồ sơ ủy quyền/thuê lại để Admin duyệt, kể cả chưa có tài sản chính chủ.</p><Link className={linkClass} to="/account/rental-properties">Quản lý hồ sơ quyền cho thuê</Link><Link className={`${linkClass} ml-3`} to="/account/property-notices">Thông báo thời hạn</Link></section>}
      {profile.roles.includes('CUSTOMER') && <section className="bg-white border rounded-xl p-6"><h2 className="text-lg font-bold">Cho thuê căn hộ</h2><p className="text-sm text-slate-500 mt-2">Mở chức năng chủ cho thuê sau khi xác thực CCCD và kiểm tra tài sản trong VNeID.</p><Link className={linkClass} to="/account/owner-upgrade">Trở thành chủ cho thuê</Link></section>}
      <section aria-label="Trạng thái xác thực tài khoản" className="bg-white border rounded-xl p-6"><h2 className="text-lg font-bold">Xác thực tài khoản</h2><p className="text-sm text-slate-500 mt-2">Xác thực bằng email hoặc liên kết VNeID mô phỏng.</p>
        {verification.loading && <p role="status" className="text-sm text-slate-500 mt-3">Đang tải trạng thái xác thực...</p>}
        {verification.error && <p role="alert" className="text-sm text-rose-700 mt-3">{verification.error}<button type="button" onClick={verification.reload} className="ml-2 underline">Thử lại</button></p>}
        {verification.data && <div className="flex flex-wrap gap-2 mt-3">
          <span className={`rounded-full px-3 py-1 text-sm ${verification.data.emailVerified ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>Email: {verification.data.emailVerified ? 'Đã xác thực' : 'Chưa xác thực'}</span>
          <span className={`rounded-full px-3 py-1 text-sm ${verification.data.vneid.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>CCCD / VNeID: {verification.data.vneid.status === 'VERIFIED' ? 'Đã xác thực' : 'Chưa xác thực'}</span>
        </div>}
        <Link className={linkClass} to="/account/verification">Quản lý xác thực tài khoản</Link></section>
      <section className="bg-white border rounded-xl p-6"><h2 className="text-lg font-bold">Mật khẩu</h2><p className="text-sm text-slate-500 mt-2">Quản lý mật khẩu đăng nhập của bạn.</p><Link className={linkClass} to="/account/settings/password">Đổi mật khẩu</Link></section>
      <section className="bg-white border rounded-xl p-6"><h2 className="text-lg font-bold">Email</h2><p className="text-sm text-slate-500 mt-2 break-all">{profile.email || 'Chưa thêm email'} · {profile.emailVerified ? 'Đã xác thực' : 'Chưa xác thực'}</p>
        {!profile.emailVerified && <Link className={linkClass} to="/account/settings/email">{profile.email ? 'Xác thực email' : 'Thêm email'}</Link>}
        {profile.email && <Link className={`${linkClass} ${!profile.emailVerified ? 'ml-3' : ''}`} to="/account/settings/email">{profile.emailVerified ? 'Cập nhật email' : 'Thêm email khác'}</Link>}
      </section>
      <section className="bg-white border rounded-xl p-6"><h2 className="text-lg font-bold">Số điện thoại</h2><p className="text-sm text-slate-500 mt-2">{profile.phone || 'Chưa thêm số điện thoại'} · {profile.phoneVerified ? 'Đã xác thực' : 'Chưa xác thực'}</p><Link className={linkClass} to="/account/settings/phone">Cập nhật số điện thoại</Link></section>
      <section className="bg-white border rounded-xl p-6"><h2 className="text-lg font-bold">Danh tính</h2><p className="text-sm text-slate-500 mt-2">{verification.data?.vneid.status === 'VERIFIED' ? 'Thông tin căn cước đã xác thực qua VNeID, không cần nhập lại.' : 'Xem thông tin căn cước hoặc lưu hồ sơ giấy tờ riêng tư.'}</p><Link className={linkClass} to="/account/settings/identity">{verification.data?.vneid.status === 'VERIFIED' ? 'Xem căn cước đã xác thực' : 'Quản lý thông tin căn cước'}</Link></section>
    </div>}
  </AccountLayout>;
}
