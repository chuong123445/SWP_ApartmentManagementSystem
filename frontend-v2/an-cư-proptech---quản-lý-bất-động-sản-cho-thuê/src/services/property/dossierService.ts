import { apiFetch, readApiError } from '@/services/http/client';
import type { Dossier, DossierStatus, DossierSubmit, EvidenceFile, EvidencePurpose, ReviewDecision } from '@/types/dossier';
import type { PageResult } from '@/types/apartment';
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await apiFetch(url, options);if (!response.ok) throw await readApiError(response);return response.json();
}
const json = (data: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
export function propertyDossiers(id: string) { return request<Dossier[]>(`/api/v1/owner/properties/${id}/verification-dossiers`); }
export function submitDossier(id: string, input: DossierSubmit) { return request<Dossier>(`/api/v1/owner/properties/${id}/verification-dossiers`, json(input)); }
export function uploadEvidence(id: string, purpose: EvidencePurpose, file: File) {
  const form = new FormData();form.set('purpose', purpose);form.set('file', file);
  return request<EvidenceFile>(`/api/v1/owner/properties/${id}/evidence-files`, { method: 'POST', body: form });
}
export function adminDossiers(page: number, status: DossierStatus | '') {
  const query = new URLSearchParams({ page: String(page), size: '10' });if (status) query.set('status', status);
  return request<PageResult<Dossier>>(`/api/v1/admin/property-dossiers?${query}`);
}
export function adminDossier(id: string) { return request<Dossier>(`/api/v1/admin/property-dossiers/${id}`); }
export function reviewDossier(id: string, decision: ReviewDecision, reason: string, version: number) {
  return request<Dossier>(`/api/v1/admin/property-dossiers/${id}/decisions`, json({ decision, reason, version }));
}
export async function downloadEvidence(file: EvidenceFile) {
  const response = await apiFetch(`/api/v1/property-evidence-files/${file.id}`);if (!response.ok) throw await readApiError(response);
  const url = URL.createObjectURL(await response.blob());const link = document.createElement('a');link.href = url;link.download = file.filename;
  document.body.append(link);link.click();link.remove();window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
