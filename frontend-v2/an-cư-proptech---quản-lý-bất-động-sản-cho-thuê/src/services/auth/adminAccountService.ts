import { apiFetch, readApiError } from '@/services/http/client';

export type AccountFilter = 'ALL' | 'ACTIVE' | 'PENDING_VERIFICATION' | 'LOCKED' | 'INACTIVE' | 'DELETED';
export type AccountAction = 'LOCK' | 'UNLOCK' | 'DELETE';

export interface ManagedAccount {
  id: string;
  email: string;
  fullName: string;
  roles: ('OWNER' | 'CUSTOMER' | 'ADMIN')[];
  status: Exclude<AccountFilter, 'ALL' | 'DELETED'>;
  deletedAt: string | null;
  version: number;
  canManage: boolean;
  canUnlock: boolean;
}

interface AccountPage {
  items: ManagedAccount[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export async function listAdminAccounts(search: string, filter: AccountFilter, page: number, signal: AbortSignal): Promise<AccountPage> {
  const query = new URLSearchParams({ q: search, filter, page: String(page) });
  const response = await apiFetch('/api/v1/admin/accounts?' + query, { signal, cache: 'no-store' });
  if (!response.ok) throw await readApiError(response);
  return response.json();
}

export async function manageAccount(account: ManagedAccount, action: AccountAction, reason: string): Promise<{ id: string; outcome: string }> {
  const response = await apiFetch('/api/v1/admin/accounts/' + encodeURIComponent(account.id) + '/actions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, version: account.version, reason }),
    cache: 'no-store',
  });
  if (!response.ok) throw await readApiError(response);
  return response.json();
}

export interface AdminHistoryPage<T> {
  items: T[];
  page: number;
  totalElements: number;
  totalPages: number;
}
export interface AccountProfile {
  account: ManagedAccount;
  phone: string | null;
  address: string | null;
  bio: string | null;
  dateOfBirth: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
}
export interface AccountContract {
  id: string; relationship: 'OWNER' | 'TENANT'; roomNumber: string; propertyName: string;
  ownerName: string; tenantName: string; status: string; startDate: string; endDate: string; monthlyRent: string;
}
export interface PaidAccountInvoice {
  id: string; source: 'MONTHLY' | 'ADDITIONAL'; contractId: string; period: string | null;
  roomNumber: string; ownerName: string; tenantName: string; amount: string; paidAt: string;
}
async function accountRead<T>(id: string, suffix: string, signal: AbortSignal): Promise<T> {
  const response = await apiFetch('/api/v1/admin/accounts/' + encodeURIComponent(id) + suffix, { signal, cache: 'no-store' });
  if (!response.ok) throw await readApiError(response);
  return response.json();
}
export const adminAccountProfile = (id: string, signal: AbortSignal) => accountRead<AccountProfile>(id, '', signal);
export const adminAccountContracts = (id: string, page: number, signal: AbortSignal) =>
  accountRead<AdminHistoryPage<AccountContract>>(id, '/contracts?page=' + page, signal);
export const adminAccountPaidInvoices = (id: string, page: number, signal: AbortSignal) =>
  accountRead<AdminHistoryPage<PaidAccountInvoice>>(id, '/paid-invoices?page=' + page, signal);
