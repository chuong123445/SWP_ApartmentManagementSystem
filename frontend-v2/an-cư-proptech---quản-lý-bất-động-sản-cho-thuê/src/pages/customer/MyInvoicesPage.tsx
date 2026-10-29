import { Link } from 'react-router';
import { CustomerLayout } from '@/layouts/CustomerLayout';
import { useTenantInvoices } from '@/hooks/useTenantInvoices';
import { billingMoney } from '@/services/billing/billingService';
import { Pagination } from '@/components/common/Pagination';
export function MyInvoicesPage() {
  const { data, error, loading, page, setPage, reload } = useTenantInvoices();
  return <CustomerLayout><main className="max-w-7xl mx-auto p-5 py-8"><div className="flex justify-between mb-6"><h1 className="text-2xl font-bold">Hóa đơn của tôi</h1><button onClick={reload} className="text-emerald-700">Làm mới</button></div>
    <Link to="/my/test-payments" className="inline-block mb-5 border rounded-lg px-4 py-3 text-emerald-800">Phiếu thanh toán thử</Link>
    {error && <p role="alert" className="p-4 bg-rose-50 text-rose-700 rounded-xl">{error}</p>}
    {loading && <p role="status">Đang tải hóa đơn...</p>}
    {!loading && !error && data && <><div className="grid md:grid-cols-2 gap-4">{data.items.map(i => <Link to={`/my/invoices/${i.id}`} key={i.id} className="bg-white border rounded-xl p-5"><h2 className="font-bold">{i.roomNumber} · Kỳ {i.period}</h2><p className="text-slate-500 text-sm">{i.apartmentTitle}</p><p className="text-emerald-700 text-xl font-semibold mt-3">{billingMoney(i.totalAmount)}</p><p className="text-sm mt-2">Hạn đóng: {i.dueDate}</p><p className="text-sm my-2">{i.paymentStatus==='PAID'?'Đã thanh toán':'Chưa thanh toán'}</p><span className="text-emerald-700 text-sm">Xem chi tiết →</span></Link>)}</div>
      {!data.items.length && <p className="text-slate-500 py-8">Chưa có hóa đơn được gửi đến tài khoản của bạn.</p>}<Pagination page={page} totalPages={data.totalPages} onChange={setPage} /></>}
  </main></CustomerLayout>;
}
