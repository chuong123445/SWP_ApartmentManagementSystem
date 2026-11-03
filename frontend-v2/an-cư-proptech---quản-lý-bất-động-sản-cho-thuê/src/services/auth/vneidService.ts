import { apiFetch, readApiError } from '@/services/http/client';
import type { AuthSession, AuthUser } from '@/types/auth';
export interface VneidConfig { enabled: boolean; issuer: string; clientId: string; audience: string; connection: string }
export interface VerifiedCitizen { documentNumber: string; legalName: string; dateOfBirth: string; gender: string; address: string; documentIssueDate?: string | null; documentIssuePlace?: string | null; permanentAddress?: string | null }
export interface AccountVerification {
  emailVerified: boolean;
  vneid: { status: 'VERIFIED' | 'UNVERIFIED'; verifiedAt: string | null; identity: VerifiedCitizen | null };
}
export async function getAccountVerification(signal?: AbortSignal): Promise<AccountVerification> {
  const response = await apiFetch('/api/v1/me/verifications', { cache: 'no-store', signal });
  if (!response.ok) throw await readApiError(response);
  return response.json();
}
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
export interface VneidNameConfirmation {
  status: 'CONFIRMATION_REQUIRED'; confirmationId: string; displayName: string; legalName: string; expiresAt: string;
}
export async function verifyVneid(token: string): Promise<AuthUser | VneidNameConfirmation> {
  const headers = await csrfHeaders(); headers.set('Content-Type', 'application/json');
  const response = await apiFetch('/api/v1/me/verifications/vneid', { method: 'POST', headers, body: JSON.stringify({ auth0AccessToken: token }) });
  if (!response.ok) throw await readApiError(response);
  return response.json();
}

export async function confirmVneid(confirmationId: string): Promise<AuthUser> {
  const response = await linkDecision('confirm', confirmationId);
  return response.json();
}
export async function cancelVneid(confirmationId: string): Promise<void> {
  await linkDecision('cancel', confirmationId);
}
async function linkDecision(action: 'confirm' | 'cancel', confirmationId: string) {
  const headers = await csrfHeaders(); headers.set('Content-Type', 'application/json');
  const response = await apiFetch(`/api/v1/me/verifications/vneid/${action}`, {
    method: 'POST', headers, body: JSON.stringify({ confirmationId }),
  });
  if (!response.ok) throw await readApiError(response);
  return response;
}
