import { apiFetch, readApiError } from '@/services/http/client';
import type { AccountProfile, EmailChallenge } from '@/types/account';
import type { AuthUser } from '@/types/auth';
async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await apiFetch(`/api/v1${path}`, { method, headers: body === undefined ? undefined : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  if (!response.ok) throw await readApiError(response);
  return response.status === 204 ? undefined as T : response.json();
}
export function getProfile() { return request<AccountProfile>('/me/profile'); }
export function currentUser() { return request<AuthUser>('/me'); }
export function updateProfile(input: { fullName: string; dateOfBirth: string | null; address: string; bio: string; version: number }) { return request<AccountProfile>('/me', 'PATCH', input); }
export function changePassword(currentPassword: string, newPassword: string, version: number, reauthenticationProof?: string) { return request<void>('/me/password', 'POST', { currentPassword: currentPassword || undefined, newPassword, version, reauthenticationProof }); }
export function changePhone(phone: string | null, currentPassword: string, version: number, reauthenticationProof?: string) { return request<AccountProfile>('/me/phone', 'POST', { phone, currentPassword: currentPassword || undefined, version, reauthenticationProof }); }
export function requestEmailChange(email: string, currentPassword: string, version: number, reauthenticationProof?: string) { return request<EmailChallenge>('/me/email-changes', 'POST', { email, currentPassword: currentPassword || undefined, version, reauthenticationProof }); }
export function pendingEmailChange() { return request<EmailChallenge | null>('/me/email-change'); }
export function confirmEmailChange(id: string, code: string) { return request<AccountProfile>(`/me/email-changes/${encodeURIComponent(id)}/confirm`, 'POST', { code }); }

export interface SecurityCapabilities { passwordAvailable: boolean; providers: ('AUTH0'|'GOOGLE')[] }
export function getSecurityCapabilities(signal?: AbortSignal): Promise<SecurityCapabilities> {
  return apiFetch('/api/v1/me/security',{signal,cache:'no-store'}).then(async response=>{if(!response.ok)throw await readApiError(response);return response.json();});
}
export const beginReauthentication=(purpose:'password'|'email'|'phone')=>request<{id:string;nonce:string;expiresAt:string}>('/me/reauthentications','POST',{purpose:purpose.toUpperCase()});
export const confirmReauthentication=(id:string,provider:'AUTH0'|'GOOGLE',credential:string)=>request<{proof:string;expiresAt:string}>(`/me/reauthentications/${encodeURIComponent(id)}/confirm`,'POST',{provider,credential});
