import { useState } from 'react';
import type { MaintenanceTicket } from '@/types';
import { maintenanceAction } from '@/services/maintenance/maintenanceService';
const names:Record<string,string>={CREATED:'Báo sự cố',ACCEPT:'Tiếp nhận',REJECT:'Từ chối',ASSIGN:'Phân công thợ',CANCEL:'Hủy phiếu'};
export function MaintenanceActions({ticket,owner,onReload}:{ticket:MaintenanceTicket;owner:boolean;onReload:()=>void}){
 const [action,setAction]=useState('');const [note,setNote]=useState('');const [name,setName]=useState('');const [phone,setPhone]=useState('');const [date,setDate]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const actions=owner?(ticket.apiStatus==='PENDING'?['ACCEPT','REJECT','CANCEL']:ticket.apiStatus==='ACCEPTED'?['ASSIGN','CANCEL']:ticket.apiStatus==='IN_PROGRESS'?['ASSIGN']:[]):[];
 return <div className="space-y-3 border-t pt-3">
  {ticket.technicianName&&<p className="text-sm">Thợ: {ticket.technicianName} · {ticket.technicianPhone}<br/>Lịch hẹn: {ticket.scheduledAt?new Date(ticket.scheduledAt).toLocaleString('vi-VN'):'Chưa có'}</p>}
  <div className="flex flex-wrap gap-2">{actions.map(a=><button key={a} disabled={busy} onClick={()=>{setAction(a);setError('');}} className="border rounded-lg px-3 py-2 text-xs">{names[a]}</button>)}</div>
  {action&&<form className="space-y-3" onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);setError('');try{await maintenanceAction(ticket.id,{version:ticket.apiVersion!,action,note,...(action==='ASSIGN'?{technicianName:name,technicianPhone:phone,scheduledAt:new Date(date).toISOString()}: {})},owner);setAction('');setNote('');onReload();}catch(err){setError(err instanceof Error?err.message:'Không thể cập nhật.');}finally{setBusy(false);}}}>
   <h3 className="font-semibold text-sm">{names[action]}</h3><fieldset disabled={busy} className="space-y-2">
   {action==='ASSIGN'&&<><label className="block text-sm">Tên thợ<input required maxLength={200} value={name} onChange={e=>setName(e.target.value)} className="block border p-2 rounded w-full"/></label><label className="block text-sm">Điện thoại thợ<input required pattern="[+0-9 ()-]{6,30}" value={phone} onChange={e=>setPhone(e.target.value)} className="block border p-2 rounded w-full"/></label><label className="block text-sm">Lịch hẹn<input required type="datetime-local" value={date} onChange={e=>setDate(e.target.value)} className="block border p-2 rounded w-full"/></label></>}
   <label className="block text-sm">Ghi chú / lý do<textarea required={action==='REJECT'||action==='CANCEL'} maxLength={3000} value={note} onChange={e=>setNote(e.target.value)} className="block border p-2 rounded w-full"/></label>
   </fieldset><button disabled={busy} className="bg-emerald-700 text-white px-3 py-2 rounded text-sm">{busy?'Đang lưu...':'Xác nhận'}</button><button type="button" disabled={busy} onClick={()=>setAction('')} className="ml-3 text-sm">Đóng</button>
  </form>}
  {error&&<p role="alert" className="text-rose-700 text-sm">{error}</p>}
  {!!ticket.history?.length&&<details><summary className="text-xs cursor-pointer">Lịch sử xử lý ({ticket.history.length})</summary><ol className="text-xs space-y-2 mt-2">{ticket.history.map((h,i)=><li key={i}><strong>{names[h.action]??h.action}</strong> · {new Date(h.createdAt).toLocaleString('vi-VN')}<p className="whitespace-pre-wrap">{h.note}</p></li>)}</ol></details>}
 </div>;
}
