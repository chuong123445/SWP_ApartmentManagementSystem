import { apiFetch, readApiError } from '@/services/http/client';
import type { AuthSession, AuthUser } from '@/types/auth';
export interface VneidConfig { enabled: boolean; issuer: string; clientId: string; audience: string; connection: string }
export async function getVneidConfig(): Promise<VneidConfig> {
  const response = await fetch('/api/v1/auth/vneid-config', { cache: 'no-store', credentials: 'same-origin' });
  if (!response.ok) throw await readApiError(response);
  return response.json();
}
async function csrfHeaders() {
  const response = await fetch('/api/v1/auth/csrf', { cache: 'no-store', credentials: 'same-origin' });
  if (!response.ok) throw await readApiError(response);
  const csrf = await response.json(); return new Headers({ [csrf.headerName]: csrf.token });
}
export async function vneidLogin(token: string): Promise<AuthSession> {
  const headers = await csrfHeaders(); headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch('/api/v1/auth/vneid-login', { method: 'POST', credentials: 'same-origin', headers });
  if (!response.ok) throw await readApiError(response);
  return response.json();
}
export async function verifyVneid(token: string): Promise<AuthUser> {
  const headers = await csrfHeaders(); headers.set('Content-Type', 'application/json');
  const response = await apiFetch('/api/v1/me/verifications/vneid', { method: 'POST', headers, body: JSON.stringify({ auth0AccessToken: token }) });
  if (!response.ok) throw await readApiError(response);
  return response.json();
}
