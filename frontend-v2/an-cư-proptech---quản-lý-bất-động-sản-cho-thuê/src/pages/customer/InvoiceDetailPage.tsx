import {paymentApi,type TestReceipt} from '@/services/payment/sepayService';
import {billingMoney} from '@/services/billing/billingService';
import {InvoicePaymentPanel} from '@/components/billing/InvoicePaymentPanel';
import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { CustomerLayout } from '@/layouts/CustomerLayout';
import { InvoiceBreakdown } from '@/components/billing/InvoiceBreakdown';
import { getInvoice } from '@/services/billing/billingService';
import type { BillingInvoice } from '@/types/billing';
export function InvoiceDetailPage({additional=false}:{additional?:boolean}) {
  const [params]=useSearchParams();const fromHome=params.get('from')==='home';
  const { id } = useParams(); const [extra,setExtra]=useState<TestReceipt|null>(null); const [invoice, setInvoice] = useState<BillingInvoice | null>(null);const [error, setError] = useState('');
  useEffect(() => {const c=new AbortController();setInvoice(null);setExtra(null);setError('');
    const request=additional?paymentApi<TestReceipt>(`/me/payments/sepay/test-payments/${id}`,'GET',undefined,c.signal).then(value=>{if(!c.signal.aborted)setExtra(value);}):getInvoice(id!).then(value=>{if(!c.signal.aborted)setInvoice(value);});
    request.catch(e=>{if(!c.signal.aborted)setError(e.message);});return()=>c.abort();
  },[id,additional]);
  return <CustomerLayout><main className="max-w-4xl mx-auto p-5 py-8"><Link to={fromHome?invoice?`/my/home?room=${encodeURIComponent(invoice.apartmentId)}&tab=invoices`:'/my/home':'/my/invoices'} className="text-emerald-700 text-sm">← Hóa đơn của tôi</Link>
    <h1 className="text-2xl font-bold my-5">Chi tiết hóa đơn</h1>{error ? <p role="alert" className="text-rose-700">{error}</p> : invoice ? <section className="bg-white border rounded-xl p-6"><InvoiceBreakdown invoice={invoice} />{invoice.status==='SENT'&&<InvoicePaymentPanel key={invoice.id} invoiceId={invoice.id}/>}</section> : extra ? <section className="bg-white border rounded-xl p-6 space-y-3"><h2 className="text-xl font-bold">Hóa đơn căn hộ {extra.roomNumber}</h2><p>Hóa đơn #{extra.id} · Hợp đồng #{extra.contractId}</p><p>Chủ nhà: {extra.ownerName}</p><p>Người thuê: {extra.tenantName}</p><p>Ngày gửi: {new Date(extra.createdAt).toLocaleString('vi-VN')}</p><p className="text-xl font-bold text-emerald-700">Tổng thanh toán: {billingMoney(extra.payment.amount??'0')}</p><InvoicePaymentPanel key={extra.id} invoiceId={extra.id} additional /></section> : <p role="status">Đang tải hóa đơn...</p>}
  </main></CustomerLayout>;
}
