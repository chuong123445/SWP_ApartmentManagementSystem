import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth0 } from '@auth0/auth0-react';
import { useAuth } from '@/hooks/useAuth';
import { useVneidConfig } from '@/contexts/VneidContext';
import { verifyVneid, confirmVneid, cancelVneid, type VneidNameConfirmation } from '@/services/auth/vneidService';
import { loginDestination } from '@/utils/navigation';
import { ApiError } from '@/services/http/client';
import { normalizeVietnamesePhone, vietnamesePhoneHint } from '@/utils/vietnamesePhone';
export function VneidCallbackPage() {
  const { config, loading: configLoading, error: configError } = useVneidConfig();
  const { isLoading, error: auth0Error, isAuthenticated, getAccessTokenSilently } = useAuth0();
  const { user, loading, loginVneid, reloadUser } = useAuth();
  const location = useLocation(); const navigate = useNavigate(); const [error, setError] = useState('');
  const [pending, setPending] = useState<VneidNameConfirmation | null>(null);
  const [busy, setBusy] = useState(false);
  const [contactRequired, setContactRequired] = useState(false);
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const submittingContact = useRef(false);
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
      .catch(e => { if (active) {
        if(e instanceof ApiError && e.code==='VNEID_CONTACT_REQUIRED'){setContactRequired(true);setError('');}
        else setError(e instanceof Error ? e.message : 'Không thể hoàn tất đăng nhập VNeID.');
      } });
    return () => { active = false; };
  }, [configLoading, config?.enabled, isLoading, loading, auth0Error, isAuthenticated, location.state, user, getAccessTokenSilently, loginVneid, reloadUser, navigate]);
  const message = error || (accountChanged && !loading ? 'Phiên tài khoản cần xác thực đã thay đổi. Hãy đăng nhập và bắt đầu lại.' : '') || (auth0Error ? 'Đăng nhập VNeID bị hủy hoặc không thành công. Hãy bắt đầu lại.' : '') || configError
    || (!configLoading && !config?.enabled ? 'VNeID chưa được cấu hình.' : '')
    || (config?.enabled && !isLoading && !location.state?.intent ? 'Không còn thông tin thao tác VNeID. Hãy bắt đầu lại.' : '');
  return <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6"><section className="w-full max-w-md bg-white border rounded-2xl p-7">
    <h1 className="text-xl font-bold">Hoàn tất xác thực VNeID</h1>
    {contactRequired && !user ? <form className="mt-4 space-y-4" onSubmit={async event=>{
      event.preventDefault();if(submittingContact.current)return;
      if(!normalizeVietnamesePhone(contactPhone)){setError(vietnamesePhoneHint);return;}
      submittingContact.current=true;setBusy(true);setError('');
      try{const token=await getAccessTokenSilently();if(!token)throw new Error('Phiên Auth0 đã hết hạn. Hãy đăng nhập lại.');const account=await loginVneid(token,{email:contactEmail.trim(),phone:contactPhone});if(mounted.current)navigate(loginDestination(account,location.state?.returnTo),{replace:true});}
      catch(e){if(mounted.current)setError(e instanceof Error?e.message:'Không thể lưu thông tin liên hệ.');}
      finally{submittingContact.current=false;if(mounted.current)setBusy(false);}
    }}>
      <h2 className="font-semibold">Bổ sung thông tin liên hệ</h2>
      <p className="text-sm text-slate-600">Nhập email và số điện thoại của bạn để hoàn tất đăng nhập. Thông tin liên hệ được lưu riêng với căn cước; số điện thoại chưa được xác minh.</p>
      {error&&<p role="alert" className="text-sm text-rose-700">{error}</p>}
      <label className="block text-sm" htmlFor="vneid-contact-email">Email liên hệ</label><input id="vneid-contact-email" type="email" required maxLength={254} autoComplete="email" disabled={busy} value={contactEmail} onChange={e=>setContactEmail(e.target.value)} className="w-full rounded-lg border p-3"/>
      <label className="block text-sm" htmlFor="vneid-contact-phone">Số điện thoại</label><input id="vneid-contact-phone" type="tel" required maxLength={20} autoComplete="tel" aria-describedby="vneid-phone-hint" disabled={busy} value={contactPhone} onChange={e=>setContactPhone(e.target.value)} className="w-full rounded-lg border p-3"/>
      <p id="vneid-phone-hint" className="text-xs text-slate-500">{vietnamesePhoneHint}</p>
      <button type="submit" disabled={busy} className="w-full rounded-lg bg-emerald-700 px-4 py-3 font-semibold text-white disabled:opacity-50">{busy?'Đang lưu...':'Lưu và hoàn tất đăng nhập'}</button>
      <Link to="/login" className="inline-block text-sm text-emerald-700 underline">Quay lại đăng nhập</Link>
    </form> : message ? <><p role="alert" className="mt-4 text-rose-700">{message}</p><Link to={user ? '/account/verification' : '/login'} className="inline-block mt-5 text-emerald-700 underline">Quay lại để thử lại</Link></>
      : pending ? <div className="mt-4 space-y-4">
        <h2 className="font-semibold">Họ tên khác với tên hiển thị</h2>
        <dl className="space-y-3 break-words"><div><dt className="text-sm text-slate-500">Tên hiển thị của tài khoản</dt><dd className="font-medium">{pending.displayName}</dd></div>
          <div><dt className="text-sm text-slate-500">Họ tên theo VNeID mô phỏng</dt><dd className="font-medium">{pending.legalName}</dd></div></dl>
        <p className="text-sm text-slate-700">Chưa có danh tính nào được liên kết từ lượt này. Nếu xác nhận, hồ sơ cho thuê và hợp đồng mới sẽ sử dụng họ tên theo VNeID. Tên hiển thị được giữ nguyên và vẫn có thể chỉnh sửa. Hợp đồng đã lưu không bị thay đổi.</p>
        <p className="text-sm text-slate-500">Chỉ xác nhận nếu đây là danh tính của bạn. Xác nhận có hiệu lực tối đa 5 phút.</p>
        <div className="flex flex-wrap gap-3"><button type="button" disabled={busy || accountChanged} onClick={() => decide(true)} className="bg-emerald-700 text-white rounded-lg px-4 py-2 disabled:opacity-50">{busy ? 'Đang xử lý...' : 'Xác nhận liên kết'}</button>
          <button type="button" disabled={busy || accountChanged} onClick={() => decide(false)} className="border rounded-lg px-4 py-2 disabled:opacity-50">Hủy liên kết</button></div>
      </div> : <p role="status" className="mt-4">Đang kiểm tra và hoàn tất đăng nhập...</p>}
  </section></main>;
}
