import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router';
import { ArrowUpRight, ChevronDown, MapPin, Maximize2 } from 'lucide-react';
import { getApartments } from '@/services/apartments/apartmentService';
import { ApartmentImage } from './ApartmentImage';
import { Pagination } from '@/components/common/Pagination';
import { formatRent } from '@/utils/format';
import type { ApartmentFilters,ApartmentSummary,PageResult,PropertyListingSummary } from '@/types/apartment';

export function PropertyListingCard({listing,filters}:{listing:PropertyListingSummary;filters:ApartmentFilters}) {
 const roomsId = useId();
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
 return <article className="app-panel listing-card" data-testid="property-listing-card">
  <div className="listing-cover">
   <ApartmentImage src={listing.thumbnail} alt={`Ảnh đại diện ${listing.name}`} className="size-full object-cover" illustrate/>
   <span className="listing-match">{listing.matchingRooms} căn/phòng phù hợp</span>
  </div>
  <div className="listing-body">
   <h3 className="text-lg font-bold break-words">{listing.name}</h3>
   <p className="listing-meta"><MapPin size={15} aria-hidden="true"/><span>{listing.address}</span></p>
   <p className="listing-meta"><Maximize2 size={15} aria-hidden="true"/><span>{area} m²</span></p>
   <div className="listing-footer">
    <p className="font-bold text-brand-950">{price}<span className="block text-xs font-normal text-slate-600">/ tháng</span></p>
    <button type="button" aria-expanded={open} aria-controls={open ? roomsId : undefined} onClick={()=>setOpen(v=>!v)} className="app-action-secondary text-xs">
      {open?'Thu gọn danh sách':'Chọn căn/phòng'}<ChevronDown size={15} aria-hidden="true" className={open ? 'rotate-180' : ''}/>
    </button>
   </div>
   {open&&<section id={roomsId} aria-label={`Phòng phù hợp tại ${listing.name}`} className="space-y-2 border-t border-slate-100 pt-3">
    {loading&&<p role="status">Đang tải phòng phù hợp...</p>}
    {error&&<p role="alert">{error}<button className="ml-2 underline" onClick={()=>setRevision(v=>v+1)}>Thử lại</button></p>}
    {rooms?.items.map(room=><Link key={room.id} to={`/apartments/${room.id}`} className="listing-room">
     <ApartmentImage src={room.thumbnail} alt={room.title} className="w-16 h-16 object-cover rounded shrink-0"/>
     <span className="min-w-0 break-words"><strong className="block text-sm">{room.title}</strong><span className="text-xs">{room.areaM2} m² · {formatRent(room.advertisedMonthlyRent)}/tháng</span>{room.maxOccupants!=null&&<span className="block text-xs">Tối đa {room.maxOccupants} người</span>}<span className="block text-xs text-brand-800">Xem phòng này →</span></span>
     <ArrowUpRight className="ml-auto shrink-0 text-brand-700" size={16} aria-hidden="true"/>
    </Link>)}
    {rooms&&!rooms.items.length&&<p>Hiện chưa còn phòng phù hợp. Hãy tải lại kết quả tìm kiếm.</p>}
    {rooms&&<Pagination page={rooms.page} totalPages={rooms.totalPages} onChange={setPage}/>}
   </section>}
  </div>
 </article>;
}
