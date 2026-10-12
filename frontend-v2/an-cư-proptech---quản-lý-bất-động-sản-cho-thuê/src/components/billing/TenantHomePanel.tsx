import { Link } from 'react-router';
import { ReceiptText } from 'lucide-react';
import { useTenancyContext } from '@/contexts/TenancyContext';
import { useTenantInvoices } from '@/hooks/useTenantInvoices';
import { billingMoney } from '@/services/billing/billingService';
export function TenantHomePanel() {
  const { tenancies } = useTenancyContext();
  const active = tenancies.filter(c => c.status === 'ACTIVE');
  const { data, error, loading, reload } = useTenantInvoices(active.length > 0);
  if (!active.length) return null;
  return <section className="bg-white rounded-xl border border-emerald-200 p-5 mb-6" aria-label="Hóa đơn người thuê">
    <div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-bold flex gap-2 items-center"><ReceiptText className="w-5 h-5 text-emerald-600" />Căn hộ đang thuê & hóa đơn</h2>
      <p className="text-sm text-slate-500 mt-1">{active.map(c => `${c.roomNumber} — ${c.propertyName}`).join(', ')}</p></div>
      <div className="flex gap-4 text-sm"><button onClick={reload} className="text-slate-600">Làm mới hóa đơn</button><Link to="/my/invoices" className="font-semibold text-emerald-700">Xem tất cả hóa đơn →</Link></div></div>
    {error && <p role="alert" className="text-rose-700 mt-3">{error}</p>}
    {loading && !data && <p role="status" className="text-sm mt-3">Đang tải hóa đơn...</p>}
    {data && <div className="grid md:grid-cols-3 gap-3 mt-4">{data.items.slice(0, 3).map(i => <Link key={i.id} to={`/my/invoices/${i.id}`} className="p-3 rounded-lg bg-emerald-50 border border-emerald-100"><p className="font-semibold">{i.roomNumber} · {i.period}</p><p className="text-lg text-emerald-700">{billingMoney(i.totalAmount)}</p><p className="text-xs text-slate-500">Hạn đóng {i.dueDate}</p></Link>)}</div>}
    {data?.totalElements === 0 && <p className="text-sm text-slate-500 mt-3">Chưa có hóa đơn được Owner gửi.</p>}
  </section>;
}
