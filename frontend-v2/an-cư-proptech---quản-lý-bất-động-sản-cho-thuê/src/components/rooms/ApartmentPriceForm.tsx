import { useState } from 'react';
import type { Room } from '@/types';
export interface PriceInput { monthlyRent:string;electricityUnitPrice:string;waterUnitPrice:string }
export function ApartmentPriceForm({room,onSave}:{room:Room;onSave:(room:Room,input:PriceInput)=>Promise<void>}){
  const [open,setOpen]=useState(false);const [rent,setRent]=useState(String(room.price));const [electric,setElectric]=useState(room.electricityUnitPrice??'');const [water,setWater]=useState(room.waterUnitPrice??'');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  if(room.status!=='available')return <p className="px-5 py-3 text-sm text-slate-600">Không sửa giá khi căn hộ đang làm hợp đồng, có người thuê hoặc bảo trì.</p>;
  return <section className="p-5 border-b space-y-3"><button onClick={()=>{setOpen(!open);setRent(String(room.price));setElectric(room.electricityUnitPrice??'');setWater(room.waterUnitPrice??'');setError('');}} className="text-emerald-700 underline font-semibold">{open?'Đóng chỉnh sửa giá':'Chỉnh sửa giá thuê, điện và nước'}</button>
    {open&&<form className="space-y-3" onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);setError('');try{await onSave(room,{monthlyRent:rent,electricityUnitPrice:electric,waterUnitPrice:water});setOpen(false);}catch(e){setError(e instanceof Error?e.message:'Chưa cập nhật được giá.');}finally{setBusy(false);}}}>
      <p className="text-sm text-slate-600">Chỉ lưu khi căn hộ đang trống và không còn yêu cầu thuê chờ xử lý. Hợp đồng đã tạo giữ nguyên đơn giá đã chốt.</p>
      <fieldset disabled={busy} className="grid sm:grid-cols-3 gap-3">{[['Giá thuê/tháng (đ)',rent,setRent,'0.01'],['Đơn giá điện (đ/kWh)',electric,setElectric,'0'],['Đơn giá nước (đ/m³)',water,setWater,'0']].map(([label,value,set,min])=><label key={label as string} className="text-sm">{label as string}<input required type="number" min={min as string} max="9999999999999.99" step="0.01" value={value as string} onChange={e=>(set as (s:string)=>void)(e.target.value)} className="mt-1 border rounded-lg p-2 w-full"/></label>)}</fieldset>
      {error&&<p role="alert" className="text-rose-700">{error}</p>}<button disabled={busy} className="bg-emerald-600 text-white rounded-lg px-4 py-2 disabled:opacity-50">{busy?'Đang lưu giá...':'Lưu giá mới'}</button>
    </form>}
  </section>;
}
