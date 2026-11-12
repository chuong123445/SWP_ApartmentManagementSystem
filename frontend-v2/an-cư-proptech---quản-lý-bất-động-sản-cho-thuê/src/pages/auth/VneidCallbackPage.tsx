import { BrandLogo } from '@/components/navigation/BrandLogo';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth0 } from '@auth0/auth0-react';
import { useAuth } from '@/hooks/useAuth';
import { useVneidConfig } from '@/contexts/VneidContext';
import { verifyVneid, confirmVneid, cancelVneid, type VneidNameConfirmation } from '@/services/auth/vneidService';
import { loginDestination } from '@/utils/navigation';
export function VneidCallbackPage() {
  const { config, loading: configLoading, error: configError } = useVneidConfig();
  const { isLoading, error: auth0Error, isAuthenticated, getAccessTokenSilently } = useAuth0();
  const { user, loading, loginVneid, reloadUser } = useAuth();
  const location = useLocation(); const navigate = useNavigate(); const [error, setError] = useState('');
  const [pending, setPending] = useState<VneidNameConfirmation | null>(null);
  const [busy, setBusy] = useState(false);
  const operation = useRef<Promise<string | VneidNameConfirmation> | null>(null);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const expectedAccountId = location.state?.accountId;
  const accountChanged = location.state?.intent === 'verify' && (!user || user.id !== expectedAccountId);
  const destination = () => typeof location.state?.returnTo === 'string' && user
    ? loginDestination(user, location.state.returnTo) : '/account/verification';
  async function decide(confirm: boolean) {
    if (!pending || busy || accountChanged) return;
    setBusy(true); setError('');
    try {
      if (confirm) { await confirmVneid(pending.confirmationId); await reloadUser(); }
      else await cancelVneid(pending.confirmationId);
      if (mounted.current) navigate(confirm ? destination() : '/account/verification', { replace: true });
    } catch (e) {
      if (mounted.current) { setPending(null); setError(e instanceof Error ? e.message : 'Không thể hoàn tất xác nhận. Hãy bắt đầu lại.'); }
    } finally { if (mounted.current) setBusy(false); }
  }
  useEffect(() => {
    // Router có thể hoàn tất state sau SDK; chưa khởi tạo command khi state chưa đến.
    if (configLoading || loading || (config?.enabled && isLoading) || !config?.enabled || auth0Error || !location.state?.intent) return;
    let active = true;
    if (!operation.current) operation.current = (async () => {
      if (!isAuthenticated) throw new Error('Auth0 chưa xác nhận phiên đăng nhập. Hãy bắt đầu lại.');
      const verifying = location.state.intent === 'verify';
      if (verifying && (!user || user.id !== location.state.accountId)) throw new Error('Phiên tài khoản cần xác thực đã thay đổi. Hãy đăng nhập và bắt đầu lại.');
      if (!verifying && user) throw new Error('Bạn đang đăng nhập một tài khoản. Hãy dùng chức năng xác thực tài khoản để liên kết.');
      const token = await getAccessTokenSilently();
      if (!token) throw new Error('Auth0 chưa cấp access token cho API. Hãy kiểm tra cấu hình audience.');
      if (verifying) {
        const result = await verifyVneid(token);
        if ('confirmationId' in result) return result;
        await reloadUser();
        return typeof location.state.returnTo === 'string' ? loginDestination(user!, location.state.returnTo) : '/account/verification';
      }
      return loginDestination(await loginVneid(token), location.state.returnTo);
    })();
    operation.current.then(result => { if (active) {
      if (typeof result === 'string') navigate(result, { replace: true });
      else setPending(result);
    } })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : 'Không thể hoàn tất đăng nhập VNeID.'); });
    return () => { active = false; };
  }, [configLoading, config?.enabled, isLoading, loading, auth0Error, isAuthenticated, location.state, user, getAccessTokenSilently, loginVneid, reloadUser, navigate]);
  const message = error || (accountChanged && !loading ? 'Phiên tài khoản cần xác thực đã thay đổi. Hãy đăng nhập và bắt đầu lại.' : '') || (auth0Error ? 'Đăng nhập VNeID bị hủy hoặc không thành công. Hãy bắt đầu lại.' : '') || configError
    || (!configLoading && !config?.enabled ? 'VNeID chưa được cấu hình.' : '')
    || (config?.enabled && !isLoading && !location.state?.intent ? 'Không còn thông tin thao tác VNeID. Hãy bắt đầu lại.' : '');
  return <main className="min-h-dvh bg-brand-50 flex items-center justify-center p-6"><section className="w-full max-w-md bg-white border rounded-2xl p-7">
    <div className="mb-3"><BrandLogo /></div>
    <h1 className="text-xl font-bold">Hoàn tất xác thực VNeID</h1>
    {message ? <><p role="alert" className="mt-4 text-rose-700">{message}</p><Link to={user ? '/account/verification' : '/login'} className="inline-block mt-5 text-brand-700 underline">Quay lại để thử lại</Link></>
      : pending ? <div className="mt-4 space-y-4">
        <h2 className="font-semibold">Họ tên khác với tên hiển thị</h2>
        <dl className="space-y-3 break-words"><div><dt className="text-sm text-slate-500">Tên hiển thị của tài khoản</dt><dd className="font-medium">{pending.displayName}</dd></div>
          <div><dt className="text-sm text-slate-500">Họ tên theo VNeID mô phỏng</dt><dd className="font-medium">{pending.legalName}</dd></div></dl>
        <p className="text-sm text-slate-700">Chưa có danh tính nào được liên kết từ lượt này. Nếu xác nhận, hồ sơ cho thuê và hợp đồng mới sẽ sử dụng họ tên theo VNeID. Tên hiển thị được giữ nguyên và vẫn có thể chỉnh sửa. Hợp đồng đã lưu không bị thay đổi.</p>
        <p className="text-sm text-slate-500">Chỉ xác nhận nếu đây là danh tính của bạn. Xác nhận có hiệu lực tối đa 5 phút.</p>
        <div className="flex flex-wrap gap-3"><button type="button" disabled={busy || accountChanged} onClick={() => decide(true)} className="bg-brand-700 text-white rounded-lg px-4 py-2 disabled:opacity-50">{busy ? 'Đang xử lý...' : 'Xác nhận liên kết'}</button>
          <button type="button" disabled={busy || accountChanged} onClick={() => decide(false)} className="border rounded-lg px-4 py-2 disabled:opacity-50">Hủy liên kết</button></div>
      </div> : <p role="status" className="mt-4">Đang kiểm tra và hoàn tất đăng nhập...</p>}
  </section></main>;
}
