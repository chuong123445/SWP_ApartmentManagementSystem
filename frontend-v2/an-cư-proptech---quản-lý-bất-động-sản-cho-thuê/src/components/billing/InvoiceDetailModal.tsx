import { X, CheckCircle2 } from 'lucide-react';
import type { Invoice } from '@/types';
import { InvoiceBreakdown } from '@/components/billing/InvoiceBreakdown';

export function InvoiceDetailModal({
  invoice,
  onClose,
  onMarkPaid,
}: {
  invoice: Invoice;
  onClose: () => void;
  onMarkPaid?: (id: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
      <section role="dialog" aria-label="Chi tiết hóa đơn" className="bg-white rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-auto shadow-2xl space-y-4">
        <div className="flex justify-between items-center pb-2 border-b">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-lg text-slate-900">Chi Tiết Hóa Đơn {invoice.roomNumber}</h2>
            {invoice.status === 'paid' ? (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Đã thanh toán
              </span>
            ) : (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                Chờ thanh toán
              </span>
            )}
          </div>
          <button id="btn-close-invoice-modal" onClick={onClose} aria-label="Đóng" className="p-1 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {invoice.apiInvoice && <InvoiceBreakdown invoice={invoice.apiInvoice} />}

        <div className="flex justify-end gap-3 pt-3 border-t">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50">
            Đóng
          </button>
          {invoice.status !== 'paid' && onMarkPaid && (
            <button
              onClick={() => {
                onMarkPaid(invoice.id);
                onClose();
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Xác nhận đã thanh toán (Gán chỉ số mới → cũ)</span>
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
