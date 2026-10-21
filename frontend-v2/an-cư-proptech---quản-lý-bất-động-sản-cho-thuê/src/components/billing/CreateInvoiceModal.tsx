import { useEffect, useRef, useState } from 'react';
import { X, Zap, Droplets, CheckCircle2 } from 'lucide-react';
import type { Invoice } from '@/types';
import type { Tenancy, BillingContext, BillingInvoice } from '@/types/billing';
import { getBillingContext, createInvoice, sendInvoice, invoiceView, billingMoney } from '@/services/billing/billingService';

export function CreateInvoiceModal({
  tenancies,
  utilityReadings,
  initialContractId,
  initialRoomId,
  onClose,
  onCreateInvoice,
}: {
  tenancies: Tenancy[];
  utilityReadings?: Record<string, { newElectric: string; newWater: string }>;
  initialContractId?: string | null;
  initialRoomId?: string | null;
  onClose: () => void;
  onCreateInvoice: (invoice: Invoice) => void;
}) {
  const active = tenancies.filter(c => c.status === 'ACTIVE');
  const defaultContractId = initialContractId
    ? initialContractId
    : initialRoomId
      ? (active.find(c => c.apartmentId === initialRoomId)?.id ?? active[0]?.id ?? '')
      : (active[0]?.id ?? '');

  const [contractId, setContractId] = useState(defaultContractId);
  const [context, setContext] = useState<BillingContext | null>(null);
  const [electricity, setElectricity] = useState('');
  const [water, setWater] = useState('');
  const [due, setDue] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<BillingInvoice | null>(null);
  const [revision, setRevision] = useState(0);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    let activeSub = true;
    setContext(null);
    setError('');
    if (!contractId) return;

    getBillingContext(contractId).then(c => {
      if (!activeSub) return;
      setContext(c);
      setDue(`${c.period}-28`);

      // Pre-fill from "Chỉ số điện nước" if entered
      const recorded = utilityReadings?.[c.apartmentId];
      const defaultE = c.electricityStartReading;
      const defaultW = c.waterStartReading;

      const initE = recorded?.newElectric && Number(recorded.newElectric) >= Number(defaultE)
        ? recorded.newElectric
        : defaultE;
      const initW = recorded?.newWater && Number(recorded.newWater) >= Number(defaultW)
        ? recorded.newWater
        : defaultW;

      setElectricity(initE);
      setWater(initW);
    }).catch(e => {
      if (activeSub) setError(e.message);
    });

    return () => { activeSub = false; };
  }, [contractId, revision, utilityReadings]);

  // Live calculations for pre-computed bill
  const electricStart = context ? Number(context.electricityStartReading) || 0 : 0;
  const electricEnd = Number(electricity) || electricStart;
  const electricUsage = Math.max(0, electricEnd - electricStart);
  const electricUnitPrice = context ? Number(context.electricityUnitPrice) || 0 : 0;
  const electricCost = electricUsage * electricUnitPrice;

  const waterStart = context ? Number(context.waterStartReading) || 0 : 0;
  const waterEnd = Number(water) || waterStart;
  const waterUsage = Math.max(0, waterEnd - waterStart);
  const waterUnitPrice = context ? Number(context.waterUnitPrice) || 0 : 0;
  const waterCost = waterUsage * waterUnitPrice;

  const monthlyRent = context ? Number(context.monthlyRent) || 0 : 0;
  const totalExpected = monthlyRent + electricCost + waterCost;

  const handleElectricityChange = (val: string) => {
    setElectricity(val);
  };

  const handleWaterChange = (val: string) => {
    setWater(val);
  };

  const save = async (send: boolean) => {
    if (saving || !context || !form.current?.reportValidity()) return;
    setSaving(true);
    setError('');
    try {
      const draft = created ?? await createInvoice(contractId, {
        period: context.period,
        electricityEndReading: electricity,
        waterEndReading: water,
        dueDate: due,
        baselineVersion: context.baselineVersion
      });
      setCreated(draft);
      onCreateInvoice(invoiceView(draft));
      if (send) {
        const sent = await sendInvoice(draft.id, draft.version);
        onCreateInvoice(invoiceView(sent));
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể lưu/gửi hóa đơn.');
    } finally {
      setSaving(false);
    }
  };

  const cls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
      <section role="dialog" aria-label="Lập hóa đơn" className="bg-white rounded-2xl p-6 max-w-xl w-full max-h-[90vh] overflow-auto shadow-2xl">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Lập Hóa Đơn Cho Người Thuê</h2>
            <p className="text-xs text-slate-500">Thông tin tiền phòng, điện nước được tính sẵn từ chỉ số đã nhập</p>
          </div>
          <button onClick={onClose} disabled={saving} aria-label="Đóng" className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {error && (
          <p role="alert" className="bg-rose-50 text-rose-700 rounded-lg p-3 mt-4 text-xs">
            {error}
            {!created && <button type="button" onClick={() => setRevision(v => v + 1)} className="ml-2 underline font-semibold">Tải lại</button>}
          </p>
        )}

        {!active.length && (
          <p className="py-4 text-slate-500 text-sm">Chưa có hợp đồng đang hoạt động để lập hóa đơn.</p>
        )}

        <form ref={form} onSubmit={e => { e.preventDefault(); void save(false); }} className="space-y-4 mt-4">
          <fieldset disabled={saving || !!created} className="space-y-4">
            <div>
              <label htmlFor="invoice-contract" className="text-xs font-bold text-slate-700 block mb-1">
                Chọn Căn Hộ / Khách Thuê:
              </label>
              <select
                id="invoice-contract"
                required
                className={cls}
                value={contractId}
                onChange={e => setContractId(e.target.value)}
              >
                <option value="">-- Chọn quan hệ thuê để lập hóa đơn --</option>
                {active.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.roomNumber} — {c.customerName} ({c.propertyName})
                  </option>
                ))}
              </select>
            </div>

            {contractId && !context && !error && (
              <p role="status" className="text-xs text-slate-500 italic py-2">
                Đang tải chỉ số đầu kỳ và tính toán chi phí...
              </p>
            )}

            {context && (
              <>
                {/* Thông tin tính sẵn */}
                <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                    <div>
                      <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                        Thông Tin Đã Tính Sẵn
                      </span>
                      <div className="text-xs font-semibold text-slate-800">
                        Căn {context.roomNumber} · Khách: {context.tenantName} · Kỳ {context.period}
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Tự động tính từ chỉ số điện nước
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-emerald-100/50">
                      <span className="text-slate-600 font-medium">1. Tiền thuê phòng (1 tháng)</span>
                      <span className="font-bold text-slate-900">{billingMoney(context.monthlyRent)}</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-emerald-100/50">
                      <div>
                        <span className="text-slate-600 font-medium flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-600" /> 2. Tiền điện sinh hoạt
                        </span>
                        <span className="text-slate-400 block text-[11px] mt-0.5">
                          {electricStart} → {electricEnd} kWh ({electricUsage} kWh × {billingMoney(context.electricityUnitPrice)}/kWh)
                        </span>
                      </div>
                      <span className="font-bold text-amber-700">{electricCost.toLocaleString('vi-VN')} đ</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-emerald-100/50">
                      <div>
                        <span className="text-slate-600 font-medium flex items-center gap-1">
                          <Droplets className="w-3 h-3 text-sky-600" /> 3. Tiền nước sinh hoạt
                        </span>
                        <span className="text-slate-400 block text-[11px] mt-0.5">
                          {waterStart} → {waterEnd} m³ ({waterUsage} m³ × {billingMoney(context.waterUnitPrice)}/m³)
                        </span>
                      </div>
                      <span className="font-bold text-sky-700">{waterCost.toLocaleString('vi-VN')} đ</span>
                    </div>

                    <div className="flex justify-between pt-2 text-sm font-extrabold text-slate-900 border-t border-emerald-200">
                      <span>Tổng tiền hóa đơn dự tính:</span>
                      <span className="text-emerald-700 text-base">{totalExpected.toLocaleString('vi-VN')} đ</span>
                    </div>
                  </div>
                </div>

                {/* Kiểm tra & điều chỉnh chỉ số */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                  <span className="text-xs font-bold text-slate-700 block">
                    Kiểm Tra & Điều Chỉnh Chỉ Số Cuối Kỳ (nếu cần):
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="invoice-electricity" className="text-xs font-semibold text-slate-600 block mb-1">
                        Chỉ số điện cuối (kWh)
                      </label>
                      <input
                        id="invoice-electricity"
                        required
                        type="number"
                        step="0.01"
                        min={context.electricityStartReading}
                        value={electricity}
                        onChange={e => handleElectricityChange(e.target.value)}
                        className={cls}
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Đầu kỳ: {context.electricityStartReading} kWh
                      </span>
                    </div>

                    <div>
                      <label htmlFor="invoice-water" className="text-xs font-semibold text-slate-600 block mb-1">
                        Chỉ số nước cuối (m³)
                      </label>
                      <input
                        id="invoice-water"
                        required
                        type="number"
                        step="0.01"
                        min={context.waterStartReading}
                        value={water}
                        onChange={e => handleWaterChange(e.target.value)}
                        className={cls}
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Đầu kỳ: {context.waterStartReading} m³
                      </span>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="invoice-due-date" className="text-xs font-semibold text-slate-600 block mb-1">
                      Hạn đóng tiền
                    </label>
                    <input
                      id="invoice-due-date"
                      required
                      type="date"
                      min={`${context.period}-01`}
                      value={due}
                      onChange={e => setDue(e.target.value)}
                      className={cls}
                    />
                  </div>
                </div>
              </>
            )}
          </fieldset>

          {created && (
            <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
              Đã lưu bản nháp thành công. Bạn có thể bấm gửi ngay cho người thuê bên dưới.
            </p>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              id="btn-confirm-create-invoice"
              disabled={saving || !context}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition-colors"
            >
              Lưu bản nháp
            </button>
            <button
              type="button"
              id="btn-create-send-invoice"
              disabled={saving || !context}
              onClick={() => void save(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs disabled:opacity-50 transition-colors"
            >
              {saving ? 'Đang xử lý...' : created ? 'Gửi lại' : 'Lập & Gửi Hóa Đơn'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
