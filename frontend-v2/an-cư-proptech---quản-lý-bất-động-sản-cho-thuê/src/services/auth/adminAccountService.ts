import { apiFetch, readApiError } from '@/services/http/client';

export type AccountFilter = 'ALL' | 'ACTIVE' | 'PENDING_VERIFICATION' | 'LOCKED' | 'INACTIVE' | 'DELETED';
export type AccountAction = 'LOCK' | 'UNLOCK' | 'DELETE';

export interface ManagedAccount {
  id: string;
  email: string;
  fullName: string;
  role: 'OWNER' | 'CUSTOMER' | 'ADMIN';
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
