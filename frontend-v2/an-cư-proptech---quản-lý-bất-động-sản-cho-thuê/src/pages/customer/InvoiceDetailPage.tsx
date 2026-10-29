import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { CustomerLayout } from '@/layouts/CustomerLayout';
import { InvoiceBreakdown } from '@/components/billing/InvoiceBreakdown';
import { getInvoice } from '@/services/billing/billingService';
import type { BillingInvoice } from '@/types/billing';
import { InvoicePaymentInfo } from '@/components/billing/InvoicePaymentInfo';
import '@/styles/operations.css';
export function InvoiceDetailPage() {
  const { id } = useParams(); const [invoice, setInvoice] = useState<BillingInvoice | null>(null);const [error, setError] = useState('');
  const [params]=useSearchParams();const fromHome=params.get('from')==='home';
  useEffect(() => { let active = true;setInvoice(null);setError('');getInvoice(id!).then(i => { if (active) setInvoice(i); }).catch(e => { if (active) setError(e.message); });return () => { active = false; }; }, [id]);
  return <CustomerLayout><main className="operations-page max-w-4xl mx-auto p-5 py-8"><Link to={fromHome?invoice?`/my/home?room=${encodeURIComponent(invoice.apartmentId)}&tab=invoices`:'/my/home':'/my/invoices'} className="text-emerald-700 text-sm">← {fromHome?'Hóa đơn của phòng':'Hóa đơn của tôi'}</Link>
    <h1 className="text-2xl font-bold my-5">Chi tiết hóa đơn</h1>{error ? <p role="alert" className="op-error">{error}</p> : invoice ? <div className="space-y-5"><section className="op-panel p-4 sm:p-6 overflow-x-auto"><InvoiceBreakdown invoice={invoice} /></section><InvoicePaymentInfo invoice={invoice}/></div> : <p role="status">Đang tải hóa đơn...</p>}
  </main></CustomerLayout>;
}
