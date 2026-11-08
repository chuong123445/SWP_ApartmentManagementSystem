import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { BillingInvoice, InvoiceHistoryEntry } from '@/types/billing';
import { billingMoney, cancelInvoiceDraft, getInvoice, invoiceHistory, updateInvoiceDraft } from '@/services/billing/billingService';
import { InvoiceBreakdown } from './InvoiceBreakdown';

const actions: Record<string, string> = { CREATED: 'Lập bản nháp', UPDATED: 'Sửa bản nháp', CANCELLED: 'Hủy bản nháp', SENT: 'Gửi người thuê' };

export function InvoiceDraftModal({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const [invoice, setInvoice] = useState<BillingInvoice | null>(null);
  const [events, setEvents] = useState<InvoiceHistoryEntry[] | null>(null);
  const [electricity, setElectricity] = useState(''); const [water, setWater] = useState('');
  const [due, setDue] = useState(''); const [reason, setReason] = useState('');
  const [revision, setRevision] = useState(0); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(''); const [historyError, setHistoryError] = useState('');
  const [blocked, setBlocked] = useState(false); const [confirmCancel, setConfirmCancel] = useState(false);
  const [notice, setNotice] = useState('');
  const submitting = useRef(false); const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    let active = true; setInvoice(null); setEvents(null); setError(''); setHistoryError(''); setBlocked(false); setConfirmCancel(false); setNotice('');
    getInvoice(id).then(i => { if (active) { setInvoice(i); setElectricity(i.electricityEndReading); setWater(i.waterEndReading); setDue(i.dueDate); setReason(''); } })
      .catch(e => { if (active) setError(e.message); });
    invoiceHistory(id).then(items => { if (active) setEvents(items); }).catch(e => { if (active) setHistoryError(e.message); });
    return () => { active = false; };
  }, [id, revision]);
  const editable = invoice?.status === 'DRAFT' && Number.isSafeInteger(invoice.billingVersion);
  const save = async (cancel: boolean) => {
    if (submitting.current || !invoice || !editable || blocked) return;
    if (!reason.trim()) { setError('Vui lòng nhập lý do thay đổi.'); return; }
    if (!cancel && !form.current?.reportValidity()) return;
    submitting.current = true; setBusy(true); setError(''); setNotice('');
    try {
      const command = { version: invoice.version, billingVersion: invoice.billingVersion!, reason: reason.trim() };
      const saved = cancel ? await cancelInvoiceDraft(id, command) : await updateInvoiceDraft(id, { ...command, electricityEndReading: electricity, waterEndReading: invoice.waterBillingMode === 'PER_PERSON' ? invoice.waterStartReading : water, dueDate: due });
      setInvoice(saved); setElectricity(saved.electricityEndReading); setWater(saved.waterEndReading); setDue(saved.dueDate); setReason(''); setConfirmCancel(false);
      setNotice(cancel ? 'Đã hủy bản nháp. Bạn có thể lập lại cùng kỳ bằng hóa đơn mới.' : 'Đã lưu và tính lại tổng tiền trên máy chủ.');
      onChanged();
      try { setEvents(await invoiceHistory(id)); setHistoryError(''); } catch (e) { setHistoryError(e instanceof Error ? e.message : 'Không tải được lịch sử.'); }
    } catch (e) { setError(e instanceof Error ? e.message : 'Không thể lưu hóa đơn.'); setBlocked(true); }
    finally { submitting.current = false; setBusy(false); }
  };
  return <div className="fixed inset-0 z-[100] bg-slate-900/50 flex items-center justify-center p-3" role="presentation">
    <section role="dialog" aria-modal="true" aria-labelledby="invoice-draft-title" className="w-full max-w-3xl max-h-[92dvh] overflow-y-auto rounded-2xl bg-white p-4 sm:p-6 shadow-xl">
      <header className="flex justify-between items-start gap-3 mb-4"><h2 id="invoice-draft-title" className="text-xl font-bold">Hóa đơn và lịch sử thay đổi</h2><button type="button" aria-label="Đóng hóa đơn và lịch sử" disabled={busy} onClick={onClose}><X /></button></header>
      {error && <p role="alert" className="mb-3 text-red-700">{error}</p>}
      {notice && <p role="status" className="mb-3 text-emerald-700">{notice}</p>}
      <button type="button" className="op-button mb-4" disabled={busy} onClick={() => setRevision(v => v + 1)}>Tải lại hóa đơn và lịch sử</button>
      {blocked && <p className="text-sm mb-4">Dữ liệu nhập được giữ lại. Hãy tải lại và kiểm tra phiên bản mới trước khi thao tác tiếp; tải lại sẽ thay nội dung đang nhập.</p>}
      {!invoice && !error && <p role="status">Đang tải hóa đơn...</p>}
      {invoice && <>
        <InvoiceBreakdown invoice={invoice} />
        {invoice.status === 'DRAFT' && !editable && <p role="alert">Máy chủ chưa cung cấp phiên bản chuỗi chỉ số. Hãy cập nhật backend và tải lại trước khi sửa/hủy.</p>}
        {editable && <form ref={form} onSubmit={e => { e.preventDefault(); void save(false); }} className="mt-6 space-y-4">
          <p className="text-sm text-slate-600">Chỉ sửa chỉ số cuối kỳ và hạn đóng. Tiền thuê, đơn giá, số người và phí đã chốt được giữ nguyên; máy chủ tính lại tổng tiền.</p>
          <fieldset disabled={busy || blocked} className="grid sm:grid-cols-2 gap-4">
            <label className="grid gap-1">Chỉ số điện cuối kỳ (kWh)<input className="border rounded-lg p-2 min-w-0" type="number" required step="0.01" min={invoice.electricityStartReading} max="9999999999999.99" value={electricity} onChange={e => setElectricity(e.target.value)} /></label>
            {invoice.waterBillingMode !== 'PER_PERSON' ? <label className="grid gap-1">Chỉ số nước cuối kỳ (m³)<input className="border rounded-lg p-2 min-w-0" type="number" required step="0.01" min={invoice.waterStartReading} max="9999999999999.99" value={water} onChange={e => setWater(e.target.value)} /></label> : <p>Nước tính theo {invoice.occupantCount} người/tháng.</p>}
            <label className="grid gap-1">Hạn đóng<input className="border rounded-lg p-2 min-w-0" type="date" required min={`${invoice.period}-01`} value={due} onChange={e => setDue(e.target.value)} /></label>
            <label className="grid gap-1 sm:col-span-2">Lý do sửa hoặc hủy<textarea className="border rounded-lg p-2 min-w-0" required maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} /></label>
          </fieldset>
          <div className="op-buttons"><button type="submit" disabled={busy || blocked || confirmCancel} className="op-button op-button-primary">{busy ? 'Đang xử lý...' : 'Lưu thay đổi bản nháp'}</button><button type="button" disabled={busy || blocked} className="op-button text-red-700" onClick={() => setConfirmCancel(v => !v)}>Hủy bản nháp</button></div>
          {confirmCancel && <div className="rounded-lg border border-red-200 p-3 space-y-3"><p>Hủy hóa đơn nháp này? Hóa đơn và lịch sử vẫn được giữ. Bạn có thể lập lại cùng kỳ với mã mới; chỉ số đã lưu vẫn được giữ, kỳ sau không bỏ qua tháng này.</p><button type="button" className="op-button text-red-700" disabled={busy || blocked} onClick={() => void save(true)}>Xác nhận hủy bản nháp</button><button type="button" className="op-button ml-2" disabled={busy} onClick={() => setConfirmCancel(false)}>Quay lại</button></div>}
        </form>}
        <div className="mt-6 border-t pt-4"><h3 className="font-bold">Lịch sử hóa đơn</h3><p className="text-xs text-slate-500 mb-3">Các thao tác lập/sửa/hủy/gửi được ghi nhận từ khi chức năng này được triển khai. Lịch sử thanh toán được theo dõi riêng.</p>
          {historyError && <p role="alert" className="text-red-700">{historyError}</p>}
          {!events && !historyError && <p>Đang tải lịch sử...</p>}
          {events?.length === 0 && <p>Chưa có thao tác được ghi nhận.</p>}
          <ol className="space-y-3">{events?.map(event => <li key={event.id} className="border rounded-lg p-3 break-words"><strong>{actions[event.action] ?? event.action}</strong><p className="text-sm">{new Date(event.occurredAt).toLocaleString('vi-VN')} · Tài khoản #{event.actorId}</p>{event.reason && <p className="whitespace-pre-wrap">Lý do: {event.reason}</p>}<p className="text-sm">Tổng tiền: {event.before ? `${billingMoney(event.before.totalAmount)} → ` : ''}{billingMoney(event.after.totalAmount)}</p><details><summary className="cursor-pointer text-emerald-700">Xem dữ liệu trước/sau</summary>{event.before && <div className="mt-3"><h4 className="font-bold">Trước thay đổi</h4><InvoiceBreakdown invoice={event.before} /></div>}<div className="mt-3"><h4 className="font-bold">Sau thay đổi</h4><InvoiceBreakdown invoice={event.after} /></div></details></li>)}</ol>
        </div>
      </>}
    </section>
  </div>;
}
