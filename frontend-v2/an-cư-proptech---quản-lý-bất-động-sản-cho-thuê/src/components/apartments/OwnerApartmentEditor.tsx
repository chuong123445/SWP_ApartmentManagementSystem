import {useState} from 'react';
import {ApartmentImage} from '@/components/apartments/ApartmentImage';
import {PropertyImagesField} from '@/components/property/PropertyImagesField';
import {uploadPropertyImages} from '@/services/property/propertyImageService';
import {saveAssetCommand} from '@/services/property/assetManagementService';
import type {ApartmentDetail} from '@/types/apartment';
const input='w-full border border-slate-300 rounded-lg px-3 py-2 mt-1 bg-white';
const button='border rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50';
export function OwnerApartmentEditor({apartment:a,onSaved}:{apartment:ApartmentDetail;onSaved:()=>Promise<void>}){
  const m=a.management!;
  const [title,setTitle]=useState(a.title);const [description,setDescription]=useState(a.description);const [occupants,setOccupants]=useState(m.maxOccupants??2);const [amenities,setAmenities]=useState(a.amenities.join(', '));
  const [rent,setRent]=useState(a.advertisedMonthlyRent);const [electricity,setElectricity]=useState(a.electricityUnitPrice??'');const [water,setWater]=useState(a.waterUnitPrice??'');
  const [retained,setRetained]=useState(m.gallery.map(i=>i.id));const [files,setFiles]=useState<File[]>([]);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const run=async(task:()=>Promise<void>)=>{if(busy)return;setBusy(true);setError('');try{await task();await onSaved();}catch(e){setError(e instanceof Error?e.message:'Không thể lưu thay đổi.');}finally{setBusy(false);}};
  return <section aria-label="Chỉnh sửa căn hộ của bạn" className="space-y-6 border border-emerald-200 rounded-2xl p-5 bg-white">
    <h2 className="text-xl font-bold">Chỉnh sửa căn hộ của bạn</h2><p className="text-sm text-slate-600">Địa chỉ, diện tích và thông tin pháp lý theo nguồn đã xác thực được giữ nguyên. Các thay đổi bên dưới không sửa nội dung hợp đồng đã lưu.</p>
    {error&&<p role="alert" className="text-rose-700 bg-rose-50 rounded-lg p-3">{error}</p>}
    <form onSubmit={e=>{e.preventDefault();void run(()=>saveAssetCommand(`/me/apartments/${a.id}`,'PATCH',{version:a.version,title,description,maxOccupants:occupants,amenities:amenities.split(',').map(s=>s.trim()).filter(Boolean)}));}} className="space-y-4">
      <fieldset disabled={busy} className="space-y-4"><legend className="font-bold mb-3">Nội dung giới thiệu</legend>
        <label className="block text-sm">Tiêu đề căn hộ<input required maxLength={150} value={title} onChange={e=>setTitle(e.target.value)} className={input}/></label>
        <div><label htmlFor="asset-description" className="block text-sm">Mô tả căn hộ</label><textarea id="asset-description" rows={5} maxLength={3000} value={description} onChange={e=>setDescription(e.target.value)} className={input}/></div>
        <label className="block text-sm">Số người tối đa<input type="number" min={1} max={1000} required value={occupants} onChange={e=>setOccupants(Number(e.target.value))} className={input}/></label>
        <label className="block text-sm">Tiện ích (ngăn cách bằng dấu phẩy)<input value={amenities} onChange={e=>setAmenities(e.target.value)} className={input}/></label>
        <button className={button}>Lưu thông tin căn hộ</button>
      </fieldset>
    </form>
    <form onSubmit={e=>{e.preventDefault();void run(()=>saveAssetCommand(`/me/apartments/${a.id}/prices`,'PATCH',{version:a.version,monthlyRent:rent,electricityUnitPrice:electricity,waterUnitPrice:water}));}} className="border-t pt-5 space-y-4">
      <h3 className="font-bold">Giá thuê, điện và nước</h3>{m.priceLockReason&&<p className="text-amber-800 text-sm">{m.priceLockReason}</p>}
      <fieldset disabled={busy||!m.pricesEditable} className="grid sm:grid-cols-3 gap-3">{([
        ['Giá thuê mỗi tháng (đ)',rent,setRent,'0.01'],['Đơn giá điện (đ/kWh)',electricity,setElectricity,'0'],['Đơn giá nước (đ/m³)',water,setWater,'0'],
      ] as const).map(([label,value,set,min])=><label key={label} className="text-sm">{label}<input required type="number" min={min} step="0.01" max="9999999999999.99" value={value} onChange={e=>set(e.target.value)} className={input}/></label>)}<button className={button}>Lưu giá thuê, điện và nước</button></fieldset>
    </form>
    <form onSubmit={e=>{e.preventDefault();if(retained.length+files.length<1||retained.length+files.length>4){setError('Cần giữ từ 1 đến 4 ảnh tổng cộng.');return;}void run(async()=>{const added=files.length?await uploadPropertyImages(files):[];await saveAssetCommand(`/me/properties/${m.propertyId}/images`,'PUT',{version:m.propertyVersion,imageIds:[...retained,...added]});});}} className="border-t pt-5 space-y-4">
      <h3 className="font-bold">Ảnh giới thiệu tài sản</h3><p className="text-sm text-slate-600">Ảnh dùng chung cho các căn trong tài sản này. Giữ tổng cộng 1–4 ảnh; ảnh đầu tiên là ảnh đại diện.</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{retained.map((id,index)=><div key={id}><ApartmentImage src={m.gallery.find(i=>i.id===id)?.url} alt={`Ảnh đã lưu ${index+1}`} className="h-28 w-full rounded-lg object-cover"/><button type="button" disabled={busy} className="text-sm text-rose-700 underline mt-2" onClick={()=>setRetained(ids=>ids.filter(i=>i!==id))}>Bỏ ảnh đã lưu {index+1}</button>{index>0&&<button type="button" disabled={busy} className="text-sm underline block" onClick={()=>setRetained(ids=>{const copy=[...ids];[copy[index-1],copy[index]]=[copy[index],copy[index-1]];return copy;})}>Đưa ảnh {index+1} lên</button>}</div>)}</div>
      <PropertyImagesField files={files} onChange={setFiles} disabled={busy}/><p className="text-sm">Tổng ảnh sau thay đổi: {retained.length+files.length}/4</p><button disabled={busy} className={button}>Lưu thay đổi ảnh</button>
    </form>
  </section>;
}
