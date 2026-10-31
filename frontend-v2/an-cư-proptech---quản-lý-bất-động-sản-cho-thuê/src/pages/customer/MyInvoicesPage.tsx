import {useState} from 'react';
import {useReceivedTestPayments} from '@/hooks/useReceivedTestPayments';
import { Link } from 'react-router';
import { CustomerLayout } from '@/layouts/CustomerLayout';
import { useTenantInvoices } from '@/hooks/useTenantInvoices';
import { billingMoney } from '@/services/billing/billingService';
import { Pagination } from '@/components/common/Pagination';
export function MyInvoicesPage() {
  const { data, error, loading, page, setPage, reload } = useTenantInvoices();
  const [testRevision,setTestRevision]=useState(0);
  const extra=useReceivedTestPayments(testRevision);
  const refresh=()=>{reload();setTestRevision(v=>v+1);};
  return <CustomerLayout><main className="max-w-7xl mx-auto p-5 py-8"><div className="flex justify-between mb-6"><h1 className="text-2xl font-bold">Hóa đơn của tôi</h1><button onClick={refresh} className="text-emerald-700">Làm mới</button></div>
    {extra.error&&<p role="alert" className="p-4 bg-rose-50 text-rose-700 rounded-xl">{extra.error} Bấm Làm mới để thử lại.</p>}
    {extra.loading&&<p role="status">Đang tải hóa đơn bổ sung...</p>}
    <div className="grid md:grid-cols-2 gap-4 mb-4">{extra.items.map(i=><Link to={`/my/invoices/additional/${i.id}`} key={`additional-${i.id}`} className="bg-white border rounded-xl p-5"><h2 className="font-bold">{i.roomNumber} · Hóa đơn #{i.id}</h2><p className="text-slate-500 text-sm">Chủ nhà: {i.ownerName}</p><p className="text-emerald-700 text-xl font-semibold mt-3">{billingMoney(i.payment.amount??'0')}</p><p className="text-sm mt-2">Ngày gửi: {new Date(i.createdAt).toLocaleDateString('vi-VN')}</p><p className="text-sm my-2">{i.payment.status==='PAID'?'Đã thanh toán':'Chưa thanh toán'}</p><span className="text-emerald-700 text-sm">Xem chi tiết →</span></Link>)}</div>
    {error && <p role="alert" className="p-4 bg-rose-50 text-rose-700 rounded-xl">{error}</p>}
    {loading && <p role="status">Đang tải hóa đơn...</p>}
    {!loading && !error && data && <><div className="grid md:grid-cols-2 gap-4">{data.items.map(i => <Link to={`/my/invoices/${i.id}`} key={i.id} className="bg-white border rounded-xl p-5"><h2 className="font-bold">{i.roomNumber} · Kỳ {i.period}</h2><p className="text-slate-500 text-sm">{i.apartmentTitle}</p><p className="text-emerald-700 text-xl font-semibold mt-3">{billingMoney(i.totalAmount)}</p><p className="text-sm mt-2">Hạn đóng: {i.dueDate}</p><p className="text-sm my-2">{i.paymentStatus==='PAID'?'Đã thanh toán':'Chưa thanh toán'}</p><span className="text-emerald-700 text-sm">Xem chi tiết →</span></Link>)}</div>
      {!data.items.length && !extra.loading && !extra.error && !extra.items.length && <p className="text-slate-500 py-8">Chưa có hóa đơn được gửi đến tài khoản của bạn.</p>}<Pagination page={page} totalPages={data.totalPages} onChange={setPage} /></>}
  </main></CustomerLayout>;
}
