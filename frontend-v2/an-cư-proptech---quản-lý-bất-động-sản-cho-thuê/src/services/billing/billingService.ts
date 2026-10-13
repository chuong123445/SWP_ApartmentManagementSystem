import { apiFetch, readApiError } from '@/services/http/client';
import type { BillingContext, BillingInvoice, InvoiceCreate, Tenancy } from '@/types/billing';
import type { PageResult } from '@/types/apartment';
import type { Invoice, Tenant, Contract } from '@/types';
async function request<T>(url: string, body?: unknown): Promise<T> {
  const response = await apiFetch(url, body === undefined ? undefined : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!response.ok) throw await readApiError(response);
  return response.json();
}
export function ownerTenancies() { return request<Tenancy[]>('/api/v1/owner/tenancies'); }
export function myTenancies() { return request<Tenancy[]>('/api/v1/me/tenancies'); }
export function getBillingContext(id: string) { return request<BillingContext>(`/api/v1/owner/contracts/${encodeURIComponent(id)}/billing-context`); }
export function createInvoice(id: string, input: InvoiceCreate) { return request<BillingInvoice>(`/api/v1/owner/contracts/${encodeURIComponent(id)}/invoices`, input); }
export function sendInvoice(id: string, version: number) { return request<BillingInvoice>(`/api/v1/owner/invoices/${encodeURIComponent(id)}/send`, { version }); }
export function getInvoice(id: string) { return request<BillingInvoice>(`/api/v1/invoices/${encodeURIComponent(id)}`); }
export function ownerInvoices(page = 0, size = 20, propertyId?: string) {
  const query = new URLSearchParams({ page: String(page), size: String(size) });
  if (propertyId) query.set('propertyId', propertyId);
  return request<PageResult<BillingInvoice>>(`/api/v1/owner/invoices?${query}`);
}
export function myInvoices(page = 0, size = 20) { return request<PageResult<BillingInvoice>>(`/api/v1/me/invoices?page=${page}&size=${size}`); }
// Adapt server data to the existing Owner layout. Numbers are for display only.
export function invoiceView(i: BillingInvoice): Invoice {
  return {
    id: i.id, invoiceCode: `HD-${i.period}-${i.id.slice(0, 8)}`, monthYear: i.period, roomId: i.apartmentId,
    roomNumber: i.roomNumber, tenantName: i.tenantName, tenantPhone: '', createdAt: i.createdAt, dueDate: i.dueDate,
    status: 'unpaid', paidAmount: 0, totalAmount: Number(i.totalAmount), apiInvoice: i,
    items: [
      { name: 'Tiền thuê', unit: 'tháng', quantity: 1, unitPrice: Number(i.monthlyRent), amount: Number(i.monthlyRent) },
      { name: 'Tiền điện', unit: 'kWh', oldIndex: Number(i.electricityStartReading), newIndex: Number(i.electricityEndReading), quantity: Number(i.electricityQuantity), unitPrice: Number(i.electricityUnitPrice), amount: Number(i.electricityAmount) },
      { name: 'Tiền nước', unit: 'm³', oldIndex: Number(i.waterStartReading), newIndex: Number(i.waterEndReading), quantity: Number(i.waterQuantity), unitPrice: Number(i.waterUnitPrice), amount: Number(i.waterAmount) },
    ],
  };
}
export function tenancyViews(items: Tenancy[]): { tenants: Tenant[]; contracts: Contract[] } {
  return {
    tenants: items.filter(c => c.status === 'ACTIVE').map(c => ({ id: c.customerId, name: c.customerName, phone: '', email: c.customerEmail, idCard: '',
      roomId: c.apartmentId, roomNumber: c.roomNumber, buildingName: c.propertyName, startDate: c.startDate,
      deposit: 0, hometown: '', status: c.status === 'ACTIVE' ? 'active' : 'departed' })),
    contracts: items.map(c => ({ id: c.id, contractNumber: `HD-${c.id.slice(0, 8)}`, tenantId: c.customerId,
      tenantName: c.customerName, roomId: c.apartmentId, roomNumber: c.roomNumber, buildingName: c.propertyName,
      startDate: c.startDate, endDate: c.endDate, monthlyRent: Number(c.monthlyRent), deposit: 0, paymentCycle: 1,
      status: c.status === 'ACTIVE' ? 'active' : 'terminated' })),
  };
}
export function billingMoney(value: string) {
  const [integer, fraction = ''] = value.split('.');
  const decimal = fraction.replace(/0+$/, '');
  return `${integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}${decimal ? `,${decimal}` : ''} đ`;
}
