import { AuthContext } from '@/contexts/AuthContext';
import type { AuthSession, AuthUser } from '@/types/auth';
import React, { useEffect, useRef, useState } from 'react';
import * as authApi from '@/services/auth/authService';
import { ApiError, setAccessToken, setRefreshHandler } from '@/services/http/client';

export function AuthProvider({ children }: { children: React.ReactNode }) {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể đăng xuất. Vui lòng thử lại.');
    } finally {
      loggingOut.current = false;
      setIsLoggingOut(false);
    }
  };

  return <AuthContext.Provider value={{ user, loading, isLoggingOut, error, login, logout }}>{children}</AuthContext.Provider>;
}
