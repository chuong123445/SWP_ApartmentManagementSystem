import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Building } from '@/types';
import type { CashCreate, CashEntry } from '@/types/finance';
import { cashToday, type Cashbook } from '@/hooks/useCashbook';

const control = 'w-full border border-slate-300 rounded-lg px-3 py-2 bg-white disabled:bg-slate-100';
export function CashEntryForm({ book, buildings, propertyId, onClose, onSaved }: {
  book: Cashbook; buildings: Building[]; propertyId: string; onClose: () => void; onSaved: (entry: CashEntry) => void;
}) {
  const [input, setInput] = useState<Omit<CashCreate, 'requestKey'>>({
    propertyId: Number(propertyId === 'all' ? buildings[0]?.id ?? 0 : propertyId), direction: 'EXPENSE',
    paymentMethod: 'BANK_TRANSFER', transactionDate: cashToday(), amount: '', category: '', counterparty: '', description: '', reference: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const change = <K extends keyof typeof input>(key: K, value: typeof input[K]) => setInput(prev => ({ ...prev, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();if (busy) return;
    setBusy(true);setSubmitted(true);setError('');
    try { onSaved(await book.create(input)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không lưu được phiếu.'); }
    finally { setBusy(false); }
  };
  return <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-3"><section role="dialog" aria-modal="true" aria-labelledby="cash-create-title" className="bg-white rounded-xl p-5 w-full max-w-lg max-h-[90dvh] overflow-y-auto">
    <h2 id="cash-create-title" className="font-bold text-lg mb-3">Lập phiếu thu / chi</h2>
    <p className="text-sm text-slate-600 mb-3">Lưu phiếu ở trạng thái nháp. Tiền chỉ vào tổng khi bạn xác nhận đã thu / chi.</p>
    <form onSubmit={submit} className="grid gap-3 text-sm">
      <fieldset disabled={busy || submitted} className="grid gap-3">
        <label className="grid gap-1">Tài sản *<select aria-label="Tài sản lập phiếu" className={control} value={input.propertyId} required onChange={e => change('propertyId', Number(e.target.value))}>{buildings.map(p => <option value={p.id} key={p.id}>{p.name}</option>)}</select></label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="grid gap-1">Loại phiếu *<select className={control} value={input.direction} onChange={e => change('direction', e.target.value as CashCreate['direction'])}><option value="EXPENSE">Chi</option><option value="INCOME">Thu</option></select></label>
          <label className="grid gap-1">Ngày giao dịch *<input type="date" required min="1900-01-01" max={cashToday()} className={control} value={input.transactionDate} onChange={e => change('transactionDate', e.target.value)} /></label>
        </div>
        <label className="grid gap-1">Danh mục *<input className={control} required maxLength={100} value={input.category} onChange={e => change('category', e.target.value)} /></label>
        <label className="grid gap-1">Số tiền (VNĐ) *<input className={control} type="number" required min="0.01" max="9999999999999.99" step="0.01" value={input.amount} onChange={e => change('amount', e.target.value)} /></label>
        <label className="grid gap-1">Người nộp / nhận *<input className={control} required maxLength={200} value={input.counterparty} onChange={e => change('counterparty', e.target.value)} /></label>
        <label className="grid gap-1">Nội dung *<textarea className={control} required maxLength={2000} value={input.description} onChange={e => change('description', e.target.value)} /></label>
        <label className="grid gap-1">Phương thức<select className={control} value={input.paymentMethod} onChange={e => change('paymentMethod', e.target.value as CashCreate['paymentMethod'])}><option value="BANK_TRANSFER">Chuyển khoản</option><option value="CASH">Tiền mặt</option></select></label>
        <label className="grid gap-1">Mã tham chiếu (tùy chọn)<input className={control} maxLength={200} value={input.reference} onChange={e => change('reference', e.target.value)} /></label>
      </fieldset>
      {error && <><p role="alert" className="text-red-700">{error}</p><p className="text-xs text-slate-600">Nếu mất phản hồi, thử lại cùng nội dung để hệ thống trả phiếu đã tạo, tránh tạo trùng. Chọn sửa nội dung chỉ khi đã kiểm tra phiếu cũ chưa được lưu.</p><button type="button" className="underline text-left" onClick={() => setSubmitted(false)}>Sửa nội dung</button></>}
      <div className="flex justify-end gap-2"><button type="button" className="px-3 py-2 border rounded-lg" disabled={busy} onClick={onClose}>Đóng</button><button type="submit" className="px-4 py-2 bg-emerald-700 text-white rounded-lg disabled:opacity-50" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu nháp'}</button></div>
    </form>
  </section></div>;
}
