import { Link } from 'react-router';
import type { RentalRequest } from '@/types/rental';
import { formatRent, formatRequestDate, requestStatusLabel } from '@/utils/format';

export function RequestList({ items, owner = false }: { items: RentalRequest[]; owner?: boolean }) {
  return <div className="space-y-4">{items.map(request => <article key={request.id} data-testid="rental-request" className="bg-white border border-slate-200 rounded-xl p-5">
    <div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-bold text-slate-900"><Link to={`/apartments/${request.apartmentId}`} className="hover:text-emerald-700">{request.apartmentTitle}</Link></h2><p className="text-xs text-slate-500 mt-1">{request.address}</p></div><span className="text-xs font-semibold bg-amber-50 text-amber-800 rounded-full px-3 py-1 self-start">{requestStatusLabel[request.status]}</span></div>
    <div className="flex flex-wrap gap-4 text-xs text-slate-500 mt-3"><span>{formatRent(request.advertisedMonthlyRent)} / tháng</span><span>Gửi lúc {formatRequestDate(request.createdAt)}</span></div>
    {owner && <div className="mt-4 text-sm"><span className="font-semibold">{request.customerName}</span><span className="text-slate-500 ml-3">{request.customerEmail}</span></div>}
    <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">{request.message || 'Không có lời nhắn.'}</p>
  </article>)}</div>;
}
