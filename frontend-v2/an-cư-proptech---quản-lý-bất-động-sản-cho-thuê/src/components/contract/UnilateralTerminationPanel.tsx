import {useEffect,useRef,useState} from 'react';
import {actOnContractExit,uploadExitEvidence,downloadExitEvidence,type ContractExit,type ExitEvidence,type UnilateralExitAction} from '@/services/contract/contractExitService';
import {ApiError} from '@/services/http/client';
const button='rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50';
const control='mt-1 block w-full min-w-0 rounded-lg border p-2';
const labels:Record<UnilateralExitAction,string>={PROPOSE_UNILATERAL_TERMINATION:'Gửi thông báo chờ 30 ngày',OBJECT_UNILATERAL_TERMINATION:'Phản đối kết thúc đơn phương',WITHDRAW_UNILATERAL_TERMINATION:'Rút thông báo đơn phương',FINALIZE_UNILATERAL_TERMINATION:'Xác nhận thu hồi phòng và kết thúc'};
function deadline(value:string){return new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',dateStyle:'short',timeStyle:'short'}).format(new Date(value));}
export function UnilateralTerminationPanel({data,isOwner,disabled,onUpdated,onReload,onBusyChange}:{data:ContractExit;isOwner:boolean;disabled:boolean;onUpdated:(value:ContractExit)=>Promise<void>;onReload:()=>void;onBusyChange:(busy:boolean)=>void}){
 const [selected,setSelected]=useState<UnilateralExitAction|null>(null),[reason,setReason]=useState(''),[clause,setClause]=useState(''),[consent,setConsent]=useState(false),[recovered,setRecovered]=useState(false),[reviewed,setReviewed]=useState(false),[notes,setNotes]=useState(''),[ids,setIds]=useState<string[]>([]),[uploads,setUploads]=useState<ExitEvidence[]>([]),[error,setError]=useState(''),[stale,setStale]=useState(false),[busy,setBusy]=useState(false);
 const running=useRef(false),alive=useRef(true);useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const available:UnilateralExitAction[]=[...(data.canProposeUnilateral?['PROPOSE_UNILATERAL_TERMINATION' as const]:[]),...(data.canObjectUnilateral?['OBJECT_UNILATERAL_TERMINATION' as const]:[]),...(data.canWithdrawUnilateral?['WITHDRAW_UNILATERAL_TERMINATION' as const]:[]),...(data.canFinalizeUnilateral?['FINALIZE_UNILATERAL_TERMINATION' as const]:[])];
 const evidence=[...new Map([...data.evidence,...uploads].map(e=>[e.id,e])).values()];
 const choose=(action:UnilateralExitAction)=>{setSelected(action);setConsent(false);setError('');};
 const upload=async(file:File)=>{
  if(running.current||disabled||ids.length>=5)return;
  if(!['image/png','image/jpeg'].includes(file.type)||file.size>1000000){setError('Chỉ nhận JPEG/PNG tối đa 1 MB.');return;}
  running.current=true;setBusy(true);onBusyChange(true);setError('');
  try{const value=await uploadExitEvidence(data.contractId,file);if(alive.current){setUploads(v=>[...v,value]);setIds(v=>[...v,value.id]);}}
  catch(e){if(alive.current)setError(e instanceof Error?e.message:'Chưa tải được chứng cứ.');}
  finally{running.current=false;if(alive.current){setBusy(false);onBusyChange(false);}}
 };
 const submit=async()=>{
  if(!selected||!consent||running.current||disabled||stale)return;
  if(selected==='FINALIZE_UNILATERAL_TERMINATION'&&(!recovered||!reviewed||!ids.length))return;
  running.current=true;setBusy(true);onBusyChange(true);setError('');let saved=false;
  try{const value=await actOnContractExit(data.contractId,selected,data.sourceVersion,{...(selected==='PROPOSE_UNILATERAL_TERMINATION'?{unilateral:{reason:reason.trim(),clauseReference:clause.trim()}}:{}),...(selected==='OBJECT_UNILATERAL_TERMINATION'?{reason:reason.trim()}:{}),...(selected==='FINALIZE_UNILATERAL_TERMINATION'?{unilateralCompletion:{possessionRecovered:recovered,accountsReviewed:reviewed,conditionNotes:notes.trim(),evidenceIds:ids}}:{})});saved=true;if(!alive.current)return;setSelected(null);setConsent(false);await onUpdated(value);window.dispatchEvent(new Event('ancu:tenancy-changed'));}
  catch(e){if(alive.current){setError((saved?'Đã lưu, nhưng chưa tải lại được hợp đồng. ':'')+(e instanceof Error?e.message:'Không xử lý được yêu cầu.'));setStale(saved||!(e instanceof ApiError&&e.status===400));}}
  finally{running.current=false;if(alive.current){setBusy(false);onBusyChange(false);}}
 };
 if(!data.unilateralState||(!data.unilateral&&!data.canProposeUnilateral&&(!isOwner||data.contractStatus!=='ACTIVE')))return null;
 const state=data.unilateralState??'NONE',notice=data.unilateral,proposing=selected==='PROPOSE_UNILATERAL_TERMINATION',objecting=selected==='OBJECT_UNILATERAL_TERMINATION',finishing=selected==='FINALIZE_UNILATERAL_TERMINATION';
 return <section aria-label="Kết thúc khi người thuê mất liên lạc" className="rounded-xl border border-amber-200 p-4 space-y-3 min-w-0">
  <h3 className="font-bold">Kết thúc khi người thuê mất liên lạc</h3>
  <p className="text-sm">Chủ nhà gửi thông báo và chờ đủ 30 ngày. Hết hạn không tự kết thúc hợp đồng hoặc mở lại phòng. Người thuê phản đối sẽ chặn luồng đơn phương.</p>
  {isOwner&&!data.unilateral&&!data.canProposeUnilateral&&<p className="text-sm text-amber-900">Chưa thể gửi thông báo vì còn đề nghị kết thúc, biên bản bàn giao, thuê tiếp hoặc bất đồng chưa được xử lý. Hãy kiểm tra các mục bên dưới; không bỏ qua phản đối của người thuê.</p>}
  {notice&&<div className="rounded-lg bg-slate-50 p-3 text-sm space-y-2 break-words"><p>Hạn phản hồi: <strong>{deadline(notice.responseDeadline)}</strong> (giờ Việt Nam)</p><p className="whitespace-pre-wrap">Lý do: {notice.reason}</p><p className="whitespace-pre-wrap">Căn cứ / điều khoản: {notice.clauseReference}</p></div>}
  {state==='PENDING'&&<p role="status" className="text-sm">Đang chờ phản hồi. Chủ nhà chỉ có thể xác nhận khi hết hạn và đã xử lý các hóa đơn nháp hoặc luồng thuê tiếp đang mở. Tiền thuê và công nợ vẫn được theo dõi trong thời gian chờ.</p>}
  {state==='OBJECTED'&&<p role="status" className="text-sm text-rose-800 whitespace-pre-wrap">Người thuê đã phản đối: {notice?.objectionReason}. Đã chặn kết thúc đơn phương; hai bên cần giải quyết nội dung bất đồng.</p>}
  {state==='WITHDRAWN'&&<p role="status" className="text-sm">Chủ nhà đã rút thông báo. Hợp đồng và công nợ giữ nguyên.</p>}
  {state==='COMPLETED'&&<div role="status" className="text-sm text-emerald-800 space-y-2"><p>Chủ nhà đã xác nhận thu hồi phòng và kết thúc đơn phương sau thời hạn phản hồi. Căn hộ đã về trạng thái trống; công nợ vẫn được giữ. Đây không phải biên bản có chữ ký người thuê.</p><p className="whitespace-pre-wrap">{notice?.completionNotes}</p>{notice?.completionEvidenceIds.map(id=>{const item=evidence.find(e=>e.id===id);return item&&<button type="button" key={id} className="block underline" onClick={()=>void downloadExitEvidence(data.contractId,item).catch(e=>setError(e instanceof Error?e.message:'Không tải được chứng cứ.'))}>Xem chứng cứ: {item.filename}</button>;})}</div>}
  {error&&<p role="alert" className="text-sm text-rose-700 break-words">{error}</p>}
  {stale&&<button type="button" className={button} onClick={onReload}>Tải lại trạng thái trước khi xác nhận</button>}
  <div className="flex flex-wrap gap-2">{available.map(action=><button type="button" key={action} disabled={disabled||busy||stale} className={button} onClick={()=>choose(action)}>{labels[action]}</button>)}</div>
  {selected&&!stale&&<form aria-label="Xử lý kết thúc đơn phương" className="border-t pt-3 space-y-3" onSubmit={e=>{e.preventDefault();void submit();}}><h4 className="font-semibold">{labels[selected]}</h4><fieldset disabled={disabled||busy} className="space-y-3 min-w-0">
   {(proposing||objecting)&&<label className="block text-sm">{objecting?'Nội dung phản đối':'Lý do người thuê mất liên lạc'}<textarea required maxLength={3000} value={reason} onChange={e=>setReason(e.target.value)} className={control}/></label>}
   {proposing&&<label className="block text-sm">Căn cứ / điều khoản hợp đồng để kết thúc<textarea required maxLength={3000} value={clause} onChange={e=>setClause(e.target.value)} className={control}/></label>}
   {finishing&&<><label className="flex items-start gap-2 text-sm"><input type="checkbox" required checked={recovered} onChange={e=>setRecovered(e.target.checked)}/>Tôi xác nhận đã thu hồi thực tế phòng và chìa khóa, có thể cho thuê lại.</label><label className="flex items-start gap-2 text-sm"><input type="checkbox" required checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>Tôi đã đối chiếu chỉ số điện nước và các khoản phải thu; thao tác này không xóa nợ hoặc tự hoàn tiền cọc.</label><label className="block text-sm">Tình trạng phòng và ghi nhận thu hồi<textarea required maxLength={3000} value={notes} onChange={e=>setNotes(e.target.value)} className={control}/></label><label className="block text-sm">Ảnh chứng cứ thu hồi (chọn ít nhất một, tối đa năm ảnh)<input type="file" accept="image/png,image/jpeg" disabled={ids.length>=5} onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file);e.target.value='';}} className={control}/></label>{evidence.filter(e=>e.uploaderId===data.ownerId).map(e=><label key={e.id} className="flex gap-2 text-sm"><input type="checkbox" checked={ids.includes(e.id)} disabled={!ids.includes(e.id)&&ids.length>=5} onChange={event=>setIds(v=>event.target.checked?[...v,e.id]:v.filter(id=>id!==e.id))}/>{e.filename}</label>)}</>}
   <label className="flex items-start gap-2 text-sm"><input type="checkbox" required checked={consent} onChange={e=>setConsent(e.target.checked)}/>Tôi đã kiểm tra thông tin và xác nhận thao tác này.</label>
   <div className="flex flex-wrap gap-2"><button type="submit" disabled={!consent||(finishing&&(!recovered||!reviewed||!ids.length))} className={`${button} bg-brand-700 text-white`}>{busy?'Đang xử lý…':'Xác nhận'}</button><button type="button" className={button} onClick={()=>setSelected(null)}>Đóng</button></div>
  </fieldset></form>}
 </section>;
}
