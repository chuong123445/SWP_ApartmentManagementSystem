import { useState } from 'react';
import type { Invoice } from '@/types';
import { billingMoney } from '@/services/billing/billingService';
import { Pagination } from '@/components/common/Pagination';
export function InvoicesPage({ invoices, onOpenInvoiceModal, onOpenCreateInvoiceModal, onSendInvoice, error, loading, onReload, page, totalPages, onPageChange }: {
  invoices: Invoice[]; onOpenInvoiceModal: (i: Invoice) => void; onOpenCreateInvoiceModal: () => void;
  onSendInvoice: (id: string) => Promise<void>; error: string; loading: boolean; onReload: () => void;
  page: number; totalPages: number; onPageChange: (page: number) => void;
}) {
  const [filter, setFilter] = useState('all'); const [search, setSearch] = useState('');const [sendError, setSendError] = useState('');const [sending, setSending] = useState('');
  const visible = invoices.filter(i => (filter === 'all' || i.apiInvoice?.status === filter) && `${i.roomNumber} ${i.tenantName} ${i.monthYear}`.toLowerCase().includes(search.toLowerCase()));
  const send = async (id: string) => { setSending(id);setSendError('');try { await onSendInvoice(id); } catch (e) { setSendError(e instanceof Error ? e.message : 'Không thể gửi hóa đơn.'); } finally { setSending(''); } };
  return <div className="space-y-5 pb-12"><div className="bg-white p-5 border rounded-xl flex flex-wrap justify-between gap-4"><div><h1 className="text-xl font-bold">Hóa đơn người thuê</h1><p className="text-sm text-slate-500 mt-1">Lập từ chỉ số công tơ và giá hợp đồng; gửi đến tài khoản thuê của căn hộ.</p></div>
    <div className="flex gap-3"><button onClick={onReload} className="border rounded-lg px-4 py-2">Làm mới</button><button id="btn-create-invoice-page" onClick={onOpenCreateInvoiceModal} className="bg-emerald-600 text-white px-4 py-2 rounded-lg">Lập Hóa Đơn Mới</button></div></div>
    {(error || sendError) && <p role="alert" className="bg-rose-50 text-rose-700 p-4 rounded-lg">{error || sendError}</p>}
    <div className="bg-white p-4 border rounded-xl flex flex-wrap gap-4 justify-between"><div className="flex gap-2">{[['all','Tất cả'],['DRAFT','Bản nháp'],['SENT','Đã gửi']].map(([v,label]) => <button key={v} onClick={() => setFilter(v)} className={`px-3 py-2 rounded-lg text-sm ${filter === v ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}>{label}</button>)}</div><input aria-label="Tìm hóa đơn" value={search} onChange={e => setSearch(e.target.value)} placeholder="Căn hộ, người thuê, kỳ..." className="border rounded-lg px-3 py-2 text-sm" /></div>
    {loading && <p role="status">Đang tải hóa đơn...</p>}
    <div className="bg-white border rounded-xl overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50"><tr>{['Kỳ','Căn hộ','Người thuê','Hạn đóng','Tổng tiền','Trạng thái','Thao tác'].map(x => <th key={x} className="p-4 text-left">{x}</th>)}</tr></thead><tbody>
      {visible.map(i => <tr key={i.id} data-invoice-id={i.id} className="border-t"><td className="p-4">{i.monthYear}</td><td className="p-4 font-semibold">{i.roomNumber}</td><td className="p-4">{i.tenantName}</td><td className="p-4">{i.dueDate}</td><td className="p-4 font-semibold">{billingMoney(i.apiInvoice!.totalAmount)}</td><td className="p-4">{i.apiInvoice?.status === 'SENT' ? 'Đã gửi' : 'Bản nháp'}</td><td className="p-4"><button onClick={() => onOpenInvoiceModal(i)} className="text-emerald-700 mr-4">Chi tiết</button>{i.apiInvoice?.status === 'DRAFT' && <button disabled={!!sending} onClick={() => void send(i.id)} className="text-emerald-700">{sending === i.id ? 'Đang gửi...' : 'Gửi người thuê'}</button>}</td></tr>)}
      {!loading && !visible.length && <tr><td colSpan={7} className="p-8 text-center text-slate-500">Chưa có hóa đơn phù hợp.</td></tr>}
    </tbody></table></div><Pagination page={page} totalPages={totalPages} onChange={onPageChange} />
  </div>;
}
