import {useEffect,useState} from 'react';
import type {LeaseRequestResult,ResultEvent} from '@/services/contract/contractTerminationResults';
import {resultStateLabel,resultActionLabel,shouldShowLeaseResult} from '@/utils/leaseRequestResults';
import {dossierDateDisplay} from '@/utils/dossierDates';
const date=(value:string)=>new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',dateStyle:'short',timeStyle:'short'}).format(new Date(value));
const role=(event:ResultEvent)=>event.actorRole==='SYSTEM'?'Hệ thống':`${event.actorRole==='OWNER'?'Chủ nhà':'Người thuê'} ${event.actorName}`;
export function LeaseRequestResultCard({result,history,loadHistory,contractEnded=false,viewerId}:{result:LeaseRequestResult;history?:ResultEvent[];loadHistory?:()=>Promise<ResultEvent[]>;contractEnded?:boolean;viewerId?:string}){
 const [open,setOpen]=useState(false),[events,setEvents]=useState<ResultEvent[]|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
 useEffect(()=>{setOpen(false);setEvents(null);setError('');},[result.event.id]);
 const load=async()=>{if(loading)return;setLoading(true);setError('');try{setEvents(history??await loadHistory?.()??[]);}catch(e){setError(e instanceof Error?e.message:'Không tải được lịch sử.');}finally{setLoading(false);}};
 if(!shouldShowLeaseResult(result,viewerId))return null;
 const color=result.state==='PENDING'?'border-amber-200 bg-amber-50 text-amber-950':result.state==='REJECTED'?'border-rose-200 bg-rose-50 text-rose-950':['AGREED','CANCELLED'].includes(result.state)?'border-emerald-200 bg-emerald-50 text-emerald-950':'border-slate-200 bg-slate-50 text-slate-800';
 return <section aria-label={result.kind==='CANCELLATION'?'Kết quả dừng làm hợp đồng':'Kết quả kết thúc thuê sớm'} className={`mt-3 rounded-xl border p-3 space-y-2 text-sm min-w-0 break-words ${color}`}>
  <p className="font-semibold">{resultStateLabel(result)}</p><p className="text-xs">{result.state==='PENDING'?'Người gửi':'Người xử lý'}: {role(result.event)}</p><p className="text-xs">{result.state==='PENDING'?'Gửi lúc':'Xử lý lúc'}: {date(result.event.createdAt)}</p>
  {result.returnDate&&<p className="text-xs">Ngày đề nghị kết thúc: {dossierDateDisplay(result.returnDate)}</p>}
  {result.proposalReason&&<p className="text-xs whitespace-pre-wrap">Lý do đề nghị: {result.proposalReason}</p>}
  {result.event.reason&&result.event.reason!==result.proposalReason&&<p className="text-xs whitespace-pre-wrap">Phản hồi: {result.event.reason}</p>}
  {result.kind==='TERMINATION'&&result.state==='AGREED'&&!contractEnded&&<p className="text-xs">Hai bên đã đồng ý kết thúc sớm; hợp đồng chỉ kết thúc sau khi hoàn tất bàn giao.</p>}
  <button type="button" className="font-semibold text-xs underline" onClick={()=>{setOpen(v=>!v);if(!open&&!events)void load();}}>{open?'Ẩn chi tiết và lịch sử':'Xem chi tiết và lịch sử'}</button>
  {open&&<div className="border-t pt-2 space-y-2">{loading&&<p role="status">Đang tải lịch sử...</p>}{error&&<p role="alert">{error} <button className="underline" onClick={()=>void load()}>Thử lại</button></p>}{events&&<ol className="space-y-2">{events.map(event=><li key={event.id} className="rounded-lg bg-white/70 p-2 space-y-1 text-xs"><strong>{resultActionLabel(event.action)}</strong><p>{role(event)} · {date(event.createdAt)}</p>{event.reason&&<p className="whitespace-pre-wrap">Lý do / nội dung: {event.reason}</p>}</li>)}</ol>}</div>}
 </section>;
}
