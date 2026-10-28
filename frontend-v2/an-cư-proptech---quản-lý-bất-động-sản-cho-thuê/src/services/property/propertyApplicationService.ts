import { apiFetch, readApiError } from '@/services/http/client';
import type { OwnerProperty, PropertyCreateInput } from '@/types/property';
export async function getPropertyApplications(signal?: AbortSignal): Promise<OwnerProperty[]> {
  const response = await apiFetch('/api/v1/me/rental-properties', { signal, cache: 'no-store' });if (!response.ok) throw await readApiError(response);return response.json();
}
export async function createPropertyApplication(input: PropertyCreateInput, rightType: 'AUTHORIZATION' | 'SUBLEASE'): Promise<{ property: OwnerProperty }> {
  const response = await apiFetch('/api/v1/me/rental-properties', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...input, rightType }) });if (!response.ok) throw await readApiError(response);return response.json();
}
export interface PropertyNotice { id: string; propertyId: string; propertyName: string; kind: 'EXPIRING' | 'EXPIRED'; expiresOn: string; createdAt: string }
export async function getPropertyNotices(signal?: AbortSignal): Promise<PropertyNotice[]> {
  const response = await apiFetch('/api/v1/me/property-notices', { signal, cache: 'no-store' });if (!response.ok) throw await readApiError(response);return response.json();
}
