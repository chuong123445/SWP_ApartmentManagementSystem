import { useEffect, useId, useRef, useState } from 'react';
import { Pagination } from '@/components/common/Pagination';
import { billingMoney, getOwnerReceivedInvoice } from '@/services/billing/billingService';
import type { OwnerInvoiceHistory } from '@/hooks/useOwnerInvoiceHistory';
import type { TestReceipt } from '@/services/payment/sepayService';

export function OwnerAdditionalInvoices({ history, search }: { history: OwnerInvoiceHistory; search: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => { setSelected(null); }, [history.filter, history.additionalPage]);
  if ((history.filter === 'DRAFT' || history.filter === 'CANCELLED')) return null;
  const items = history.additional?.items.filter(item => `${item.roomNumber} ${item.tenantName} ${item.id}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'))) ?? [];
  return <section aria-label="Phiếu thanh toán gửi người thuê" className="space-y-4">
    <div><h2 className="font-bold text-lg">Phiếu thanh toán gửi người thuê</h2><p className="text-sm text-slate-500 mt-1">Xem lại cả phiếu đã trả và chưa trả. Phiếu thử chỉ trên tài khoản chủ nhà không nằm trong danh sách này.</p></div>
    {history.additionalError && <p role="alert" className="op-error">{history.additionalError}</p>}
    {history.loading && <p role="status">Đang tải phiếu thanh toán...</p>}
    {!history.loading && !history.additionalError && <div className="op-panel"><table className="op-table"><thead><tr>{['Phiếu / ngày gửi', 'Căn hộ', 'Người thuê', 'Số tiền', 'Thanh toán', 'Thao tác'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>
      {items.map(item => <tr key={item.id} data-receipt-id={item.id}>
        <td data-label="Phiếu / ngày gửi"><strong>Phiếu #{item.id}</strong><span className="block text-xs text-slate-500">{new Date(item.createdAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</span></td>
        <td data-label="Căn hộ">{item.roomNumber}</td><td data-label="Người thuê">{item.tenantName}</td>
        <td data-label="Số tiền" className="op-money">{billingMoney(item.payment.amount ?? '0')}</td>
        <td data-label="Thanh toán"><span className={`op-badge ${item.payment.status === 'PAID' ? 'green' : 'amber'}`}>{item.payment.status === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}</span>{item.payment.paidAt && <span className="block text-xs mt-1">{new Date(item.payment.paidAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</span>}</td>
        <td data-label="Thao tác"><button type="button" className="op-link" onClick={() => setSelected(item.id)}>Xem phiếu #{item.id}</button></td>
      </tr>)}
      {!items.length && <tr><td colSpan={6} className="op-empty-cell">Không có phiếu gửi người thuê phù hợp với bộ lọc.</td></tr>}
    </tbody></table><p className="op-caption">{history.additional?.totalElements ?? 0} phiếu theo bộ lọc · Tìm kiếm tên/căn áp dụng trên trang hiện tại</p></div>}
    <Pagination page={history.additionalPage} totalPages={history.additional?.totalPages ?? 0} onChange={history.setAdditionalPage} />
    {selected && <OwnerReceiptDetail key={selected} id={selected} onClose={() => setSelected(null)} />}
  </section>;
}

function OwnerReceiptDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null); const titleId = useId();
  const [receipt, setReceipt] = useState<TestReceipt | null>(null); const [error, setError] = useState(''); const [revision, setRevision] = useState(0);
  useEffect(() => { const node = dialog.current!;const overflow = document.body.style.overflow;document.body.style.overflow = 'hidden';node.showModal();return () => { node.close();document.body.style.overflow = overflow; }; }, []);
  useEffect(() => {
    let active = true;let running = false;
    const load = async () => { if (!active || running) return;running = true;try { const item = await getOwnerReceivedInvoice(id);if (active) { setReceipt(item);setError(''); } } catch (error) { if (active) setError(error instanceof Error ? error.message : 'Không thể tải chi tiết phiếu.'); } finally { running = false; } };
    const refresh = () => { if (document.visibilityState === 'visible') void load(); };
    void load();const timer = window.setInterval(refresh, 10000);return () => { active = false;window.clearInterval(timer); };
  }, [id, revision]);
  return <dialog ref={dialog} aria-labelledby={titleId} onCancel={event => { event.preventDefault();onClose(); }} className="m-auto w-[calc(100%-2rem)] max-w-xl max-h-[90dvh] overflow-hidden rounded-2xl p-0 border border-slate-200 backdrop:bg-slate-900/50">
    <header className="p-4 sm:p-6 flex items-start justify-between gap-4"><h2 id={titleId} className="font-bold text-xl">Chi tiết phiếu #{id}</h2><button type="button" onClick={onClose} className="border rounded-lg px-3 py-2 shrink-0">Đóng</button></header>
    <div className="px-4 pb-4 sm:px-6 sm:pb-6 max-h-[calc(90dvh-7rem)] overflow-y-auto space-y-4">
      {error && <p role="alert" className="text-rose-700">{error}</p>}{!receipt && !error && <p role="status">Đang tải phiếu...</p>}
      {receipt && <><p className="font-semibold text-emerald-800">{receipt.payment.status === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}</p>
        <dl className="space-y-3 text-sm">{[['Người thuê', receipt.tenantName], ['Căn hộ', receipt.roomNumber], ['Hợp đồng', receipt.contractId ? `HD-${receipt.contractId}` : '—'], ['Số tiền', billingMoney(receipt.payment.amount ?? '0')], ['Ghi nhận thanh toán', receipt.payment.paidAt ? new Date(receipt.payment.paidAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : 'Chưa ghi nhận'], ['Mã tham chiếu', receipt.payment.paymentCode]].map(([label, value]) => <div key={label}><dt className="text-slate-500">{label}</dt><dd className="font-medium break-all mt-1">{value ?? '—'}</dd></div>)}</dl>
        <p className="text-xs text-slate-500">Phiếu gửi riêng được lưu độc lập, không tự cộng vào công nợ hoặc doanh thu hóa đơn tháng.</p></>}
      <button className="text-sm text-emerald-800 underline" onClick={() => setRevision(value => value + 1)}>Tải lại trạng thái thanh toán</button>
    </div>
  </dialog>;
}
