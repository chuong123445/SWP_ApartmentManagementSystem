import { X } from 'lucide-react';
import type { Invoice } from '@/types';
import { InvoiceBreakdown } from '@/components/billing/InvoiceBreakdown';
export function InvoiceDetailModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"><section role="dialog" aria-label="Chi tiết hóa đơn" className="bg-white rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-auto"><div className="flex justify-end mb-3"><button id="btn-close-invoice-modal" onClick={onClose} aria-label="Đóng"><X /></button></div>
    {invoice.apiInvoice && <InvoiceBreakdown invoice={invoice.apiInvoice} />}
  </section></div>;
}
