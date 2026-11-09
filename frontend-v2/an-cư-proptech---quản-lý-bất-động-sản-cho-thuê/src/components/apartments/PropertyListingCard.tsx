import { useEffect,useState } from 'react';
import { Link } from 'react-router';
import { getApartments } from '@/services/apartments/apartmentService';
import { ApartmentImage } from './ApartmentImage';
import { Pagination } from '@/components/common/Pagination';
import { formatRent } from '@/utils/format';
import type { ApartmentFilters,ApartmentSummary,PageResult,PropertyListingSummary } from '@/types/apartment';

export function PropertyListingCard({listing,filters}:{listing:PropertyListingSummary;filters:ApartmentFilters}) {
 const [open,setOpen]=useState(false);
 const [page,setPage]=useState(0);
 const [rooms,setRooms]=useState<PageResult<ApartmentSummary>|null>(null);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const [revision,setRevision]=useState(0);
 useEffect(()=>{
  if(!open)return;
  const abort=new AbortController();setLoading(true);setError('');setRooms(null);
  getApartments({...filters,propertyId:listing.propertyId,page,size:3},abort.signal)
   .then(data=>{if(!abort.signal.aborted)setRooms(data);})
   .catch(e=>{if(!abort.signal.aborted)setError(e.message);})
   .finally(()=>{if(!abort.signal.aborted)setLoading(false);});
  return()=>abort.abort();
 },[open,page,filters,listing.propertyId,revision]);
 const price=listing.minRent===listing.maxRent?formatRent(listing.minRent):`${formatRent(listing.minRent)} – ${formatRent(listing.maxRent)}`;
 const area=listing.minArea===listing.maxArea?listing.minArea:`${listing.minArea}–${listing.maxArea}`;
 return <article className="bg-white border border-slate-200 rounded-2xl overflow-hidden" data-testid="property-listing-card">
  <ApartmentImage src={listing.thumbnail} alt={`Ảnh chung ${listing.name}`} className="w-full h-48 object-cover"/>
  <div className="p-5 space-y-3">
   <h3 className="text-lg font-bold break-words">{listing.name}</h3>
   <p className="text-sm text-slate-600 break-words">{listing.address}</p>
   <p className="text-sm">{listing.matchingRooms} căn/phòng phù hợp · {area} m²</p>
   <p className="font-bold text-emerald-800">{price}<span className="block text-xs font-normal">/ tháng</span></p>
   <button type="button" aria-expanded={open} onClick={()=>setOpen(v=>!v)} className="text-emerald-800 font-semibold underline">{open?'Thu gọn danh sách':'Chọn căn/phòng'}</button>
   {open&&<section aria-label={`Phòng phù hợp tại ${listing.name}`} className="space-y-3 border-t pt-3">
    {loading&&<p role="status">Đang tải phòng phù hợp...</p>}
    {error&&<p role="alert">{error}<button className="ml-2 underline" onClick={()=>setRevision(v=>v+1)}>Thử lại</button></p>}
    {rooms?.items.map(room=><Link key={room.id} to={`/apartments/${room.id}`} className="flex items-start gap-3 border rounded-lg p-3">
     <ApartmentImage src={room.thumbnail} alt={room.title} className="w-16 h-16 object-cover rounded shrink-0"/>
     <span className="min-w-0 break-words"><strong className="block text-sm">{room.title}</strong><span className="text-xs">{room.areaM2} m² · {formatRent(room.advertisedMonthlyRent)}/tháng</span><span className="block text-xs text-emerald-800">Xem phòng này →</span></span>
    </Link>)}
    {rooms&&!rooms.items.length&&<p>Hiện chưa còn phòng phù hợp. Hãy tải lại kết quả tìm kiếm.</p>}
    {rooms&&<Pagination page={rooms.page} totalPages={rooms.totalPages} onChange={setPage}/>}
   </section>}
  </div>
 </article>;
}
