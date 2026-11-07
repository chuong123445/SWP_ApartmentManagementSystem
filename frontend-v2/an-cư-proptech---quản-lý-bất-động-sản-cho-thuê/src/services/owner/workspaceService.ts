import { apiFetch, readApiError } from '@/services/http/client';
import type { OwnerWorkspaceSummary } from '@/types/owner';

export async function getOwnerWorkspaceSummary(propertyId = 'all'): Promise<OwnerWorkspaceSummary> {
  const query = new URLSearchParams();
  if (propertyId !== 'all') query.set('propertyId', propertyId);
  const response = await apiFetch(`/api/v1/owner/workspace-summary${query.size ? `?${query}` : ''}`);
  if (!response.ok) throw await readApiError(response);
  const result: OwnerWorkspaceSummary = await response.json();
  const counts = [result.unpaidCount, result.unpaidMonthlyInvoiceCount, result.unpaidAdditionalReceiptCount, result.expiringContractCount, result.expiredContractCount];
  if (counts.some(value => !Number.isSafeInteger(value) || value < 0) || result.unpaidCount !== result.unpaidMonthlyInvoiceCount + result.unpaidAdditionalReceiptCount)
    throw new Error('Số đếm tổng hợp không đầy đủ. Hãy tải lại hoặc kiểm tra phiên bản backend.');
  return result;
}
