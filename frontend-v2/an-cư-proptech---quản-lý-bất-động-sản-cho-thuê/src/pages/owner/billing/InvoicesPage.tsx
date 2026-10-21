import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { Invoice } from '@/types';
import { billingMoney } from '@/services/billing/billingService';
import { Pagination } from '@/components/common/Pagination';

export function InvoicesPage({
  invoices,
  onOpenInvoiceModal,
  onOpenCreateInvoiceModal,
  onSendInvoice,
  onMarkPaid,
  error,
  loading,
  onReload,
  page,
  totalPages,
  onPageChange
}: {
  invoices: Invoice[];
  onOpenInvoiceModal: (i: Invoice) => void;
  onOpenCreateInvoiceModal: () => void;
  onSendInvoice: (id: string) => Promise<void>;
  onMarkPaid?: (id: string) => void;
  error: string;
  loading: boolean;
  onReload: () => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sendError, setSendError] = useState('');
  const [sending, setSending] = useState('');
  const [paidToast, setPaidToast] = useState<string | null>(null);

  const visible = invoices.filter(i => {
    const matchesFilter = filter === 'all'
      ? true
      : filter === 'paid'
        ? i.status === 'paid'
        : (i.status !== 'paid' && i.apiInvoice?.status === filter);

    const matchesSearch = `${i.roomNumber} ${i.tenantName} ${i.monthYear}`.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const send = async (id: string) => {
    setSending(id);
    setSendError('');
    try {
      await onSendInvoice(id);
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Không thể gửi hóa đơn.');
    } finally {
      setSending('');
    }
  };

  const handleConfirmPay = (inv: Invoice) => {
    if (!onMarkPaid) return;
    onMarkPaid(inv.id);
    setPaidToast(`Đã xác nhận thanh toán căn ${inv.roomNumber}! Chỉ số điện nước mới đã được gán thành chỉ số cũ.`);
    setTimeout(() => setPaidToast(null), 5000);
  };

  return (
    <div className="space-y-5 pb-12">
      <div className="bg-white p-5 border rounded-xl flex flex-wrap justify-between gap-4 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Hóa đơn người thuê</h1>

        </div>
        <div className="flex gap-3">
          <button onClick={onReload} className="border border-slate-300 rounded-lg px-4 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors">
            Làm mới
          </button>
          <button id="btn-create-invoice-page" onClick={onOpenCreateInvoiceModal} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-xs">
            Lập Hóa Đơn Mới
          </button>
        </div>
      </div>

      {(error || sendError) && (
        <p role="alert" className="bg-rose-50 text-rose-700 p-4 rounded-lg text-xs font-medium">
          {error || sendError}
        </p>
      )}

      {paidToast && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{paidToast}</span>
          </div>
          <button onClick={() => setPaidToast(null)} className="text-emerald-700 underline font-medium">Đóng</button>
        </div>
      )}

      <div className="bg-white p-4 border rounded-xl flex flex-wrap gap-4 justify-between items-center shadow-xs">
        <div className="flex gap-2">
          {[
            ['all', 'Tất cả'],
            ['DRAFT', 'Bản nháp'],
            ['SENT', 'Chờ thanh toán (Đã gửi)'],
            ['paid', 'Đã thanh toán'],
          ].map(([v, label]) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === v ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          aria-label="Tìm hóa đơn"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Căn hộ, người thuê, kỳ..."
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      {loading && <p role="status" className="text-xs text-slate-500 py-2">Đang tải hóa đơn...</p>}

      <div className="bg-white border rounded-xl overflow-x-auto shadow-xs">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-600 font-semibold uppercase tracking-wider">
            <tr>
              {['Kỳ', 'Căn hộ', 'Người thuê', 'Hạn đóng', 'Tổng tiền', 'Trạng thái', 'Thao tác'].map(x => (
                <th key={x} className="p-4 text-left">{x}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map(i => {
              const isPaid = i.status === 'paid';
              return (
                <tr key={i.id} data-invoice-id={i.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-4 font-mono font-medium">{i.monthYear}</td>
                  <td className="p-4 font-bold text-slate-900">{i.roomNumber}</td>
                  <td className="p-4 font-medium text-slate-700">{i.tenantName}</td>
                  <td className="p-4 text-slate-600">{i.dueDate}</td>
                  <td className="p-4 font-bold text-slate-900">
                    {billingMoney(i.apiInvoice ? i.apiInvoice.totalAmount : String(i.totalAmount))}
                  </td>
                  <td className="p-4">
                    {isPaid ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Đã thanh toán
                      </span>
                    ) : i.apiInvoice?.status === 'SENT' ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                        Chờ thanh toán
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                        Bản nháp
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <button onClick={() => onOpenInvoiceModal(i)} className="text-emerald-700 mr-3 font-semibold hover:underline">
                      Chi tiết
                    </button>
                    {!isPaid && i.apiInvoice?.status === 'DRAFT' && (
                      <button disabled={!!sending} onClick={() => void send(i.id)} className="text-emerald-700 mr-3 font-semibold hover:underline">
                        {sending === i.id ? 'Đang gửi...' : 'Gửi người thuê'}
                      </button>
                    )}
                    {!isPaid && (i.apiInvoice?.status === 'SENT' || i.status === 'unpaid') && (
                      <button
                        onClick={() => handleConfirmPay(i)}
                        title="Xác nhận thanh toán và gán chỉ số mới thành chỉ số cũ"
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow-xs transition-colors"
                      >
                        Xác nhận thanh toán
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {!loading && !visible.length && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500">
                  Chưa có hóa đơn phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} onChange={onPageChange} />
    </div>
  );
}
