import { apiFetch, ApiError, readApiError } from '@/services/http/client';
import type { ApartmentSummary, ApartmentDetail, ApartmentFilters, PageResult } from '@/types/apartment';
export function getAddressOptions(signal?: AbortSignal) { return publicGet<import('@/types/apartment').AddressOption[]>('/api/v1/apartments/address-options', signal); }

export async function getApartments(filters: ApartmentFilters, signal?: AbortSignal): Promise<PageResult<ApartmentSummary>> {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== '') query.set(key, String(value)); });
  return publicGet(`/api/v1/apartments?${query}`, signal);
}
export async function getApartment(id: string, signal?: AbortSignal): Promise<ApartmentDetail> {
  const response=await apiFetch(`/api/v1/apartments/${encodeURIComponent(id)}`,{signal,cache:'no-store'});if(!response.ok)throw await readApiError(response);return response.json();
}
async function publicGet<T>(url: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try { response = await fetch(url, { signal, credentials: 'same-origin' }); }
  catch (error) { if (signal?.aborted) throw error; throw new ApiError('Không thể tải dữ liệu căn hộ. Vui lòng thử lại.', 0); }
  if (!response.ok) throw await readApiError(response);
  return response.json();
}
