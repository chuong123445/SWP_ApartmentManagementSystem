import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth0 } from '@auth0/auth0-react';
import { useAuth } from '@/hooks/useAuth';
import { useVneidConfig } from '@/contexts/VneidContext';
import { verifyVneid } from '@/services/auth/vneidService';
import { loginDestination } from '@/utils/navigation';
export function VneidCallbackPage() {
  const { config, loading: configLoading, error: configError } = useVneidConfig();
  const { isLoading, error: auth0Error, isAuthenticated, getAccessTokenSilently } = useAuth0();
  const { user, loading, loginVneid, reloadUser } = useAuth();
  const location = useLocation(); const navigate = useNavigate(); const [error, setError] = useState('');
  const operation = useRef<Promise<string> | null>(null);
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
      if (verifying) { await verifyVneid(token); await reloadUser(); return '/account/verification'; }
      return loginDestination(await loginVneid(token), undefined);
    })();
    operation.current.then(path => { if (active) navigate(path, { replace: true }); })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : 'Không thể hoàn tất đăng nhập VNeID.'); });
    return () => { active = false; };
  }, [configLoading, config?.enabled, isLoading, loading, auth0Error, isAuthenticated, location.state, user, getAccessTokenSilently, loginVneid, reloadUser, navigate]);
  const message = error || (auth0Error ? 'Đăng nhập VNeID bị hủy hoặc không thành công. Hãy bắt đầu lại.' : '') || configError
    || (!configLoading && !config?.enabled ? 'VNeID chưa được cấu hình.' : '')
    || (config?.enabled && !isLoading && !location.state?.intent ? 'Không còn thông tin thao tác VNeID. Hãy bắt đầu lại.' : '');
  return <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6"><section className="w-full max-w-md bg-white border rounded-2xl p-7">
    <h1 className="text-xl font-bold">Hoàn tất xác thực VNeID</h1>
    {message ? <><p role="alert" className="mt-4 text-rose-700">{message}</p><Link to={user ? '/account/verification' : '/login'} className="inline-block mt-5 text-emerald-700 underline">Quay lại để thử lại</Link></>
      : <p role="status" className="mt-4">Đang kiểm tra và hoàn tất đăng nhập...</p>}
  </section></main>;
}
