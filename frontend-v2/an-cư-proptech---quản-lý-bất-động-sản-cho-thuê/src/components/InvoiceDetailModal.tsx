import React from 'react';
import {
  X,
  Printer,
  Share2,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Copy,
  Send,
  Building2,
} from 'lucide-react';
import { Invoice, SystemConfig } from '../types';

interface InvoiceDetailModalProps {
  invoice: Invoice | null;
  config: SystemConfig;
  onClose: () => void;
  onMarkPaid: (invoiceId: string) => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoice,
  config,
  onClose,
  onMarkPaid,
}) => {
  if (!invoice) return null;

  // Real VietQR image API
  const transferContent = `PHONG ${invoice.roomNumber.replace('.', '')} T9`;
  const qrUrl = `https://img.vietqr.io/image/${config.bankName}-${config.bankAccount}-compact2.png?amount=${invoice.totalAmount}&addInfo=${encodeURIComponent(
    transferContent
  )}&accountName=${encodeURIComponent(config.accountHolder)}`;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`Đã sao chép ${label}: ${text}`);
  };

  const handleSendReminder = () => {
    alert(
      `Đã gửi tin nhắn nhắc nợ kèm mã VietQR tới số điện thoại khách thuê: ${invoice.tenantPhone} (${invoice.tenantName})!`
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold">Phiếu Thu Tiền Phòng & Dịch Vụ</h3>
              <p className="text-xs text-slate-400">
                Mã: {invoice.invoiceCode} • Kỳ thu: {invoice.monthYear}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => alert('Đã gửi lệnh in hóa đơn thanh toán!')}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1"
            >
              <Printer className="w-3.5 h-3.5" /> In
            </button>
            <button
              onClick={onClose}
              id="btn-close-invoice-modal"
              className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
          {/* Status banner */}
          <div
            className={`p-3 rounded-xl flex items-center justify-between ${
              invoice.status === 'paid'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : invoice.status === 'overdue'
                ? 'bg-rose-50 border border-rose-200 text-rose-800'
                : 'bg-amber-50 border border-amber-200 text-amber-800'
            }`}
          >
            <div className="flex items-center gap-2 font-semibold">
              {invoice.status === 'paid' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Hóa đơn đã được thanh toán đầy đủ ({invoice.paidAt || 'Đã ghi nhận'})</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>
                    {invoice.status === 'overdue' ? 'Đã quá hạn thanh toán' : 'Chưa thanh toán'} (Hạn: {invoice.dueDate})
                  </span>
                </>
              )}
            </div>

            {invoice.status !== 'paid' && (
              <button
                onClick={() => onMarkPaid(invoice.id)}
                id="btn-mark-paid"
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-xs"
              >
                Xác Nhận Đã Thu Tiền
              </button>
            )}
          </div>

          {/* Tenant & Room details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-400 font-medium">Phòng:</span>
              <div className="text-sm font-bold text-slate-900">{invoice.roomNumber}</div>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Khách thuê:</span>
              <div className="text-sm font-semibold text-slate-900">{invoice.tenantName}</div>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Số điện thoại:</span>
              <div className="text-sm font-semibold text-slate-900">{invoice.tenantPhone}</div>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Hạn thanh toán:</span>
              <div className="text-sm font-semibold text-slate-900">{invoice.dueDate}</div>
            </div>
          </div>

          {/* Service items table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-[11px] uppercase">
                <tr>
                  <th className="px-3.5 py-2.5">Hạng Mục</th>
                  <th className="px-3.5 py-2.5 text-center">Chỉ Số Cũ - Mới</th>
                  <th className="px-3.5 py-2.5 text-center">SL / Dùng</th>
                  <th className="px-3.5 py-2.5 text-right">Đơn Giá</th>
                  <th className="px-3.5 py-2.5 text-right">Thành Tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="px-3.5 py-2.5 font-medium text-slate-900">{item.name}</td>
                    <td className="px-3.5 py-2.5 text-center text-slate-500">
                      {item.oldIndex !== undefined && item.newIndex !== undefined
                        ? `${item.oldIndex} → ${item.newIndex}`
                        : '-'}
                    </td>
                    <td className="px-3.5 py-2.5 text-center font-semibold text-slate-800">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="px-3.5 py-2.5 text-right text-slate-600">
                      {item.unitPrice.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-bold text-slate-900">
                      {item.amount.toLocaleString('vi-VN')} đ
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200 font-bold">
                <tr>
                  <td colSpan={4} className="px-3.5 py-3 text-right text-slate-800 text-sm">
                    TỔNG CỘNG PHẢI THANH TOÁN:
                  </td>
                  <td className="px-3.5 py-3 text-right text-base text-emerald-700">
                    {invoice.totalAmount.toLocaleString('vi-VN')} đ
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* VietQR Payment Code Section matching Image 4 & 10 */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-xl border border-emerald-200 flex flex-col sm:flex-row items-center gap-5">
            <div className="bg-white p-2.5 rounded-xl border border-emerald-200 shadow-xs shrink-0 text-center">
              <img
                src={qrUrl}
                alt="VietQR Payment Code"
                className="w-36 h-36 object-contain rounded-lg mx-auto"
                referrerPolicy="no-referrer"
              />
              <span className="text-[10px] font-bold text-emerald-700 block mt-1">
                Quét QR bằng mọi App Ngân Hàng
              </span>
            </div>

            <div className="flex-1 space-y-2 text-xs w-full">
              <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-emerald-600" />
                <span>Thông Tin Chuyển Khoản Ngân Hàng (VietQR Tự Động)</span>
              </div>

              <div className="space-y-1.5 text-slate-700">
                <div className="flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-emerald-100">
                  <span>Ngân hàng: <strong>{config.bankName}</strong></span>
                </div>
                <div className="flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-emerald-100">
                  <span>Số tài khoản: <strong className="font-mono text-emerald-800">{config.bankAccount}</strong></span>
                  <button
                    onClick={() => handleCopy(config.bankAccount, 'Số tài khoản')}
                    className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1 text-[11px] font-semibold"
                  >
                    <Copy className="w-3 h-3" /> Sao chép
                  </button>
                </div>
                <div className="flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-emerald-100">
                  <span>Chủ tài khoản: <strong>{config.accountHolder}</strong></span>
                </div>
                <div className="flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-emerald-100">
                  <span>Nội dung CK: <strong className="text-slate-900 font-mono">{transferContent}</strong></span>
                  <button
                    onClick={() => handleCopy(transferContent, 'Nội dung')}
                    className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1 text-[11px] font-semibold"
                  >
                    <Copy className="w-3 h-3" /> Sao chép
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={handleSendReminder}
            id="btn-send-sms-reminder"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Gửi SMS / Zalo Nhắc Nợ Kèm QR</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
