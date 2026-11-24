import {useEffect,useState} from 'react';
import {Link} from 'react-router';
import {getPendingExitRequests,type PendingExitRequest} from '@/services/contract/contractExitService';
import {ContractExitPanel} from './ContractExitPanel';
import type {ContractDraft} from '@/types/contract';
export function PendingContractExitRequests({drafts,revision,onChanged}:{drafts:ContractDraft[];revision:number;onChanged:()=>void}){
 const [items,setItems]=useState<PendingExitRequest[]>([]),[error,setError]=useState(''),[opened,setOpened]=useState<string|null>(null),[retry,setRetry]=useState(0);
 useEffect(()=>{const controller=new AbortController();setError('');getPendingExitRequests(controller.signal).then(value=>{if(!controller.signal.aborted)setItems(value);}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});return()=>controller.abort();},[revision,retry]);
 const visible=items.filter(item=>drafts.some(d=>d.id===item.contractId));
 if(!visible.length&&!error)return null;
 return <section aria-label="Yêu cầu kết thúc thuê đang chờ" className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-4 min-w-0">
  <h3 className="font-bold">Yêu cầu kết thúc thuê đang chờ</h3>
  {error&&<div role="alert" className="text-sm text-rose-700">Chưa tải được yêu cầu kết thúc thuê. {error} <button className="underline" onClick={()=>setRetry(v=>v+1)}>Thử lại</button></div>}
  {visible.map(item=><article key={item.contractId} className="rounded-lg bg-white p-4 space-y-3 min-w-0 break-words">
   <h4 className="font-semibold">HD-{item.contractId} · {item.apartmentTitle}</h4>
   <p className="font-semibold text-amber-900">{item.kind==='MUTUAL'?'Đề nghị kết thúc thuê sớm':'Thông báo kết thúc đơn phương'} · {item.requiresResponse?'Cần bạn phản hồi':'Đang chờ bên còn lại phản hồi'}</p>
   <p className="text-sm whitespace-pre-wrap">Lý do: {item.reason}</p>
   {item.responseDeadline&&<p className="text-sm">Hạn phản hồi: {new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',dateStyle:'short',timeStyle:'short'}).format(new Date(item.responseDeadline))}. Không phản hồi sẽ tự kết thúc hợp đồng và mở lại phòng.</p>}
   <div className="flex flex-wrap gap-3"><button className="rounded-lg bg-brand-700 text-white px-4 py-2 text-sm font-semibold" onClick={()=>setOpened(opened===item.contractId?null:item.contractId)}>{opened===item.contractId?'Đóng xử lý':item.requiresResponse?'Phản hồi ngay':'Xem / rút đề nghị'}</button><Link className="text-sm underline self-center" to={`/contracts/${item.contractId}?section=termination`}>Xem hợp đồng</Link></div>
   {opened===item.contractId&&<ContractExitPanel key={item.contractId} draft={drafts.find(d=>d.id===item.contractId)!} initialOpen onChanged={()=>{setOpened(null);setRetry(v=>v+1);onChanged();}}/>}
  </article>)}
 </section>;
}
