import {InvoicePaymentPanel} from '@/components/billing/InvoicePaymentPanel';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { CustomerLayout } from '@/layouts/CustomerLayout';
import { InvoiceBreakdown } from '@/components/billing/InvoiceBreakdown';
import { getInvoice } from '@/services/billing/billingService';
import type { BillingInvoice } from '@/types/billing';
export function InvoiceDetailPage() {
  const { id } = useParams(); const [invoice, setInvoice] = useState<BillingInvoice | null>(null);const [error, setError] = useState('');
  useEffect(() => { let active = true;setInvoice(null);setError('');getInvoice(id!).then(i => { if (active) setInvoice(i); }).catch(e => { if (active) setError(e.message); });return () => { active = false; }; }, [id]);
  return <CustomerLayout><main className="max-w-4xl mx-auto p-5 py-8"><Link to="/my/invoices" className="text-emerald-700 text-sm">← Hóa đơn của tôi</Link>
    <h1 className="text-2xl font-bold my-5">Chi tiết hóa đơn</h1>{error ? <p role="alert" className="text-rose-700">{error}</p> : invoice ? <section className="bg-white border rounded-xl p-6"><InvoiceBreakdown invoice={invoice} />{invoice.status==='SENT'&&<InvoicePaymentPanel key={invoice.id} invoiceId={invoice.id}/>}</section> : <p role="status">Đang tải hóa đơn...</p>}
  </main></CustomerLayout>;
}
