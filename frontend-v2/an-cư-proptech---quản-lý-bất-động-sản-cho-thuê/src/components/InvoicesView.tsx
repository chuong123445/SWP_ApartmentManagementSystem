import React, { useState } from 'react';
import {
  ReceiptText,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  QrCode,
  Send,
  Eye,
  ShieldCheck,
} from 'lucide-react';
import { Invoice } from '../types';

interface InvoicesViewProps {
  invoices: Invoice[];
  onOpenInvoiceModal: (invoice: Invoice) => void;
  onOpenCreateInvoiceModal: () => void;
  onMarkPaid: (invoiceId: string) => void;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  invoices,
  onOpenInvoiceModal,
  onOpenCreateInvoiceModal,
  onMarkPaid,
}) => {
  const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid' | 'overdue'>('all');
  const [search, setSearch] = useState('');

  const filteredInvoices = invoices.filter((inv) => {
    if (filter !== 'all' && inv.status !== filter) return false;
    if (
      search &&
      !inv.roomNumber.toLowerCase().includes(search.toLowerCase()) &&
      !inv.tenantName.toLowerCase().includes(search.toLowerCase()) &&
      !inv.invoiceCode.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const totalAmount = invoices.reduce((s, i) => s + i.totalAmount, 0);
  const paidAmount = invoices.reduce((s, i) => s + i.paidAmount, 0);
  const unpaidAmount = totalAmount - paidAmount;

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Chuẩn VietQR Napas247 - Tự Động Gạch Nợ Tức Thì
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span>Hóa Đơn Tiền Phòng & Thu Tự Động</span>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-0.5 rounded-full">
              Kỳ Tháng 09/2026
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tổng hợp tiền phòng, chỉ số điện EVN, nước Sawaco, phí dịch vụ và mã VietQR có sẵn cú pháp gạch nợ.
          </p>
        </div>

        <button
          onClick={onOpenCreateInvoiceModal}
          id="btn-create-invoice-page"
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Lập Hóa Đơn Mới</span>
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Tổng Tiền Hóa Đơn Kỳ Này</span>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {totalAmount.toLocaleString('vi-VN')} đ
          </div>
          <span className="text-xs text-slate-400 mt-1 block">{invoices.length} phòng phát hành</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <span className="text-xs font-semibold text-emerald-700">Đã Thu Thành Công (Qua VietQR)</span>
          <div className="text-xl font-bold text-emerald-700 mt-1">
            {paidAmount.toLocaleString('vi-VN')} đ
          </div>
          <span className="text-xs text-emerald-600 mt-1 block">
            {invoices.filter((i) => i.status === 'paid').length} hóa đơn đã gạch nợ
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-xs">
          <span className="text-xs font-semibold text-rose-700">Công Nợ Cần Đôn Đốc</span>
          <div className="text-xl font-bold text-rose-700 mt-1">
            {unpaidAmount.toLocaleString('vi-VN')} đ
          </div>
          <span className="text-xs text-rose-600 mt-1 block">
            {invoices.filter((i) => i.status !== 'paid').length} phòng chưa thanh toán
          </span>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'paid', label: 'Đã thanh toán' },
            { id: 'unpaid', label: 'Chưa đóng' },
            { id: 'overdue', label: 'Quá hạn' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === t.id
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm phòng, tên khách, mã hóa đơn..."
            className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Mã Hóa Đơn / Kỳ</th>
                <th className="px-4 py-3">Căn Hộ</th>
                <th className="px-4 py-3">Khách Thuê</th>
                <th className="px-4 py-3">Hạn Đóng</th>
                <th className="px-4 py-3 text-right">Tổng Tiền</th>
                <th className="px-4 py-3 text-center">Trạng Thái</th>
                <th className="px-4 py-3 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    <div className="font-mono">{inv.invoiceCode}</div>
                    <span className="text-[10px] text-slate-400">Kỳ: {inv.monthYear}</span>
                  </td>
                  <td className="px-4 py-3 font-bold text-emerald-700">
                    <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200">
                      {inv.roomNumber}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-800">{inv.tenantName}</div>
                    <span className="text-[11px] text-slate-400">{inv.tenantPhone}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{inv.dueDate}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900 text-sm">
                    {inv.totalAmount.toLocaleString('vi-VN')} đ
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        inv.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : inv.status === 'overdue'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {inv.status === 'paid' ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" /> Đã thu
                        </>
                      ) : inv.status === 'overdue' ? (
                        <>
                          <AlertCircle className="w-3 h-3" /> Quá hạn
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3" /> Chưa đóng
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-1.5">
                    <button
                      onClick={() => onOpenInvoiceModal(inv)}
                      id={`btn-view-invoice-${inv.roomNumber.toLowerCase().replace('.', '')}`}
                      className="px-2.5 py-1 text-slate-700 hover:text-emerald-700 font-semibold rounded text-xs bg-slate-100 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 transition-colors inline-flex items-center gap-1"
                    >
                      <QrCode className="w-3 h-3 text-emerald-600" />
                      <span>Xem VietQR</span>
                    </button>

                    {inv.status !== 'paid' && (
                      <button
                        onClick={() => onMarkPaid(inv.id)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-xs shadow-xs transition-colors"
                      >
                        Gạch Nợ
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
