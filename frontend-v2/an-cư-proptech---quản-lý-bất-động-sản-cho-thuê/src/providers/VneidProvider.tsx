import { useEffect, useState, type ReactNode } from 'react';
import { Auth0Provider } from '@auth0/auth0-react';
import { useNavigate } from 'react-router';
import { VneidContext } from '@/contexts/VneidContext';
import { getVneidConfig, type VneidConfig } from '@/services/auth/vneidService';
export function VneidProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<VneidConfig | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;
    getVneidConfig().then(value => { if (active) setConfig(value); })
      .catch(() => { if (active) setError('Chưa tải được cấu hình VNeID. Hãy tải lại trang để thử lại.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const content = <VneidContext.Provider value={{ config, loading, error }}>{children}</VneidContext.Provider>;
  if (!config?.enabled) return content;
  return <Auth0Provider domain={new URL(config.issuer).hostname} clientId={config.clientId} cacheLocation="memory"
    authorizationParams={{ audience: config.audience, scope: 'openid profile email', redirect_uri: `${window.location.origin}/auth/vneid/callback` }}
    onRedirectCallback={appState => navigate('/auth/vneid/callback', { replace: true, state: {
      intent: appState?.intent === 'verify' ? 'verify' : 'login', accountId: appState?.accountId,
      returnTo: typeof appState?.returnTo === 'string' ? appState.returnTo : undefined,
    } })}>{content}</Auth0Provider>;
}
