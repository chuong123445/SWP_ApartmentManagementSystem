import { ApiError, readApiError } from '@/services/http/client';

import type { AuthSession } from '@/types/auth';
export type { AuthSession, AuthUser } from '@/types/auth';

async function authRequest(action: 'login' | 'refresh' | 'logout', body?: unknown): Promise<Response> {
  try {
    const csrfResponse = await fetch('/api/v1/auth/csrf', { credentials: 'same-origin', cache: 'no-store' });
    if (!csrfResponse.ok) throw await readApiError(csrfResponse);
    const csrf = await csrfResponse.json();
    const headers = new Headers({ [csrf.headerName]: csrf.token });
    if (body !== undefined) headers.set('Content-Type', 'application/json');
    const response = await fetch(`/api/v1/auth/${action}`, {
      method: 'POST', credentials: 'same-origin', headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) throw await readApiError(response);
    return response;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Không thể kết nối máy chủ. Vui lòng thử lại.', 0);
  }
}

export async function login(email: string, password: string): Promise<AuthSession> {
  return (await authRequest('login', { email: email.trim(), password })).json();
}

// A single refresh request per browser tab prevents rotation/reuse races in StrictMode
// and when several protected API requests expire at the same time.
let refreshing: Promise<AuthSession> | null = null;
export function refresh(): Promise<AuthSession> {
  if (!refreshing) {
    refreshing = authRequest('refresh').then(response => response.json()).finally(() => { refreshing = null; });
  }
  return refreshing;
}

export async function logout(): Promise<void> {
  if (refreshing) await refreshing.catch(() => undefined);
  await authRequest('logout');
}
