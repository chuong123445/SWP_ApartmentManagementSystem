import { useCallback, useEffect, useState } from 'react';
import { ownerInvoices, ownerReceivedInvoices, invoiceView, type OwnerInvoiceFilter } from '@/services/billing/billingService';
import type { BillingInvoice } from '@/types/billing';
import type { TestReceipt } from '@/services/payment/sepayService';
import type { PageResult } from '@/types/apartment';

interface Snapshot {
  key: string; monthly: PageResult<BillingInvoice> | null; additional: PageResult<TestReceipt> | null;
  monthlyError: string; additionalError: string; loading: boolean;
}
// Kept in the shared workspace, independent of the invoice page used by reports.
export function useOwnerInvoiceHistory(enabled: boolean, propertyId: string, externalRevision: number) {
  const [filter, setFilter] = useState<OwnerInvoiceFilter>('ALL');
  const [page, setPage] = useState(0); const [additionalPage, setAdditionalPage] = useState(0);
  const [snapshot, setSnapshot] = useState<Snapshot>({ key: '', monthly: null, additional: null, monthlyError: '', additionalError: '', loading: true });
  const key = JSON.stringify([propertyId, filter, page, additionalPage]);
  const changeFilter = useCallback((value: OwnerInvoiceFilter) => { setFilter(value); setPage(0); setAdditionalPage(0); }, []);
  useEffect(() => { setPage(0); setAdditionalPage(0); }, [propertyId]);
  useEffect(() => {
    if (!enabled) return;
    let active = true; let running = false;
    const scope = propertyId === 'all' ? undefined : propertyId;
    setSnapshot({ key, monthly: null, additional: null, monthlyError: '', additionalError: '', loading: true });
    const load = async () => {
      if (!active || running) return; running = true;
      const [monthly, additional] = await Promise.allSettled([
        ownerInvoices(page, 20, scope, filter),
        (filter === 'DRAFT' || filter === 'CANCELLED') ? Promise.resolve(null) : ownerReceivedInvoices(additionalPage, 20, scope, filter),
      ]);
      if (active) setSnapshot({ key, loading: false,
        monthly: monthly.status === 'fulfilled' ? monthly.value : null,
        additional: additional.status === 'fulfilled' ? additional.value : null,
        monthlyError: monthly.status === 'rejected' ? String(monthly.reason?.message || 'Không thể tải hóa đơn tháng.') : '',
        additionalError: additional.status === 'rejected' ? String(additional.reason?.message || 'Không thể tải phiếu gửi người thuê.') : '',
      });
      running = false;
    };
    const refresh = () => { if (document.visibilityState === 'visible') void load(); };
    void load(); const timer = window.setInterval(refresh, 10000); window.addEventListener('focus', refresh);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [enabled, key, propertyId, filter, page, additionalPage, externalRevision]);
  const current = snapshot.key === key ? snapshot : { monthly: null, additional: null, monthlyError: '', additionalError: '', loading: enabled };
  return { ...current, scopeKey: propertyId, invoices: current.monthly?.items.map(invoiceView) ?? [], filter, changeFilter, page, setPage, additionalPage, setAdditionalPage };
}
export type OwnerInvoiceHistory = ReturnType<typeof useOwnerInvoiceHistory>;
