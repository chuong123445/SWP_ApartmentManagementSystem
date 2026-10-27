import { Link } from 'react-router';
import { rightLabels } from '@/types/dossier';
import { MapPin, BedDouble, Bath, ArrowRight } from 'lucide-react';
import type { ApartmentSummary } from '@/types/apartment';
import { availabilityLabel, formatRent } from '@/utils/format';

export function ApartmentCard({ apartment: a }: { apartment: ApartmentSummary }) {
  return <article data-testid="apartment-card" className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-shadow">
    <Link to={`/apartments/${a.id}`} aria-label={`Xem căn hộ ${a.title}`}><img src={a.thumbnail} alt={a.title} className="w-full h-48 object-cover bg-emerald-50" /></Link>
    <div className="p-5 space-y-3">
      <div className="flex justify-between items-center gap-2"><span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">{availabilityLabel[a.availability]}</span><span className="text-xs text-slate-500">{a.areaM2} m²</span></div>
      <h2 className="font-bold text-lg text-slate-900"><Link to={`/apartments/${a.id}`} className="hover:text-emerald-700">{a.title}</Link></h2>
      {a.lessorRelationship&&a.lessorRelationship!=='UNSPECIFIED'&&<p className="text-xs text-emerald-800">{rightLabels[a.lessorRelationship]}</p>}
      <p className="flex gap-1.5 text-xs text-slate-500"><MapPin className="w-3.5 h-3.5 shrink-0" />{a.address}</p>
      <div className="flex gap-4 text-xs text-slate-500"><span className="flex gap-1 items-center"><BedDouble className="w-4 h-4" />{a.bedrooms === 0 ? 'Studio' : `${a.bedrooms} phòng ngủ`}</span><span className="flex gap-1 items-center"><Bath className="w-4 h-4" />{a.bathrooms} phòng tắm</span></div>
      <div className="pt-3 border-t border-slate-100 flex justify-between items-center"><p className="text-lg font-bold text-emerald-700">{formatRent(a.advertisedMonthlyRent)}<span className="block text-xs font-normal text-slate-400">/ tháng</span></p><Link to={`/apartments/${a.id}`} className="flex items-center gap-1 text-sm font-semibold text-emerald-700">Chi tiết<ArrowRight className="w-4 h-4" /></Link></div>
    </div>
  </article>;
}
