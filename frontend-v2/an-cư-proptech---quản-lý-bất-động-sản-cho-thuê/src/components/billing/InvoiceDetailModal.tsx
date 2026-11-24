import {InvoicePaymentPanel} from '@/components/billing/InvoicePaymentPanel';
import { X } from 'lucide-react';
import type { Invoice } from '@/types';
import { InvoiceBreakdown } from '@/components/billing/InvoiceBreakdown';
import { useState } from 'react';
import { OwnerCashPayment } from './OwnerCashPayment';
export function InvoiceDetailModal({ invoice, onClose, onChanged }: { invoice: Invoice; onClose: () => void; onChanged?: () => void }) {
  const [paidAt, setPaidAt] = useState<string | null>(null);
  const current = invoice.apiInvoice && (paidAt ? { ...invoice.apiInvoice, paymentStatus: 'PAID' as const, paidAt } : invoice.apiInvoice);
  return <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"><section role="dialog" aria-label="Chi tiết hóa đơn" className="bg-white rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-auto"><div className="flex justify-end mb-3"><button id="btn-close-invoice-modal" onClick={onClose} aria-label="Đóng"><X /></button></div>
    {current && <><InvoiceBreakdown invoice={current} />{current.status==='SENT'&&<InvoicePaymentPanel key={invoice.id+(paidAt??'')} invoiceId={invoice.id}/>}
      <OwnerCashPayment invoice={current} onPaid={receipt => {setPaidAt(receipt.paidAt);onChanged?.();}} /></>}
  </section></div>;
}
