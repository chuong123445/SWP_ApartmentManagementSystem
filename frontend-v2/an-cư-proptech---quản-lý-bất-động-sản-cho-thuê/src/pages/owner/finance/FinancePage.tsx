import { useState } from 'react';
import type { Building } from '@/types';
import type { Cashbook } from '@/hooks/useCashbook';
import type { CashEntry, CashDirection, CashStatus } from '@/types/finance';
import { cancelCashEntry, getCashEntry, postCashEntry } from '@/services/finance/cashService';
import { CashEntryForm } from '@/components/finance/CashEntryForm';

const statusLabels = { DRAFT: 'Nháp', POSTED: 'Đã xác nhận', CANCELLED: 'Đã hủy' };
const money = (value: string) => `${Number(value).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} đ`;
const dateTime = (value: string | null) => value ? new Date(value).toLocaleString('vi-VN') : '—';
const control = 'border border-slate-300 rounded-lg px-3 py-2 bg-white text-sm max-w-full';

export function FinancePage({ cashbook: book, buildings, propertyId, inventoryError, inventoryLoading }: {
  cashbook: Cashbook; buildings: Building[]; propertyId: string; inventoryError: string; inventoryLoading: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [detail, setDetail] = useState<CashEntry | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const openDetail = async (entry: CashEntry) => {
    setError('');setNotice('');setBusy(true);
    try { setDetail(await getCashEntry(entry.id));setReason(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không tải được phiếu.'); }
    finally { setBusy(false); }
  };
  const act = async (action: 'post' | 'cancel') => {
    if (!detail || busy) return;
    setBusy(true);setError('');setNotice('');
    try {
      const result = action === 'post' ? await postCashEntry(detail.id, detail.version) : await cancelCashEntry(detail.id, detail.version, reason.trim());
      setDetail(result);book.reload();setNotice(action === 'post' ? 'Đã xác nhận phiếu trên hệ thống.' : 'Đã hủy phiếu trên hệ thống.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không lưu được thao tác.');book.reload();
      // Refresh version/status after conflicts or a lost response after commit.
      try { setDetail(await getCashEntry(detail.id)); } catch { setDetail(null); }
    } finally { setBusy(false); }
  };
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-lg font-bold">Sổ Quỹ Thu - Chi & Dòng Tiền Thực Tế</h1>
      <button className="rounded-lg bg-emerald-700 px-4 py-2 text-white text-sm disabled:opacity-50" disabled={inventoryLoading || !buildings.length || !!inventoryError || busy} onClick={() => { setAdding(true);setError('');setNotice(''); }}>Tạo Phiếu Thu / Chi</button>
    </div>
    <p className="text-sm text-slate-600">Sổ ghi nhận thu–chi thủ công. Chỉ phiếu đã xác nhận được tính vào tổng; ghi phiếu không tự cập nhật thanh toán hóa đơn.</p>
    {inventoryError && <p role="alert" className="text-red-700">{inventoryError}</p>}
    {!inventoryLoading && !inventoryError && !buildings.length && <p>Chưa có tài sản để lập phiếu thu–chi.</p>}
    <div className="flex flex-wrap gap-3 items-end rounded-xl bg-white p-4 border">
      <label className="text-sm grid gap-1">Tháng giao dịch<input aria-label="Tháng giao dịch" type="month" min="1900-01" max="9998-12" className={control} value={book.month} onChange={e => { if (e.target.validity.valid && e.target.value) book.setMonth(e.target.value); }} /></label>
      <label className="text-sm grid gap-1">Loại phiếu<select aria-label="Lọc loại phiếu" className={control} value={book.direction} onChange={e => book.setDirection(e.target.value as CashDirection | '')}><option value="">Tất cả thu / chi</option><option value="INCOME">Khoản thu</option><option value="EXPENSE">Khoản chi</option></select></label>
      <label className="text-sm grid gap-1">Trạng thái<select aria-label="Lọc trạng thái phiếu" className={control} value={book.status} onChange={e => book.setStatus(e.target.value as CashStatus | '')}><option value="">Tất cả trạng thái</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <button className={control} disabled={book.loading || busy} onClick={book.reload}>Tải lại sổ quỹ</button>
    </div>
    <p className="text-xs text-slate-500">Phạm vi tài sản theo bộ chọn ở đầu trang. Tổng bên dưới theo tháng, tài sản và loại phiếu; luôn chỉ tính phiếu đã xác nhận, không phụ thuộc bộ lọc trạng thái hoặc trang danh sách.</p>
    {(error || book.error) && <p role="alert" className="text-sm text-red-700">{error || book.error}</p>}
    {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {[['Tổng thực thu', book.summary?.income], ['Tổng thực chi', book.summary?.expense], ['Dòng tiền ròng', book.summary?.netCashflow]].map(([label, value]) => <div className="bg-white border rounded-xl p-4 min-w-0" key={label}><div className="text-sm text-slate-600">{label}</div><div className="text-xl font-bold break-words mt-2">{value === undefined ? '—' : money(value)}</div></div>)}
    </div>
    <p className="text-xs text-slate-500">{book.summary ? `${book.summary.postedCount} phiếu đã xác nhận. ` : ''}Dòng tiền ròng là thu trừ chi, không phải lợi nhuận kinh doanh.</p>
    {book.loading ? <p role="status">Đang tải sổ quỹ…</p> : book.list && <>
      <div className="bg-white rounded-xl border overflow-hidden"><div className="overflow-x-auto">
        <table className="w-full text-sm text-left"><thead className="bg-slate-50"><tr>{['Mã phiếu', 'Tài sản / Ngày', 'Danh mục / Đối tác', 'Nội dung', 'Phương thức', 'Số tiền', 'Trạng thái', 'Thao tác'].map(label => <th className="p-3 whitespace-nowrap" key={label}>{label}</th>)}</tr></thead>
          <tbody>{book.list.items.map(entry => <tr className="border-t" key={entry.id}>
            <td className="p-3 whitespace-nowrap font-mono">{entry.code}</td><td className="p-3 min-w-36">{entry.propertyName}<div className="text-xs text-slate-500">{entry.transactionDate}</div></td>
            <td className="p-3 min-w-36">{entry.category}<div className="text-xs text-slate-500">{entry.counterparty}</div></td>
            <td className="p-3 min-w-44 max-w-sm break-words">{entry.description}</td><td className="p-3">{entry.paymentMethod === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'}</td>
            <td className={`p-3 whitespace-nowrap font-semibold ${entry.direction === 'INCOME' ? 'text-emerald-700' : 'text-rose-700'}`}>{entry.direction === 'INCOME' ? '+' : '-'}{money(entry.amount)}</td>
            <td className="p-3 whitespace-nowrap">{statusLabels[entry.status]}</td><td className="p-3"><button className="text-blue-700 underline whitespace-nowrap disabled:opacity-50" disabled={busy} onClick={() => void openDetail(entry)}>Xem phiếu {entry.code}</button></td>
          </tr>)}{!book.list.items.length && <tr><td className="p-6 text-slate-500" colSpan={8}>Không có phiếu trong phạm vi đã chọn.</td></tr>}</tbody>
        </table>
      </div></div>
      <div className="flex flex-wrap justify-between items-center gap-3 text-sm"><span>{book.list.totalElements} phiếu · Trang {book.list.totalPages ? book.page + 1 : 0}/{book.list.totalPages}</span><div className="flex gap-2"><button className={control} disabled={book.page === 0 || busy} onClick={() => book.setPage(book.page - 1)}>Trang trước</button><button className={control} disabled={book.page + 1 >= book.list.totalPages || busy} onClick={() => book.setPage(book.page + 1)}>Trang sau</button></div></div>
    </>}
    {adding && <CashEntryForm book={book} buildings={buildings} propertyId={propertyId} onClose={() => setAdding(false)} onSaved={entry => { setAdding(false);setDetail(entry);setReason('');setNotice(`Đã lưu nháp ${entry.code}. Kiểm tra phiếu trước khi xác nhận.`);book.reload(); }} />}
    {detail && <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-3"><section role="dialog" aria-modal="true" aria-labelledby="cash-detail-title" className="bg-white rounded-xl p-5 w-full max-w-xl max-h-[90dvh] overflow-y-auto space-y-3 break-words">
      <h2 id="cash-detail-title" className="text-lg font-bold">Phiếu {detail.code} — {statusLabels[detail.status]}</h2>
      <dl className="text-sm grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2">
        {[
          ['Tài sản', detail.propertyName], ['Ngày giao dịch', detail.transactionDate], ['Loại', detail.direction === 'INCOME' ? 'Thu' : 'Chi'], ['Số tiền', money(detail.amount)], ['Danh mục', detail.category], ['Người nộp / nhận', detail.counterparty], ['Nội dung', detail.description], ['Phương thức', detail.paymentMethod === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'], ['Tham chiếu', detail.reference || '—'],
          ['Tạo lúc / tài khoản', `${dateTime(detail.createdAt)} / #${detail.createdBy}`], ['Xác nhận lúc / tài khoản', `${dateTime(detail.postedAt)} / ${detail.postedBy ? `#${detail.postedBy}` : '—'}`], ['Hủy lúc / tài khoản', `${dateTime(detail.cancelledAt)} / ${detail.cancelledBy ? `#${detail.cancelledBy}` : '—'}`], ['Lý do hủy', detail.cancellationReason || '—'], ['Phiên bản', String(detail.version)],
        ].map(([label, value]) => <div className="contents" key={label}><dt className="text-slate-500">{label}</dt><dd>{value}</dd></div>)}
      </dl>
      {error && <p role="alert" className="text-red-700 text-sm">{error}</p>}
      {notice && <p role="status" className="text-emerald-700 text-sm">{notice}</p>}
      {detail.status !== 'CANCELLED' && <label className="grid gap-1 text-sm">Lý do hủy phiếu<textarea aria-label="Lý do hủy phiếu" className={control} value={reason} maxLength={1000} disabled={busy} onChange={e => setReason(e.target.value)} /></label>}
      <p className="text-xs text-slate-500">Xác nhận khi đã kiểm tra tiền thực nhận/chi. Hủy chỉ sửa sai ghi sổ, không thực hiện chuyển tiền hoàn.</p>
      <div className="flex flex-wrap justify-end gap-2"><button className={control} disabled={busy} onClick={() => { setDetail(null);setError(''); }}>Đóng</button>{detail.status !== 'CANCELLED' && <button className={`${control} text-red-700`} disabled={busy || !reason.trim()} onClick={() => void act('cancel')}>Hủy phiếu</button>}{detail.status === 'DRAFT' && <button className="rounded-lg bg-emerald-700 text-white px-3 py-2 disabled:opacity-50" disabled={busy} onClick={() => void act('post')}>Xác nhận đã thu / chi</button>}</div>
    </section></div>}
  </div>;
}
