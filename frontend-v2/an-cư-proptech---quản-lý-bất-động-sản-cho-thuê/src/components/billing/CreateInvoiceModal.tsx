import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { Invoice } from '@/types';
import type { Tenancy, BillingContext, BillingInvoice } from '@/types/billing';
import { getBillingContext, createInvoice, sendInvoice, invoiceView, billingMoney } from '@/services/billing/billingService';
export function CreateInvoiceModal({ tenancies, onClose, onCreateInvoice }: {
  tenancies: Tenancy[]; onClose: () => void; onCreateInvoice: (invoice: Invoice) => void;
}) {
  const active = tenancies.filter(c => c.status === 'ACTIVE');
  const [contractId, setContractId] = useState(active[0]?.id ?? '');
  const [context, setContext] = useState<BillingContext | null>(null);
  const [electricity, setElectricity] = useState(''); const [water, setWater] = useState('');const [due, setDue] = useState('');
  const [error, setError] = useState('');const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<BillingInvoice | null>(null);const [revision, setRevision] = useState(0);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    let active = true;setContext(null);setError('');
    if (!contractId) return;
    getBillingContext(contractId).then(c => { if (active) { setContext(c);setElectricity(c.electricityStartReading);setWater(c.waterStartReading);setDue(`${c.period}-28`); } })
      .catch(e => { if (active) setError(e.message); });return () => { active = false; };
  }, [contractId, revision]);
  const save = async (send: boolean) => {
    if (saving || !context || !form.current?.reportValidity()) return;
    setSaving(true);setError('');
    try {
      const draft = created ?? await createInvoice(contractId, { period: context.period, electricityEndReading: electricity, waterEndReading: water, dueDate: due, baselineVersion: context.baselineVersion });
      setCreated(draft);onCreateInvoice(invoiceView(draft));
      if (send) { const sent = await sendInvoice(draft.id, draft.version);onCreateInvoice(invoiceView(sent)); }
      onClose();
    } catch (e) { setError(e instanceof Error ? e.message : 'Không thể lưu/gửi hóa đơn.'); }
    finally { setSaving(false); }
  };
  const cls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm';
  return <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"><section role="dialog" aria-label="Lập hóa đơn" className="bg-white rounded-2xl p-6 max-w-xl w-full max-h-[90vh] overflow-auto">
    <div className="flex justify-between items-center"><h2 className="text-lg font-bold">Lập hóa đơn cho người thuê</h2><button onClick={onClose} disabled={saving} aria-label="Đóng"><X /></button></div>
    {error && <p role="alert" className="bg-rose-50 text-rose-700 rounded-lg p-3 mt-4">{error}{!created && <button type="button" onClick={() => setRevision(v => v + 1)} className="ml-2 underline">Tải lại</button>}</p>}
    {!active.length && <p className="py-4 text-slate-500">Chưa có hợp đồng đang hoạt động để lập hóa đơn.</p>}
    <form ref={form} onSubmit={e => { e.preventDefault(); void save(false); }} className="space-y-4 mt-4">
      <fieldset disabled={saving || !!created} className="space-y-4">
        <div><label htmlFor="invoice-contract" className="text-sm font-semibold">Căn hộ / Người thuê</label><select id="invoice-contract" required className={cls} value={contractId} onChange={e => setContractId(e.target.value)}><option value="">Chọn quan hệ thuê</option>{active.map(c => <option key={c.id} value={c.id}>{c.roomNumber} — {c.customerName}</option>)}</select></div>
        {contractId && !context && !error && <p role="status">Đang tải chỉ số đầu và giá hợp đồng...</p>}
        {context && <><div className="bg-slate-50 rounded-lg p-3 text-sm"><p>Kỳ: <strong>{context.period}</strong> · Tiền thuê: <strong>{billingMoney(context.monthlyRent)}</strong></p><p>Điện đầu: {context.electricityStartReading} kWh · {billingMoney(context.electricityUnitPrice)}/kWh</p><p>Nước đầu: {context.waterStartReading} m³ · {billingMoney(context.waterUnitPrice)}/m³</p></div>
          <div className="grid grid-cols-2 gap-4"><div><label htmlFor="invoice-electricity" className="text-sm font-semibold">Chỉ số điện cuối kỳ</label><input id="invoice-electricity" required type="number" step="0.01" min={context.electricityStartReading} value={electricity} onChange={e => setElectricity(e.target.value)} className={cls} /></div>
            <div><label htmlFor="invoice-water" className="text-sm font-semibold">Chỉ số nước cuối kỳ</label><input id="invoice-water" required type="number" step="0.01" min={context.waterStartReading} value={water} onChange={e => setWater(e.target.value)} className={cls} /></div></div>
          <div><label htmlFor="invoice-due-date" className="text-sm font-semibold">Hạn đóng</label><input id="invoice-due-date" required type="date" min={`${context.period}-01`} value={due} onChange={e => setDue(e.target.value)} className={cls} /></div></>}
      </fieldset>
      {created && <p className="text-sm text-amber-700">Đã lưu bản nháp. Bạn có thể thử gửi lại hóa đơn này.</p>}
      <div className="flex justify-end gap-3 pt-4 border-t"><button type="button" onClick={onClose} disabled={saving}>Hủy</button>
        <button type="submit" id="btn-confirm-create-invoice" disabled={saving || !context} className="border rounded-lg px-4 py-2 disabled:opacity-50">Lưu bản nháp</button>
        <button type="button" id="btn-create-send-invoice" disabled={saving || !context} onClick={() => void save(true)} className="bg-emerald-600 text-white rounded-lg px-4 py-2 disabled:opacity-50">{saving ? 'Đang xử lý...' : created ? 'Gửi lại' : 'Lập và gửi'}</button></div>
    </form>
  </section></div>;
}
