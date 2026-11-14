import {ManualIdentityForm} from '@/components/identity/ManualIdentityForm';
import { Link, useLocation } from 'react-router';
import { AccountLayout } from '@/layouts/AccountLayout';
import { VneidButton } from '@/components/auth/VneidButton';
import { VerifiedCitizenPanel } from '@/components/identity/VerifiedCitizenDetails';
import { useAccountVerification } from '@/hooks/useAccountVerification';

export function IdentityPage() {
  const verification = useAccountVerification();
  const verified = verification.data?.vneid.status === 'VERIFIED';
  const location = useLocation();
  const returnTo = typeof location.state?.returnTo === 'string' ? location.state.returnTo : '/account/settings';
  const isFromApartment = typeof location.state?.returnTo === 'string' && location.state.returnTo.startsWith('/apartments');
  const isFromManagement = typeof location.state?.returnTo === 'string' && (location.state.returnTo === '/app' || location.state.returnTo.startsWith('/app/'));
  const returnLabel = typeof location.state?.returnLabel === 'string'
    ? location.state.returnLabel
    : isFromApartment
      ? 'Quay lại xem căn hộ'
      : isFromManagement
        ? 'Quay lại trang quản lý'
        : typeof location.state?.returnTo === 'string'
          ? 'Quay lại'
          : 'Quay lại cài đặt tài khoản';

  return <AccountLayout>
    <Link to={returnTo} className="text-emerald-700 underline text-sm">{returnLabel}</Link>
    <h1 className="app-page-title mt-4 mb-3">Xác thực danh tính</h1>
    <p className="text-slate-600 mb-5">{'Bạn có thể nhập hồ sơ căn cước để Admin xét duyệt hoặc sử dụng lựa chọn VNeID mô phỏng qua Auth0.'}</p>
    <VerifiedCitizenPanel state={verification} />
    {!verification.loading&&!verification.error&&!verified&&<ManualIdentityForm onRefresh={verification.reload}/>}
    {!verification.loading && !verification.error && verification.data && !verified && <section className="app-panel p-4 sm:p-6">
      <h2 className="font-semibold text-slate-900">Căn cước · Chưa xác thực</h2>
      <p className="text-sm text-slate-600 mt-2">Tiếp tục đến VNeID mô phỏng để xác thực căn cước cho tài khoản hiện tại.</p>
      <VneidButton intent="verify" label="Xác thực bằng VNeID mô phỏng" />
    </section>}
  </AccountLayout>;
}
