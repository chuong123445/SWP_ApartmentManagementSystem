import { AuthContext } from '@/contexts/AuthContext';
import type { AuthSession, AuthUser } from '@/types/auth';
import React, { useEffect, useRef, useState } from 'react';
import * as authApi from '@/services/auth/authService';
import { ApiError, setAccessToken, setRefreshHandler } from '@/services/http/client';
import { currentUser } from '@/services/auth/accountService';
import { vneidLogin } from '@/services/auth/vneidService';
import { useAuth0 } from '@auth0/auth0-react';
import { useVneidConfig } from '@/contexts/VneidContext';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { logout: clearAuth0 } = useAuth0();
  const { config } = useVneidConfig();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const loggingOut = useRef(false);

  const apply = (session: AuthSession) => {
    setAccessToken(session.accessToken);
    setUser(session.user);
    setError('');
  };

  useEffect(() => {
    let active = true;
    const restore = async () => {
      if (loggingOut.current) throw new ApiError('Đang đăng xuất.', 401);
      const current = generation.current;
      try {
        const session = await authApi.refresh();
        if (active && current === generation.current) apply(session);
      } catch (err) {
        if (active && current === generation.current) {
          setAccessToken(null);
          setUser(null);
          if (!(err instanceof ApiError) || ![401, 403].includes(err.status)) {
            setError(err instanceof Error ? err.message : 'Không thể kiểm tra phiên đăng nhập.');
          }
        }
        throw err;
      }
    };
    setRefreshHandler(restore);
    restore().catch(() => undefined).finally(() => { if (active) setLoading(false); });
    return () => { active = false; setRefreshHandler(null); };
  }, []);

  const login = async (email: string, password: string) => {
    generation.current++;
    const session = await authApi.login(email, password);
    apply(session);
    return session.user;
  };
  const logout = async () => {
    if (loggingOut.current) return;
    loggingOut.current = true;
    generation.current++;
    setIsLoggingOut(true);
    setError('');
    try {
      await authApi.logout();
      setAccessToken(null);
      setUser(null);
      if (config?.enabled) await clearAuth0({ openUrl: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể đăng xuất. Vui lòng thử lại.');
    } finally {
      loggingOut.current = false;
      setIsLoggingOut(false);
    }
  };

  const loginWithGoogle = async (credential: string) => {
    generation.current++;
    const session = await authApi.loginWithGoogle(credential);
    apply(session);
    return session.user;
  };

  const reloadUser = async () => { const current = generation.current;const next = await currentUser();if (current === generation.current) setUser(next); };
  const loginVneid = async (token: string) => {
    const current = ++generation.current;
    const session = await vneidLogin(token);
    if (current !== generation.current) throw new Error('Phiên đăng nhập đã thay đổi. Hãy thử lại.');
    apply(session); return session.user;
  };
  const endSession = () => { generation.current++;setAccessToken(null);setUser(null);setError(''); };
  return <AuthContext.Provider value={{ user, loading, isLoggingOut, error, login, loginWithGoogle, loginVneid, logout, reloadUser, endSession }}>{children}</AuthContext.Provider>;
}
