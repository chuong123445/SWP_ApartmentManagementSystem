import { apiFetch, ApiError, readApiError } from '@/services/http/client';
import type { PageResult } from '@/types/apartment';
import type { RentalRequest, RentalRequestStatus } from '@/types/rental';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try { response = await apiFetch(url, options); }
  catch (error) { if (error instanceof ApiError) throw error; throw new ApiError('Không thể kết nối máy chủ. Vui lòng thử lại.', 0); }
  if (!response.ok) throw await readApiError(response);
  return response.json();
}
export function submitRentalRequest(apartmentId: string, message: string): Promise<RentalRequest> {
  return request(`/api/v1/apartments/${encodeURIComponent(apartmentId)}/rental-requests`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }),
  });
}
export function getMyRentalRequests(page = 0): Promise<PageResult<RentalRequest>> {
  return request(`/api/v1/me/rental-requests?page=${page}&size=10`);
}
export function getOwnerRentalRequests(page = 0, status?: RentalRequestStatus): Promise<PageResult<RentalRequest>> {
  const query = new URLSearchParams({ page: String(page), size: '10' });
  if (status) query.set('status', status);
  return request(`/api/v1/owner/rental-requests?${query}`);
}

export function getApartmentRentalRequests(apartmentId: string): Promise<RentalRequest[]> {
  return request(`/api/v1/me/apartments/${encodeURIComponent(apartmentId)}/rental-requests`);
}
export function cancelRentalRequest(id: string, version: number): Promise<RentalRequest> {
  return request(`/api/v1/me/rental-requests/${encodeURIComponent(id)}/cancel`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version }),
  });
}
