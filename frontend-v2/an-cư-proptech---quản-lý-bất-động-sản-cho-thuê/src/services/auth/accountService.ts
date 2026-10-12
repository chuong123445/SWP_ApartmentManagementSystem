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
export function changePassword(currentPassword: string, newPassword: string, version: number) { return request<void>('/me/password', 'POST', { currentPassword, newPassword, version }); }
export function changePhone(phone: string | null, currentPassword: string, version: number) { return request<AccountProfile>('/me/phone', 'POST', { phone, currentPassword, version }); }
export function requestEmailChange(email: string, currentPassword: string, version: number) { return request<EmailChallenge>('/me/email-changes', 'POST', { email, currentPassword, version }); }
export function pendingEmailChange() { return request<EmailChallenge | null>('/me/email-change'); }
export function confirmEmailChange(id: string, code: string) { return request<AccountProfile>(`/me/email-changes/${encodeURIComponent(id)}/confirm`, 'POST', { code }); }
