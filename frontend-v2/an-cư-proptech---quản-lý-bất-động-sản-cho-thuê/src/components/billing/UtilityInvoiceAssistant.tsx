import { useEffect, useRef, useState } from 'react';
import { apiFetch, readApiError } from '@/services/http/client';
import type { BillingContext } from '@/types/billing';

export function UtilityInvoiceAssistant({ context, onApply }: { context:BillingContext;onApply:(electricity:string,water:string)=>void }) {
 const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const [result,setResult]=useState<{input:string;source:string;electricity:string;water:string}|null>(null);
 const request=useRef<AbortController|null>(null);
 const source=JSON.stringify([context.contractId,context.period,context.baselineVersion,context.electricityStartReading,context.waterStartReading,context.waterBillingMode]);
 useEffect(()=>{setResult(null);setError('');setBusy(false);request.current?.abort();request.current=null;return()=>{request.current?.abort();};},[source]);
 async function suggest(){
  if(request.current||!message.trim())return;
  const controller=new AbortController();request.current=controller;setBusy(true);setError('');setResult(null);
  try{
   const response=await apiFetch(`/api/v1/owner/contracts/${encodeURIComponent(context.contractId)}/utility-invoice-suggestion`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message,period:context.period,baselineVersion:context.baselineVersion}),signal:controller.signal});
   if(!response.ok)throw await readApiError(response);
   const data=await response.json();
   if(data.contractId!==context.contractId||data.period!==context.period||data.baselineVersion!==context.baselineVersion||typeof data.electricityEndReading!=='string'||typeof data.waterEndReading!=='string')throw new Error('Kết quả không khớp kỳ hóa đơn. Hãy tải lại.');
   if(!controller.signal.aborted)setResult({input:message,source,electricity:data.electricityEndReading,water:data.waterEndReading});
  }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Chưa đọc được yêu cầu.');}
  finally{if(request.current===controller){request.current=null;setBusy(false);}}
 }
 return <section className="rounded-xl border border-blue-200 bg-blue-50 p-3 space-y-2" aria-label="AI lập hóa đơn điện nước">
  <label className="block text-sm font-semibold">Yêu cầu AI điền hóa đơn<textarea className="mt-1 w-full min-w-0 rounded-lg border bg-white p-2 text-sm" rows={3} maxLength={2000} value={message} onChange={e=>setMessage(e.target.value)} placeholder={`Phòng ${context.roomNumber}, chỉ số điện cuối tháng 1250, nước cuối tháng 90`}/></label>
  <p className="text-xs text-slate-600">Ghi tên/mã phòng và chỉ số công tơ cuối kỳ. Thiếu số liệu sẽ được yêu cầu bổ sung. AI không tự đặt đơn giá hay gửi hóa đơn.</p>
  <button type="button" disabled={busy||!message.trim()} onClick={()=>void suggest()} className="rounded-lg border bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50">{busy?'Đang đọc yêu cầu…':'AI điền hóa đơn'}</button>
  {error&&<p role="alert" className="text-sm text-rose-700">{error}</p>}
  {result?.source===source&&result.input===message&&<div className="rounded-lg bg-white p-3 text-sm space-y-2">
   <p>Phòng {context.roomNumber} · Kỳ {context.period}</p><p>Điện cuối kỳ: {result.electricity}{context.waterBillingMode!=='PER_PERSON'&&` · Nước cuối kỳ: ${result.water}`}</p>
   <button type="button" className="rounded-lg bg-brand-700 px-3 py-2 text-white" onClick={()=>{onApply(result.electricity,result.water);setResult(null);}}>Áp dụng chỉ số để lập hóa đơn</button>
  </div>}
 </section>;
}
