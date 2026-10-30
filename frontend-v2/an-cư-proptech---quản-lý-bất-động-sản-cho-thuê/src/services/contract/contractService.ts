import { apiFetch, readApiError } from '@/services/http/client';
import type { ContractContext, ContractDraft, ContractTerms, HandoverInput } from '@/types/contract';
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await apiFetch(url, options);
  if (!response.ok) throw await readApiError(response);
  return response.json();
}
export const getContractContext = (id: string) => request<ContractContext>(`/api/v1/owner/rental-requests/${encodeURIComponent(id)}/contract-context`);
export const getRenewalContext = (id: string) => request<ContractContext>(`/api/v1/owner/contracts/${encodeURIComponent(id)}/renewal-context`);
export const saveRenewal = (id: string, context: ContractContext, terms: ContractTerms) => request<ContractDraft>(`/api/v1/owner/contracts/${encodeURIComponent(id)}/renewals`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...terms, requestVersion: context.requestVersion, sourceVersion: context.sourceVersion }),
});
export const proposeHandover = (id: string, input: HandoverInput) => request<ContractDraft>(`/api/v1/owner/contracts/${encodeURIComponent(id)}/handover`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
});
export const confirmHandover = (id: string, version: number) => request<ContractDraft>(`/api/v1/contracts/${encodeURIComponent(id)}/handover/confirm`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version, consent: true }),
});
export const cancelHandover = (id: string, version: number) => request<ContractDraft>(`/api/v1/owner/contracts/${encodeURIComponent(id)}/handover/cancel`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version, consent: true }),
});
export const cancelRenewal = (id: string, version: number) => request<ContractDraft>(`/api/v1/owner/contracts/${encodeURIComponent(id)}/cancel-renewal`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version, consent: true }),
});
export const getContract = (id: string) => request<ContractDraft>(`/api/v1/contracts/${encodeURIComponent(id)}`);
export async function getContractPdf(id: string): Promise<Blob> {
  const response = await apiFetch(`/api/v1/contracts/${encodeURIComponent(id)}/pdf`, { cache: 'no-store' });
  if (!response.ok) throw await readApiError(response);
  if (!response.headers.get('content-type')?.includes('application/pdf')) throw new Error('Máy chủ chưa trả về tệp PDF hợp đồng.');
  return response.blob();
}
export const signContract = (draft: ContractDraft, signature: string) => request<ContractDraft>(
  `/api/v1/contracts/${encodeURIComponent(draft.id)}/signatures`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version: draft.version, contentHash: draft.signing?.contentHash, signature, consent: true }) });
export const getDrafts = (owner: boolean, propertyId?: string) => request<ContractDraft[]>(owner ? `/api/v1/owner/contract-drafts${propertyId ? `?propertyId=${encodeURIComponent(propertyId)}` : ''}` : '/api/v1/me/contract-drafts');
export function saveContract(context: ContractContext, terms: ContractTerms, existing: ContractDraft | null) {
  const url = existing ? `/api/v1/owner/contracts/${encodeURIComponent(existing.id)}/draft` : `/api/v1/owner/rental-requests/${encodeURIComponent(context.rentalRequestId)}/contract`;
  const body = existing ? { ...terms, version: existing.version } : { ...terms, requestVersion: context.requestVersion, sourceVersion: context.sourceVersion };
  return request<ContractDraft>(url, { method: existing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}
