import { Link } from 'react-router';
import { ReceiptText } from 'lucide-react';
import { useTenantInvoices } from '@/hooks/useTenantInvoices';
import { useReceivedTestPayments } from '@/hooks/useReceivedTestPayments';
import { useAuth } from '@/hooks/useAuth';
export function TenantHomePanel() {
  const { user } = useAuth();
  const eligible = user?.accountStatus === 'ACTIVE' && user.contactVerificationStatus === 'VERIFIED' && user.roles.some(role => role === 'CUSTOMER' || role === 'OWNER');
  return eligible ? <UnpaidInvoiceNotice key={user.id} /> : null;
}
function UnpaidInvoiceNotice() {
  const { data, error, loading } = useTenantInvoices(true, 'UNPAID');
  const extra = useReceivedTestPayments(0, 'UNPAID');
  if (loading || extra.loading || error || extra.error || !data) return null;
  const invoices = data.items.filter(i => i.status === 'SENT' && i.paymentStatus === 'UNPAID');
  const receipts = extra.items.filter(i => i.payment.status !== 'PAID');
  if (!invoices.length && !receipts.length) return null;
  const count = Math.max(data.totalElements, invoices.length) + receipts.length;
  const destination = count === 1 ? invoices.length === 1 ? `/my/invoices/${encodeURIComponent(invoices[0].id)}` : `/my/invoices/additional/${encodeURIComponent(receipts[0].id)}` : '/my/invoices';
  return <section className="bg-white rounded-xl border border-amber-200 p-5 mb-6 flex flex-wrap justify-between items-center gap-4" aria-label="Hóa đơn chưa thanh toán">
    <div><h2 className="font-bold flex gap-2 items-center"><ReceiptText className="w-5 h-5 text-amber-600 shrink-0" />Bạn có hóa đơn chưa thanh toán</h2>
      <p className="text-sm text-slate-600 mt-1">{count > 1 ? 'Chọn hóa đơn để kiểm tra và thanh toán.' : 'Kiểm tra thông tin hóa đơn và thanh toán khi sẵn sàng.'}</p></div>
    <Link to={destination} className="rounded-lg bg-emerald-700 px-5 py-3 text-sm font-semibold text-white whitespace-nowrap">Thanh toán ngay</Link>
  </section>;
}
