import { apiFetch, readApiError } from '@/services/http/client';
import type { OwnerFinancialSummary } from '@/types/financialReport';
const isCount = (value: unknown) => Number.isSafeInteger(value) && Number(value) >= 0;
const isMoney = (value: unknown) => typeof value === 'string' && /^\d+(\.\d+)?$/.test(value);
function fields<T>(value: T, keys: readonly (keyof T)[], check: (value: unknown) => boolean) { return !!value && keys.every(key => check(value[key])); }
const validAmounts = (value: OwnerFinancialSummary['totals']) => fields(value, ['invoiceCount', 'paidInvoiceCount', 'onTimePaidInvoiceCount'], isCount)
  && fields(value, ['billedAmount', 'paidInvoiceAmount', 'unpaidInvoiceAmount', 'rentAmount', 'electricityAmount', 'waterAmount', 'serviceAmount'], isMoney)
  && value.onTimePaidInvoiceCount <= value.paidInvoiceCount && value.paidInvoiceCount <= value.invoiceCount;
const validReceipts = (value: OwnerFinancialSummary['receipts']) => fields(value, ['monthlyInvoiceAmount', 'additionalAmount', 'totalAmount'], isMoney);
const validInventory = (value: OwnerFinancialSummary['inventory']) => fields(value, ['units', 'occupied', 'vacant'], isCount);
const validArrears = (value: OwnerFinancialSummary['arrears']) => fields(value, ['monthlyInvoiceCount', 'overdueInvoiceCount', 'additionalCount'], isCount) && fields(value, ['monthlyInvoiceAmount', 'overdueInvoiceAmount', 'additionalAmount'], isMoney);
export type FinancialScope = number | { fromMonth: string; toMonth: string; year?: number };

export async function getOwnerFinancialSummary(scope: FinancialScope, propertyId = 'all'): Promise<OwnerFinancialSummary> {
  const query = new URLSearchParams();
  if (typeof scope === 'number') {
    query.set('year', String(scope));
  } else {
    query.set('fromMonth', scope.fromMonth);
    query.set('toMonth', scope.toMonth);
    if (scope.year) query.set('year', String(scope.year));
  }
  if (propertyId !== 'all') query.set('propertyId', propertyId);
  const response = await apiFetch(`/api/v1/owner/financial-summary?${query}`); if (!response.ok) throw await readApiError(response);
  const data: OwnerFinancialSummary = await response.json();
  const validScope = (typeof scope === 'number'
    ? data?.year === scope
    : (data?.fromPeriod === scope.fromMonth && data?.toPeriod === scope.toMonth))
    && data.propertyId === (propertyId === 'all' ? null : propertyId) && typeof data.asOf === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.asOf);
  const validMonths = Array.isArray(data?.months) && data.months.length >= 1 && data.months.every(month => typeof month?.period === 'string' && /^\d{4}-\d{2}$/.test(month.period) && validAmounts(month.invoices) && validReceipts(month.receipts));
  const validProperties = Array.isArray(data?.properties) && data.properties.every(property => typeof property?.id === 'string' && typeof property.name === 'string' && validInventory(property.inventory) && validAmounts(property.invoices) && validReceipts(property.receipts));
  if (!validScope || !validAmounts(data?.totals) || !validReceipts(data?.receipts) || !validInventory(data?.inventory) || !validArrears(data?.arrears) || !validMonths || !validProperties)
    throw new Error('Số liệu tài chính chưa đầy đủ. Hãy kiểm tra phiên bản backend và thử lại.');
  return data;
}
