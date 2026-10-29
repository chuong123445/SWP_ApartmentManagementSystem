import { useState } from 'react';
import { createMaintenance } from '@/services/maintenance/maintenanceService';
export interface MaintenancePlace { value:string; label:string; apartmentId?:string; propertyId?:string }
export function MaintenanceForm({owner,places,onSaved,onClose}:{owner:boolean;places:MaintenancePlace[];onSaved:()=>void;onClose:()=>void}) {
 const [place,setPlace]=useState(places[0]?.value??'');const [title,setTitle]=useState('');const [description,setDescription]=useState('');
 const [category,setCategory]=useState('OTHER');const [priority,setPriority]=useState('NORMAL');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 return <form aria-label="Báo sự cố mới" className="bg-white border rounded-xl p-5 space-y-4" onSubmit={async e=>{e.preventDefault();if(busy)return;const target=places.find(p=>p.value===place);if(!target)return;setBusy(true);setError('');try{await createMaintenance(owner,{propertyId:target.propertyId,apartmentId:target.apartmentId,title,description,category,priority});onSaved();onClose();}catch(err){setError(err instanceof Error?err.message:'Không thể gửi sự cố.');}finally{setBusy(false);}}}>
 <h2 className="font-bold">Báo sự cố mới</h2><fieldset disabled={busy} className="space-y-4">
 <label className="block text-sm">Vị trí<select required value={place} onChange={e=>setPlace(e.target.value)} className="block border rounded-lg p-3 w-full mt-1">{places.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}</select></label>
 <label className="block text-sm">Tiêu đề<input required maxLength={200} value={title} onChange={e=>setTitle(e.target.value)} className="block border rounded-lg p-3 w-full mt-1"/></label>
 <label className="block text-sm">Mô tả<textarea required maxLength={3000} rows={4} value={description} onChange={e=>setDescription(e.target.value)} className="block border rounded-lg p-3 w-full mt-1"/></label>
 <label className="block text-sm">Loại sự cố<select value={category} onChange={e=>setCategory(e.target.value)} className="block border p-2 rounded-lg">{[['ELECTRIC','Điện'],['WATER','Nước'],['AIRCON','Máy lạnh'],['FURNITURE','Nội thất'],['OTHER','Khác']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
 <label className="block text-sm">Mức độ<select value={priority} onChange={e=>setPriority(e.target.value)} className="block border p-2 rounded-lg">{[['NORMAL','Bình thường'],['HIGH','Ưu tiên cao'],['URGENT','Khẩn cấp']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
 </fieldset>{error&&<p role="alert" className="text-rose-700">{error}</p>}<div className="flex gap-3"><button disabled={busy||!places.length} className="bg-emerald-700 text-white px-4 py-2 rounded-lg">{busy?'Đang gửi...':'Gửi sự cố'}</button><button type="button" disabled={busy} onClick={onClose} className="border px-4 py-2 rounded-lg">Hủy</button></div>
 </form>;
}
