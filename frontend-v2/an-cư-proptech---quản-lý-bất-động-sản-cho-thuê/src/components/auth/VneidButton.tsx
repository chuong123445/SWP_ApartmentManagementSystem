import { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useVneidConfig } from '@/contexts/VneidContext';
import { useAuth } from '@/hooks/useAuth';
export function VneidButton({ intent, label }: { intent: 'login' | 'verify'; label: string }) {
  const { config, loading, error: configError } = useVneidConfig();
  const { loginWithRedirect, isLoading } = useAuth0(); const { user } = useAuth();
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const start = async () => {
    if (!config?.enabled || busy) return;
    if (intent === 'verify' && !user) { setError('Vui lòng đăng nhập tài khoản cần xác thực.'); return; }
    setBusy(true); setError('');
    try {
      // Phiên SSO Auth0 có thể còn sau logout nội bộ; yêu cầu nhập lại tài khoản khi bấm nút.
      await loginWithRedirect({ appState: { intent, accountId: intent === 'verify' ? user!.id : undefined },
        authorizationParams: { connection: config.connection, prompt: 'login' } });
    }
    catch { setError('Không thể mở đăng nhập VNeID. Vui lòng thử lại.'); setBusy(false); }
  };
  return <div className="mt-5">
    <button type="button" onClick={start} disabled={loading || !config?.enabled || isLoading || busy}
      className="w-full border border-emerald-600 text-emerald-800 rounded-lg px-4 py-3 font-semibold disabled:opacity-50">
      {busy ? 'Đang chuyển đến VNeID...' : label}
    </button>
    {(error || configError) && <p role="alert" className="text-sm text-rose-700 mt-2">{error || configError}</p>}
    {!loading && !config?.enabled && !configError && <p className="text-sm text-slate-500 mt-2">VNeID chưa được cấu hình. Bạn vẫn có thể sử dụng email và mật khẩu.</p>}
  </div>;
}
