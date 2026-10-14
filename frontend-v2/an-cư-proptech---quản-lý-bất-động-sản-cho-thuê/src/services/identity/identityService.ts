import { apiFetch, readApiError } from '@/services/http/client';
import type { IdentityFields, IdentityProfile } from '@/types/identity';

export async function getIdentity(signal?: AbortSignal): Promise<IdentityProfile | null> {
  const response = await apiFetch('/api/v1/me/identity', { signal });
  if (!response.ok) throw await readApiError(response);
  return response.status === 204 ? null : response.json();
}
export async function saveIdentity(fields: IdentityFields, version: number | null, front: File | null, back: File | null): Promise<IdentityProfile> {
  const body = new FormData();
  body.append('profile', new Blob([JSON.stringify({ ...fields, version })], { type: 'application/json' }));
  if (front) body.append('front', front);
  if (back) body.append('back', back);
  const response = await apiFetch('/api/v1/me/identity', { method: 'PUT', body });
  if (!response.ok) throw await readApiError(response);
  return response.json();
}
export async function identityImage(side: 'front' | 'back', signal: AbortSignal): Promise<Blob> {
  const response = await apiFetch(`/api/v1/me/identity/documents/${side}`, { signal });
  if (!response.ok) throw await readApiError(response);
  return response.blob();
}
