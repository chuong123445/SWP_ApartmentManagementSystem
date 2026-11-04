import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { Invoice } from '@/types';
import type { Tenancy, BillingContext, BillingInvoice } from '@/types/billing';
import { getBillingContext, createInvoice, sendInvoice, saveMeterReadings, invoiceView, billingMoney } from '@/services/billing/billingService';
export function CreateInvoiceModal({ tenancies, onClose, onCreateInvoice, initialContractId, onOpenUtilities }: {
  initialContractId?:string; onOpenUtilities?:()=>void;
  tenancies: Tenancy[]; onClose: () => void; onCreateInvoice: (invoice: Invoice) => void;
}) {
  const active = tenancies.filter(c => c.status === 'ACTIVE');
  const [contractId, setContractId] = useState(initialContractId ?? active[0]?.id ?? '');
  const [context, setContext] = useState<BillingContext | null>(null);
  const [due, setDue] = useState('');
  const [electricity, setElectricity] = useState('');const [water, setWater] = useState('');
  const submitting = useRef(false);
  const [error, setError] = useState('');const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<BillingInvoice | null>(null);const [revision, setRevision] = useState(0);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (created) return;
    const eligible = tenancies.filter(contract => contract.status === 'ACTIVE');
    if (!eligible.some(contract => contract.id === contractId)) setContractId(eligible[0]?.id ?? '');
  }, [tenancies, contractId, created]);
  useEffect(() => {
    let active = true;setContext(null);setError('');
    if (!contractId) return;
    getBillingContext(contractId).then(c => { if (active) { setContext(c);setDue(`${c.period}-28`);setElectricity(c.savedReading?.electricityEndReading??'');setWater(c.savedReading?.waterEndReading??''); } })
      .catch(e => { if (active) setError(e.message); });return () => { active = false; };
  }, [contractId, revision]);
  const save = async (send: boolean) => {
    if (submitting.current || !context || !form.current?.reportValidity()) return;
    submitting.current=true;setSaving(true);setError('');
    try {
      let current=context;
      const waterEnd=current.waterBillingMode==='PER_PERSON'?current.waterStartReading:water;
      if(!created && current.savedReading && (Number(electricity)!==Number(current.savedReading.electricityEndReading)||Number(waterEnd)!==Number(current.savedReading.waterEndReading))){
        current=await saveMeterReadings(contractId,{period:current.period,baselineVersion:current.baselineVersion,electricityEndReading:electricity,waterEndReading:waterEnd,applyPropertyRates:false,keepSavedTariff:true});
        setContext(current);
      }
      const draft = created ?? await createInvoice(contractId, { period: current.period, useSavedReadings:!!current.savedReading,
        ...(current.savedReading?{}:{electricityEndReading:electricity,waterEndReading:waterEnd}),dueDate: due, baselineVersion: current.baselineVersion });
      setCreated(draft);onCreateInvoice(invoiceView(draft));
      if (send) { const sent = await sendInvoice(draft.id, draft.version);onCreateInvoice(invoiceView(sent)); }
      onClose();
    } catch (e) { setError(e instanceof Error ? e.message : 'Không thể lưu/gửi hóa đơn.'); }
    finally { submitting.current=false;setSaving(false); }
  };
  const cls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm';
  return <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"><section role="dialog" aria-label="Lập hóa đơn" className="bg-white rounded-2xl p-6 max-w-xl w-full max-h-[90vh] overflow-auto">
    <div className="flex justify-between items-center"><h2 className="text-lg font-bold">Lập hóa đơn cho người thuê</h2><button onClick={onClose} disabled={saving} aria-label="Đóng"><X /></button></div>
    {error && <p role="alert" className="bg-rose-50 text-rose-700 rounded-lg p-3 mt-4">{error}{!created && <button type="button" onClick={() => setRevision(v => v + 1)} className="ml-2 underline">Tải lại</button>}</p>}
    {!active.length && <p className="py-4 text-slate-500">Chưa có hợp đồng đang hoạt động để lập hóa đơn.</p>}
    <form ref={form} onSubmit={e => { e.preventDefault(); void save(false); }} className="space-y-4 mt-4">
      <fieldset disabled={saving || !!created} className="space-y-4">
        <div><label htmlFor="invoice-contract" className="text-sm font-semibold">Căn hộ / Người thuê</label><select id="invoice-contract" required className={cls} value={contractId} onChange={e => setContractId(e.target.value)}><option value="">Chọn quan hệ thuê</option>{active.map(c => <option key={c.id} value={c.id}>{c.roomNumber} — {c.customerName}</option>)}</select></div>
        {contractId && !context && !error && <p role="status">Đang tải dữ liệu lập hóa đơn...</p>}
        {context && <><div className="bg-slate-50 rounded-lg p-3 text-sm"><p>Kỳ: <strong>{context.period}</strong> · Tiền thuê: <strong>{billingMoney(context.monthlyRent)}</strong></p><p>Internet: {billingMoney(context.internetFee??'0')} · Vệ sinh/rác: {billingMoney(context.garbageFee??'0')} mỗi tháng</p></div>
          <p className="text-sm text-slate-600">Chỉ số đầu kỳ tự lấy từ hóa đơn kỳ trước, hoặc mốc bàn giao; chưa có số quá khứ thì dùng 0. Nhập chỉ số công tơ cuối kỳ bên dưới.</p>
          {context.savedReading&&<p className="text-sm text-emerald-700">Đã lấy chỉ số đã chốt. Bạn có thể sửa trực tiếp; đơn giá đã chốt được giữ nguyên.</p>}
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="text-sm font-semibold">Điện đầu kỳ (kWh)<input className={`${cls} mt-1 bg-slate-50`} readOnly value={context.electricityStartReading??'0'}/></label>
            <label className="text-sm font-semibold">Chỉ số điện cuối kỳ (kWh)<input className={`${cls} mt-1`} required type="number" min={context.electricityStartReading??'0'} max="9999999999999.99" step="0.01" value={electricity} onChange={e=>setElectricity(e.target.value)}/><span className="block mt-1 text-xs text-slate-500">Đơn giá: {billingMoney(context.electricityUnitPrice)}/kWh</span></label>
            {context.waterBillingMode==='PER_PERSON'?<p className="sm:col-span-2 rounded-lg bg-sky-50 p-3 text-sm text-sky-900">Nước: {context.occupantCount??1} người × {billingMoney(context.waterUnitPrice)}/người/tháng. Không cần nhập chỉ số nước.</p>:<>
              <label className="text-sm font-semibold">Nước đầu kỳ (m³)<input className={`${cls} mt-1 bg-slate-50`} readOnly value={context.waterStartReading??'0'}/></label>
              <label className="text-sm font-semibold">Chỉ số nước cuối kỳ (m³)<input className={`${cls} mt-1`} required type="number" min={context.waterStartReading??'0'} max="9999999999999.99" step="0.01" value={water} onChange={e=>setWater(e.target.value)}/><span className="block mt-1 text-xs text-slate-500">Đơn giá: {billingMoney(context.waterUnitPrice)}/m³</span></label>
            </>}
          </div>
          {onOpenUtilities&&<button type="button" onClick={onOpenUtilities} className="text-sm underline text-emerald-700">Mở mục Chỉ số Điện Nước</button>}
          <div><label htmlFor="invoice-due-date" className="text-sm font-semibold">Hạn đóng</label><input id="invoice-due-date" required type="date" min={`${context.period}-01`} value={due} onChange={e => setDue(e.target.value)} className={cls} /></div></>}
      </fieldset>
      {created && <p className="text-sm text-amber-700">Đã lưu bản nháp. Bạn có thể thử gửi lại hóa đơn này.</p>}
      <div className="flex justify-end gap-3 pt-4 border-t"><button type="button" onClick={onClose} disabled={saving}>Hủy</button>
        <button type="submit" id="btn-confirm-create-invoice" disabled={saving || !context} className="border rounded-lg px-4 py-2 disabled:opacity-50">Lưu bản nháp</button>
        <button type="button" id="btn-create-send-invoice" disabled={saving || !context} onClick={() => void save(true)} className="bg-emerald-600 text-white rounded-lg px-4 py-2 disabled:opacity-50">{saving ? 'Đang xử lý...' : created ? 'Gửi lại' : 'Lập và gửi'}</button></div>
    </form>
  </section></div>;
}
