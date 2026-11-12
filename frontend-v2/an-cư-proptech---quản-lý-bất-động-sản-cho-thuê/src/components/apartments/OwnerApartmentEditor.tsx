import {useId, useState, type ReactNode} from 'react';
import {Pencil, Images} from 'lucide-react';
import {ApartmentImage} from '@/components/apartments/ApartmentImage';
import {PropertyImagesField} from '@/components/property/PropertyImagesField';
import {uploadPropertyImages} from '@/services/property/propertyImageService';
import {saveAssetCommand} from '@/services/property/assetManagementService';
import type {ApartmentDetail} from '@/types/apartment';
const input='w-full min-w-0 border border-slate-300 rounded-lg px-3 py-2 mt-1 bg-white';
const button='border rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50';
type Field = 'title'|'description'|'maxOccupants'|'amenities'|'monthlyRent'|'electricityUnitPrice'|'waterUnitPrice';
const labels:Record<Field,string>={title:'tiêu đề',description:'mô tả',maxOccupants:'số người tối đa',amenities:'tiện ích',monthlyRent:'giá thuê',electricityUnitPrice:'giá điện',waterUnitPrice:'giá nước'};
const inputLabels:Record<Field,string>={title:'Tiêu đề căn hộ',description:'Mô tả căn hộ',maxOccupants:'Số người tối đa',amenities:'Tiện ích (ngăn cách bằng dấu phẩy)',monthlyRent:'Giá thuê mỗi tháng (đ)',electricityUnitPrice:'Đơn giá điện (đ/kWh)',waterUnitPrice:'Đơn giá nước (đ/m³)'};
function fieldValue(a:ApartmentDetail,field:Field):string {
  if(field==='monthlyRent')return a.advertisedMonthlyRent;
  if(field==='maxOccupants')return String(a.management?.maxOccupants??2);
  if(field==='amenities')return a.amenities.join(', ');
  return a[field]??'';
}
// Giá dùng PATCH từng trường; Backend giữ nguyên các giá không được gửi.
export function OwnerApartmentField({apartment:a,field,onSaved,children}:{apartment:ApartmentDetail;field:Field;onSaved:()=>Promise<void>;children:ReactNode}){
  const id=useId();const [open,setOpen]=useState(false);const [value,setValue]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const price=field==='monthlyRent'||field==='electricityUnitPrice'||field==='waterUnitPrice';
  const locked=price&&!a.management?.pricesEditable;
  const canEditField=a.management?.canEdit&&!locked;
  async function save(){
    if(busy||locked)return;setBusy(true);setError('');
    try{
      const body=price?{version:a.version,[field]:value}:
        {version:a.version,title:a.title,description:a.description,maxOccupants:a.management!.maxOccupants??2,amenities:a.amenities,[field]:field==='maxOccupants'?Number(value):field==='amenities'?value.split(',').map(s=>s.trim()).filter(Boolean):value};
      await saveAssetCommand(`/me/apartments/${a.id}${price?'/prices':''}`,'PATCH',body);await onSaved();setOpen(false);
    }catch(e){setError(e instanceof Error?e.message:'Không thể lưu thay đổi.');}finally{setBusy(false);}
  }
  return <div className="min-w-0">
    <div className="flex flex-wrap items-center gap-2">{children}{canEditField&&<button type="button" disabled={busy} aria-label={`Chỉnh sửa ${labels[field]}`} onClick={()=>{setValue(fieldValue(a,field));setError('');setOpen(v=>!v);}} className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 border border-emerald-200 rounded-lg px-2 py-2 min-h-11 disabled:opacity-50"><Pencil aria-hidden="true" className="w-4 h-4"/>Sửa</button>}</div>
    {open&&canEditField&&<form onSubmit={e=>{e.preventDefault();void save();}} className="mt-2 mb-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 space-y-3">
      <fieldset disabled={busy||locked} className="min-w-0 space-y-3"><div><label htmlFor={id} className="block text-sm font-medium">{inputLabels[field]}</label>{field==='description'?<textarea autoFocus id={id} rows={5} maxLength={3000} value={value} onChange={e=>setValue(e.target.value)} className={input}/>:<input autoFocus id={id} required={field!=='amenities'} type={price||field==='maxOccupants'?'number':'text'} min={field==='monthlyRent'?'0.01':field==='maxOccupants'?1:0} max={field==='maxOccupants'?1000:price?'9999999999999.99':undefined} step={price?'0.01':1} maxLength={field==='title'?150:undefined} value={value} onChange={e=>setValue(e.target.value)} className={input}/>}</div>
      <div className="flex flex-wrap gap-2"><button className={`${button} bg-brand-700 text-white`}>{busy?'Đang lưu...':`Lưu ${labels[field]}`}</button><button type="button" onClick={()=>setOpen(false)} className={button}>Hủy sửa {labels[field]}</button></div></fieldset>
      {error&&<p role="alert" className="text-sm text-rose-700">{error}</p>}
    </form>}
  </div>;
}
export function OwnerApartmentPhotos({apartment:a,onSaved,unit=false}:{apartment:ApartmentDetail;onSaved:()=>Promise<void>;unit?:boolean}){
  const m=a.management!;const gallery=unit?(m.unitGallery??[]):m.gallery;const [open,setOpen]=useState(false);
  const [retained,setRetained]=useState(gallery.map(i=>i.id));const [files,setFiles]=useState<File[]>([]);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const run=async(task:()=>Promise<void>)=>{if(busy)return;setBusy(true);setError('');try{await task();await onSaved();setFiles([]);setOpen(false);}catch(e){setError(e instanceof Error?e.message:'Không thể lưu thay đổi.');}finally{setBusy(false);}};
  if(!m.canEdit)return null;
  return <section aria-label={unit?"Quản lý ảnh riêng căn/phòng":"Quản lý ảnh chung tài sản"}>
    <button type="button" disabled={busy} onClick={()=>{setRetained(gallery.map(i=>i.id));setFiles([]);setError('');setOpen(v=>!v);}} className={`${button} inline-flex gap-2 items-center text-emerald-800 border-emerald-300 min-h-11`}><Images className="w-4 h-4" aria-hidden="true"/>{unit?"Quản lý ảnh riêng phòng":"Quản lý ảnh chung tài sản"}</button>
    {open&&<>{error&&<p role="alert" className="text-sm text-rose-700 mt-2">{error}</p>}
    <form onSubmit={e=>{e.preventDefault();if(retained.length+files.length<1||retained.length+files.length>4){setError('Cần giữ từ 1 đến 4 ảnh tổng cộng.');return;}void run(async()=>{const added=files.length?await uploadPropertyImages(files):[];await saveAssetCommand(unit?`/me/apartments/${a.id}/images`:`/me/properties/${m.propertyId}/images`,'PUT',{version:unit?a.version:m.propertyVersion,imageIds:[...retained,...added]});});}} className="mt-3 rounded-xl border border-emerald-200 bg-white p-4 space-y-4">
      <h3 className="font-bold">{unit?"Ảnh riêng căn/phòng":"Ảnh chung tài sản"}</h3><p className="text-sm text-slate-600">{unit?"Ảnh thực tế của căn/phòng này.":"Ảnh khu vực dùng chung của tài sản."} Giữ tổng cộng 1–4 ảnh, ảnh đầu tiên là ảnh đại diện.</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{retained.map((id,index)=><div key={id}><ApartmentImage src={gallery.find(i=>i.id===id)?.url} alt={`Ảnh đã lưu ${index+1}`} className="h-28 w-full rounded-lg object-cover"/><button type="button" disabled={busy} className="text-sm text-rose-700 underline mt-2" onClick={()=>setRetained(ids=>ids.filter(i=>i!==id))}>Bỏ ảnh đã lưu {index+1}</button>{index>0&&<button type="button" disabled={busy} className="text-sm underline block" onClick={()=>setRetained(ids=>{const copy=[...ids];[copy[index-1],copy[index]]=[copy[index],copy[index-1]];return copy;})}>Đưa ảnh {index+1} lên</button>}</div>)}</div>
      <PropertyImagesField files={files} onChange={setFiles} disabled={busy}/><p className="text-sm">Tổng ảnh sau thay đổi: {retained.length+files.length}/4</p><button disabled={busy} className={button}>Lưu thay đổi ảnh</button><button type="button" disabled={busy} onClick={()=>setOpen(false)} className={button}>Hủy sửa ảnh</button>
    </form>
    </>}
  </section>;
}
