import { useState } from 'react';
import { Banknote } from 'lucide-react';
import { paymentApi } from '@/services/payment/sepayService';
import { billingMoney } from '@/services/billing/billingService';
import type { BillingInvoice } from '@/types/billing';

export interface CashReceipt { invoiceId: string; cashEntryId: string; amount: string; paidAt: string }

const vietnamDate = (value: Date) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(value);

export function OwnerCashPayment({ invoice, onPaid }: { invoice: BillingInvoice; onPaid: (receipt: CashReceipt) => void }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(() => vietnamDate(new Date()));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (invoice.status !== 'SENT' || invoice.paymentStatus === 'PAID') return null;

  return <section aria-label="Nhận tiền mặt" className="mt-5 rounded-xl border border-brand-200 bg-brand-50 p-4 space-y-3">
    <button type="button" className="op-button" disabled={busy} onClick={() => { setOpen(!open); setError(''); }}>
      <Banknote size={18} />Đã nhận tiền mặt
    </button>
    {open && <form aria-label="Xác nhận thu tiền mặt" className="space-y-3" onSubmit={async event => {
      event.preventDefault();
      if (busy) return;
      setBusy(true);setError('');
      try {
        const receipt = await paymentApi<CashReceipt>(`/owner/invoices/${encodeURIComponent(invoice.id)}/cash-payment`, 'POST', {
          version: invoice.version, transactionDate: date, note: note.trim(),
        });
        onPaid(receipt);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Chưa xác nhận được tiền mặt.');
      } finally { setBusy(false); }
    }}>
      <p className="text-sm">Nhận đủ <strong>{billingMoney(invoice.totalAmount)}</strong> cho hóa đơn #{invoice.id}.
        Hệ thống sẽ đánh dấu đã thanh toán và ghi một phiếu thu tiền mặt vào sổ quỹ.</p>
      <label className="block text-sm font-medium">Ngày nhận tiền
        <input required type="date" value={date} disabled={busy}
          min={invoice.sentAt ? vietnamDate(new Date(invoice.sentAt)) : undefined} max={vietnamDate(new Date())}
          onChange={event => setDate(event.target.value)} className="mt-1 block w-full rounded-lg border bg-white p-3" />
      </label>
      <label className="block text-sm font-medium">Ghi chú nhận tiền
        <textarea value={note} maxLength={1000} disabled={busy} onChange={event => setNote(event.target.value)}
          className="mt-1 block w-full rounded-lg border bg-white p-3" />
      </label>
      <label className="flex gap-2 text-sm items-start"><input required type="checkbox" disabled={busy} className="mt-1" />
        Tôi đã nhận đủ số tiền trên bằng tiền mặt từ khách thuê.</label>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      <button type="submit" disabled={busy} className="op-button op-button-primary">{busy ? 'Đang xác nhận...' : 'Xác nhận đã nhận đủ tiền'}</button>
    </form>}
  </section>;
}
