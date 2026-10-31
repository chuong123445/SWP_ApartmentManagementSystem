import { useEffect, useRef, useState } from 'react';

interface GoogleIdentity {
  accounts: { id: {
    initialize: (options: { client_id: string; nonce?: string; auto_select?: boolean; button_auto_select?: boolean; callback: (response: { credential: string }) => void }) => void;
    renderButton: (element: HTMLElement, options: Record<string, string | number>) => void;
  } };
}
declare global { interface Window { google?: GoogleIdentity } }

let scriptPromise: Promise<void> | undefined;
function loadGoogle() {
  if (window.google?.accounts.id) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => { script.remove(); scriptPromise = undefined; reject(new Error('Không thể tải đăng nhập Google. Vui lòng tải lại trang.')); };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

export function GoogleSignInButton({ onCredential, disabled, nonce }: {
  onCredential: (credential: string) => Promise<void>; disabled: boolean; nonce?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const callback = useRef(onCredential);
  const busy = useRef(disabled);
  callback.current = onCredential;
  busy.current = disabled;
  const [error, setError] = useState('');
  const clientId = (import.meta as ImportMeta & { env: Record<string, string> }).env.VITE_GOOGLE_CLIENT_ID;
  useEffect(() => {
    if (!clientId) return;
    let active = true;
    loadGoogle().then(() => {
      if (!active || !container.current || !window.google) return;
      window.google.accounts.id.initialize({ client_id: clientId, nonce, auto_select: false, button_auto_select: false, callback: response => {
        if (active && !busy.current) void callback.current(response.credential);
      } });
      window.google.accounts.id.renderButton(container.current, {
        type: 'standard', theme: 'outline', size: 'large', text: 'signin_with', locale: 'vi', width: 300,
      });
    }).catch(err => { if (active) setError(err.message); });
    return () => { active = false; container.current?.replaceChildren(); };
  }, [clientId, nonce]);
  if (!clientId) return <div className="mt-6">
    <div className="text-center text-xs text-slate-400 mb-4">Hoặc</div>
    <button type="button" disabled aria-describedby="google-configuration-notice"
      className="w-full flex items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-500 cursor-not-allowed">
      <span aria-hidden="true" className="text-lg font-bold">G</span>
      Đăng nhập bằng Google
    </button>
    <p id="google-configuration-notice" className="text-xs text-center text-slate-500 mt-2">
      Đăng nhập Google chưa được cấu hình.
    </p>
  </div>;
  return <div className="mt-6">
    <div className="text-center text-xs text-slate-400 mb-4">Hoặc đăng nhập bằng Google</div>
    <div ref={container} className={disabled ? 'flex justify-center pointer-events-none opacity-50' : 'flex justify-center'} aria-busy={disabled} />
    {error && <p role="alert" className="text-sm text-rose-700 mt-3">{error}</p>}
  </div>;
}
