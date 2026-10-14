import { apiFetch, readApiError } from '@/services/http/client';
import type { ContractContext, ContractDraft, ContractTerms } from '@/types/contract';
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await apiFetch(url, options);
  if (!response.ok) throw await readApiError(response);
  return response.json();
}
export const getContractContext = (id: string) => request<ContractContext>(`/api/v1/owner/rental-requests/${encodeURIComponent(id)}/contract-context`);
export const getContract = (id: string) => request<ContractDraft>(`/api/v1/contracts/${encodeURIComponent(id)}`);
export const getDrafts = (owner: boolean, propertyId?: string) => request<ContractDraft[]>(owner ? `/api/v1/owner/contract-drafts${propertyId ? `?propertyId=${encodeURIComponent(propertyId)}` : ''}` : '/api/v1/me/contract-drafts');
export function saveContract(context: ContractContext, terms: ContractTerms, existing: ContractDraft | null) {
  const url = existing ? `/api/v1/owner/contracts/${encodeURIComponent(existing.id)}/draft` : `/api/v1/owner/rental-requests/${encodeURIComponent(context.rentalRequestId)}/contract`;
  const body = existing ? { ...terms, version: existing.version } : { ...terms, requestVersion: context.requestVersion, sourceVersion: context.sourceVersion };
  return request<ContractDraft>(url, { method: existing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}
