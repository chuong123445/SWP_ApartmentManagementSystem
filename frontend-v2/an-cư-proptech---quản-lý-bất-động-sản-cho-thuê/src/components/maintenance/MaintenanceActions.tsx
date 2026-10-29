import { useState } from 'react';
import type { MaintenanceTicket } from '@/types';
import { maintenanceAction } from '@/services/maintenance/maintenanceService';
import { billingMoney } from '@/services/billing/billingService';
import { MaintenanceImages } from '@/components/maintenance/MaintenanceImages';
const names:Record<string,string>={CREATED:'Báo sự cố',ACCEPT:'Tiếp nhận',REJECT:'Từ chối',ASSIGN:'Phân công thợ',CANCEL:'Hủy phiếu',READY:'Báo sửa xong',CONFIRM:'Xác nhận hoàn tất',REOPEN:'Yêu cầu sửa lại'};
export function MaintenanceActions({ticket,owner,onReload}:{ticket:MaintenanceTicket;owner:boolean;onReload:()=>void}){
 const [cost,setCost]=useState(ticket.actualCost??'0');const [payer,setPayer]=useState(ticket.costResponsibility??'OWNER');const [customerCost,setCustomerCost]=useState(ticket.customerCost??'0');
 const [action,setAction]=useState('');const [note,setNote]=useState('');const [name,setName]=useState('');const [phone,setPhone]=useState('');const [date,setDate]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const confirming=ticket.apiStatus==='AWAITING_CONFIRMATION' && (owner?!ticket.canConfirm:ticket.canConfirm);
 const actions=confirming?['CONFIRM','REOPEN']:owner?(ticket.apiStatus==='PENDING'?['ACCEPT','REJECT','CANCEL']:ticket.apiStatus==='ACCEPTED'?['ASSIGN','CANCEL']:ticket.apiStatus==='IN_PROGRESS'?['ASSIGN','READY']:[]):[];
 return <div className="space-y-3 border-t pt-3">
  <MaintenanceImages ticket={ticket} owner={owner} onReload={onReload}/>
  {ticket.actualCost!=null&&<div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1"><p>Chi phí thực tế: <strong>{billingMoney(ticket.actualCost)}</strong></p><p>Bên chịu: {({OWNER:'Chủ nhà',CUSTOMER:'Khách thuê',SHARED:'Hai bên chia sẻ'} as Record<string,string>)[ticket.costResponsibility??'']}</p><p>Phần khách chịu: {billingMoney(ticket.customerCost??'0')}</p><p className="text-xs text-amber-800">Chỉ đối soát; chưa xác nhận thanh toán hoặc cộng vào hóa đơn.</p></div>}
  {ticket.repairResult&&<p className="text-sm whitespace-pre-wrap">Kết quả sửa chữa: {ticket.repairResult}</p>}
  {owner && ticket.apiStatus==='AWAITING_CONFIRMATION' && ticket.canConfirm && <p className="text-sm text-amber-700">Chờ khách thuê kiểm tra và xác nhận kết quả.</p>}
  {ticket.technicianName&&<p className="text-sm">Thợ: {ticket.technicianName} · {ticket.technicianPhone}<br/>Lịch hẹn: {ticket.scheduledAt?new Date(ticket.scheduledAt).toLocaleString('vi-VN'):'Chưa có'}</p>}
  <div className="flex flex-wrap gap-2">{actions.map(a=><button key={a} disabled={busy} onClick={()=>{setAction(a);setError('');}} className="border rounded-lg px-3 py-2 text-xs">{names[a]}</button>)}</div>
  {action&&<form className="space-y-3" onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);setError('');try{await maintenanceAction(ticket.id,{version:ticket.apiVersion!,action,note,...(action==='ASSIGN'?{technicianName:name,technicianPhone:phone,scheduledAt:new Date(date).toISOString()}: {}),...(action==='READY'?{actualCost:cost,costResponsibility:payer,customerCost:payer==='SHARED'?customerCost:undefined}:{})},owner);setAction('');setNote('');onReload();}catch(err){setError(err instanceof Error?err.message:'Không thể cập nhật.');}finally{setBusy(false);}}}>
   <h3 className="font-semibold text-sm">{names[action]}</h3><fieldset disabled={busy} className="space-y-2">
   {action==='READY'&&<><label className="block text-sm">Chi phí thực tế (đ)<input required type="number" min="0" max="9999999999999.99" step="0.01" value={cost} onChange={e=>setCost(e.target.value)} className="block border p-2 rounded w-full"/></label><label className="block text-sm">Bên chịu phí<select value={payer} onChange={e=>setPayer(e.target.value)} className="block border p-2 rounded w-full"><option value="OWNER">Chủ nhà</option>{ticket.canConfirm&&<><option value="CUSTOMER">Khách thuê</option><option value="SHARED">Hai bên chia sẻ</option></>}</select></label>{payer==='SHARED'&&<label className="block text-sm">Phần khách chịu (đ)<input required type="number" min="0" max={cost} step="0.01" value={customerCost} onChange={e=>setCustomerCost(e.target.value)} className="block border p-2 rounded w-full"/></label>}</>}
   {action==='ASSIGN'&&<><label className="block text-sm">Tên thợ<input required maxLength={200} value={name} onChange={e=>setName(e.target.value)} className="block border p-2 rounded w-full"/></label><label className="block text-sm">Điện thoại thợ<input required pattern="[+0-9 ()-]{6,30}" value={phone} onChange={e=>setPhone(e.target.value)} className="block border p-2 rounded w-full"/></label><label className="block text-sm">Lịch hẹn<input required type="datetime-local" value={date} onChange={e=>setDate(e.target.value)} className="block border p-2 rounded w-full"/></label></>}
   <label className="block text-sm">{action==='READY'?'Kết quả sửa chữa':'Ghi chú / lý do'}<textarea required={['REJECT','CANCEL','READY','REOPEN'].includes(action)} maxLength={3000} value={note} onChange={e=>setNote(e.target.value)} className="block border p-2 rounded w-full"/></label>
   {action==='CONFIRM'&&<label className="flex gap-2 text-sm"><input required type="checkbox"/>Tôi đã kiểm tra và xác nhận sự cố đã được khắc phục.</label>}
   </fieldset><button disabled={busy} className="bg-emerald-700 text-white px-3 py-2 rounded text-sm">{busy?'Đang lưu...':'Xác nhận'}</button><button type="button" disabled={busy} onClick={()=>setAction('')} className="ml-3 text-sm">Đóng</button>
  </form>}
  {error&&<p role="alert" className="text-rose-700 text-sm">{error}</p>}
  {!!ticket.history?.length&&<details><summary className="text-xs cursor-pointer">Lịch sử xử lý ({ticket.history.length})</summary><ol className="text-xs space-y-2 mt-2">{ticket.history.map((h,i)=><li key={i}><strong>{names[h.action]??h.action}</strong> · {new Date(h.createdAt).toLocaleString('vi-VN')}<p className="whitespace-pre-wrap">{h.note}</p></li>)}</ol></details>}
 </div>;
}
