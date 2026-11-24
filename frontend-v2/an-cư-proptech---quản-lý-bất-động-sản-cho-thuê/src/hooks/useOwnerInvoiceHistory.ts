import { useCallback, useEffect, useState } from 'react';
import { ownerInvoices, ownerReceivedInvoices, ownerInvoiceRooms, invoiceView, type InvoiceRoomSummary, type OwnerInvoiceFilter } from '@/services/billing/billingService';
import type { BillingInvoice } from '@/types/billing';
import type { TestReceipt } from '@/services/payment/sepayService';
import type { PageResult } from '@/types/apartment';

interface Snapshot {
  key: string; propertyId:string; monthly: PageResult<BillingInvoice> | null; additional: PageResult<TestReceipt> | null;
  monthlyError: string; additionalError: string; loading: boolean; rooms:InvoiceRoomSummary[]; roomsError:string;
}
// Kept in the shared workspace, independent of the invoice page used by reports.
export function useOwnerInvoiceHistory(enabled: boolean, propertyId: string, externalRevision: number) {
  const [roomScope,setRoomScope]=useState({propertyId,apartmentId:'all'});
  const apartmentId=roomScope.propertyId===propertyId?roomScope.apartmentId:'all';
  const changeApartment=useCallback((value:string)=>{setRoomScope({propertyId,apartmentId:value});setPage(0);setAdditionalPage(0);},[propertyId]);
  const [filter, setFilter] = useState<OwnerInvoiceFilter>('ALL');
  const [page, setPage] = useState(0); const [additionalPage, setAdditionalPage] = useState(0);
  const [snapshot, setSnapshot] = useState<Snapshot>({ key: '', propertyId, monthly: null, additional: null, monthlyError: '', additionalError: '', rooms:[], roomsError:'', loading: true });
  const key = JSON.stringify([propertyId, apartmentId, filter, page, additionalPage]);
  const changeFilter = useCallback((value: OwnerInvoiceFilter) => { setFilter(value); setPage(0); setAdditionalPage(0); }, []);
  useEffect(() => { setPage(0); setAdditionalPage(0);setRoomScope({propertyId,apartmentId:'all'}); }, [propertyId]);
  useEffect(() => {
    if (!enabled) return;
    let active = true; let running = false;
    const scope = propertyId === 'all' ? undefined : propertyId;
    setSnapshot(previous=>({ key,propertyId, monthly: null, additional: null, monthlyError: '', additionalError: '', rooms:previous.propertyId===propertyId?previous.rooms:[], roomsError:'', loading: true }));
    const load = async () => {
      if (!active || running) return; running = true;
      const [monthly, additional,rooms] = await Promise.allSettled([
        ownerInvoices(page, 20, scope, filter,apartmentId==='all'?undefined:apartmentId),
        (filter === 'DRAFT' || filter === 'CANCELLED') ? Promise.resolve(null) : ownerReceivedInvoices(additionalPage, 20, scope, filter,apartmentId==='all'?undefined:apartmentId),
        ownerInvoiceRooms(scope),
      ]);
      if (active) setSnapshot(previous=>({ key,propertyId, loading: false,
        rooms:rooms.status==='fulfilled'?rooms.value:previous.rooms,roomsError:rooms.status==='rejected'?String(rooms.reason?.message||'Không thể tải danh sách phòng.'):'',
        monthly: monthly.status === 'fulfilled' ? monthly.value : null,
        additional: additional.status === 'fulfilled' ? additional.value : null,
        monthlyError: monthly.status === 'rejected' ? String(monthly.reason?.message || 'Không thể tải hóa đơn tháng.') : '',
        additionalError: additional.status === 'rejected' ? String(additional.reason?.message || 'Không thể tải phiếu gửi người thuê.') : '',
      }));
      running = false;
    };
    const refresh = () => { if (document.visibilityState === 'visible') void load(); };
    void load(); const timer = window.setInterval(refresh, 10000); window.addEventListener('focus', refresh);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [enabled, key, propertyId, apartmentId, filter, page, additionalPage, externalRevision]);
  const current = snapshot.key === key ? snapshot : { monthly: null, additional: null, monthlyError: '', additionalError: '', rooms:snapshot.propertyId===propertyId?snapshot.rooms:[], roomsError:'', loading: enabled };
  return { ...current, scopeKey: JSON.stringify([propertyId,apartmentId]), apartmentId,changeApartment, invoices: current.monthly?.items.map(invoiceView) ?? [], filter, changeFilter, page, setPage, additionalPage, setAdditionalPage };
}
export type OwnerInvoiceHistory = ReturnType<typeof useOwnerInvoiceHistory>;
