import { apiFetch, readApiError } from '@/services/http/client';
import type { Dossier, DossierStatus, DossierSubmit, EvidenceFile, EvidencePurpose, ReviewDecision } from '@/types/dossier';
import type { PageResult } from '@/types/apartment';
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await apiFetch(url, options);if (!response.ok) throw await readApiError(response);return response.json();
}
const json = (data: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
const propertyPath = (self: boolean) => self ? '/api/v1/me/rental-properties' : '/api/v1/owner/properties';
export function propertyDossiers(id: string, self = false) { return request<Dossier[]>(`${propertyPath(self)}/${id}/verification-dossiers`); }
export function submitDossier(id: string, input: DossierSubmit, self = false) { return request<Dossier>(`${propertyPath(self)}/${id}/verification-dossiers`, json(input)); }
export function uploadEvidence(id: string, purpose: EvidencePurpose, file: File, self = false) {
  const form = new FormData();form.set('purpose', purpose);form.set('file', file);
  return request<EvidenceFile>(`${propertyPath(self)}/${id}/evidence-files`, { method: 'POST', body: form });
}
export function adminDossiers(page: number, status: DossierStatus | '') {
  const query = new URLSearchParams({ page: String(page), size: '10' });if (status) query.set('status', status);
  return request<PageResult<Dossier>>(`/api/v1/admin/property-dossiers?${query}`);
}
export function adminDossier(id: string) { return request<Dossier>(`/api/v1/admin/property-dossiers/${id}`); }
export function reviewDossier(id: string, decision: ReviewDecision, reason: string, version: number, rightsConfirmed = false) {
  return request<Dossier>(`/api/v1/admin/property-dossiers/${id}/decisions`, json({ decision, reason, version, rightsConfirmed }));
}
export async function downloadEvidence(file: EvidenceFile) {
  const response = await apiFetch(`/api/v1/property-evidence-files/${file.id}`);if (!response.ok) throw await readApiError(response);
  const url = URL.createObjectURL(await response.blob());const link = document.createElement('a');link.href = url;link.download = file.filename;
  document.body.append(link);link.click();link.remove();window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
