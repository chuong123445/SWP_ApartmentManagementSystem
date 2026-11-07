import { apiFetch, readApiError } from '@/services/http/client';
import type { PageResult } from '@/types/apartment';
import type { CashCreate, CashEntry, CashFilters, CashSummary } from '@/types/finance';

const base = '/api/v1/owner/cash-entries';
async function request<T>(url: string, body?: unknown): Promise<T> {
  const response = await apiFetch(url, body === undefined ? undefined : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!response.ok) throw await readApiError(response);
  return response.json();
}
function query(filters: CashFilters, includeStatus: boolean) {
  const params = new URLSearchParams({ month: filters.month });
  if (filters.propertyId && filters.propertyId !== 'all') params.set('propertyId', filters.propertyId);
  if (filters.direction) params.set('direction', filters.direction);
  if (includeStatus && filters.status) params.set('status', filters.status);
  return params;
}
export function listCashEntries(filters: CashFilters, page = 0) {
  const params = query(filters, true);params.set('page', String(page));params.set('size', '20');
  return request<PageResult<CashEntry>>(`${base}?${params}`);
}
export const cashSummary = (filters: CashFilters) => request<CashSummary>(`${base}/summary?${query(filters, false)}`);
export const getCashEntry = (id: number) => request<CashEntry>(`${base}/${id}`);
export const createCashEntry = (input: CashCreate) => request<CashEntry>(base, input);
export const postCashEntry = (id: number, version: number) => request<CashEntry>(`${base}/${id}/post`, { version });
export const cancelCashEntry = (id: number, version: number, reason: string) => request<CashEntry>(`${base}/${id}/cancel`, { version, reason });

// Retain the same intent after a lost response, including when its form is remounted.
// A changed payload is a new intent; successful requests are removed from the retry cache.
export function cashCreateIntent() {
  let pending: { payload: string; input: CashCreate } | null = null;
  return async (input: Omit<CashCreate, 'requestKey'>) => {
    const payload = JSON.stringify(input);
    if (pending?.payload !== payload) pending = { payload, input: { ...input, requestKey: crypto.randomUUID() } };
    const result = await createCashEntry(pending.input);
    pending = null;
    return result;
  };
}
