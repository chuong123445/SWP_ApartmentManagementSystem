import {useEffect,useRef,useState} from 'react';
import type {DossierSubmit} from '@/types/dossier';
import {precheckDossier,acknowledgePrecheck,precheckConflicts,type PrecheckPropertyFields,type PrecheckView} from '@/services/property/ownerPrecheckService';
import {ApiError} from '@/services/http/client';
export function OwnerPrecheckPanel({propertyId,draft,selfService=false,propertyFields,autoScan=false}:{propertyId:string;draft:DossierSubmit;selfService?:boolean;propertyFields?:PrecheckPropertyFields;autoScan?:boolean}){
 const fingerprint=JSON.stringify({draft,propertyFields});const epoch=useRef(0);const controller=useRef<AbortController|null>(null);
 const [base,setBase]=useState<PrecheckView|null>(null);const [reviews,setReviews]=useState<PrecheckView[]>([]);const [errors,setErrors]=useState<string[]>([]);const [busy,setBusy]=useState(false);const [attempted,setAttempted]=useState(false);const [acknowledged,setAcknowledged]=useState(false);const [stale,setStale]=useState(false);
 useEffect(()=>{epoch.current++;controller.current?.abort();setBase(null);setReviews([]);setErrors([]);setBusy(false);setAttempted(false);setAcknowledged(false);setStale(false);return()=>{epoch.current++;controller.current?.abort();};},[fingerprint,propertyId]);
 const run=async(scan:boolean,force=false)=>{
  if(busy&&!force)return;const ticket=++epoch.current;const c=new AbortController();controller.current=c;const current=()=>epoch.current===ticket&&!c.signal.aborted;
  setBusy(true);setErrors([]);setReviews([]);setAttempted(scan);setAcknowledged(false);setStale(false);
  try{const source=await precheckDossier(propertyId,draft,{propertyFields},c.signal,selfService);if(!current())return;setBase(source);
   if(scan){for(const file of source.files){try{const result=await precheckDossier(propertyId,draft,{fileId:file.id,sourceHash:source.sourceHash,consent:true,propertyFields},c.signal,selfService);if(!current())return;if(result.sourceHash!==source.sourceHash)throw new Error('Nguồn hồ sơ đã thay đổi; cần quét lại.');setReviews(prev=>[...prev,result]);}
    catch(e){if(!current())return;if(e instanceof ApiError&&e.status===409){setStale(true);setReviews([]);throw e;}setErrors(prev=>[...prev,`${file.filename}: ${e instanceof Error?e.message:'Không quét được tệp.'}`]);}}
   }
  }catch(e){if(current())setErrors(prev=>[...prev,e instanceof Error?e.message:'Không kiểm tra được bản nháp.']);}
  finally{if(current())setBusy(false);}
 };
 useEffect(()=>{if(autoScan)void run(true,true);},[fingerprint,propertyId,autoScan]);
 const acknowledge=async()=>{if(!base||busy||stale)return;const ticket=epoch.current;setBusy(true);setErrors([]);try{for(const r of reviews)if(r.runId){await acknowledgePrecheck(propertyId,r.runId,draft,base.sourceHash,selfService,propertyFields);if(ticket!==epoch.current)return;}if(ticket===epoch.current)setAcknowledged(true);}catch(e){if(ticket===epoch.current)setErrors([e instanceof Error?e.message:'Không ghi nhận được thao tác xem.']);}finally{if(ticket===epoch.current)setBusy(false);}};
 const complete=!!base&&base.files.length>0&&reviews.length===base.files.length&&!stale;
 return <section aria-label="AI kiểm tra trước khi nộp" className="border rounded-xl p-3 space-y-3 bg-slate-50">
  <h3 className="font-semibold">Kiểm tra hồ sơ trước khi nộp</h3><p className="text-sm">{autoScan?"Hệ thống tự đối chiếu giấy tờ với thông tin hiện tại. Kết quả dành cho bạn xem trước khi gửi hồ sơ.":"Kiểm tra thông tin thực hiện tại hệ thống. Bạn có thể quét AI để xem nhận xét đối chiếu trước khi nộp."}</p>
  {!autoScan&&<button type="button" className="border rounded-lg px-3 py-2 bg-white" disabled={busy} onClick={()=>void run(false)}>Kiểm tra thông tin bản nháp</button>}
  {!autoScan&&<button type="button" className="border rounded-lg px-3 py-2 bg-white" disabled={busy} onClick={()=>void run(true)}>{busy?'Đang kiểm tra...':'Quét chứng từ bằng AI'}</button>}
  {busy&&<p role="status" className="text-sm">Đã đọc {reviews.length}/{base?.files.length??0} tệp. Bạn có thể sửa form; kết quả quét cũ sẽ được bỏ.</p>}
  {base&&<div><h4 className="font-semibold text-sm">Thông tin cần bổ sung</h4>{base.checklist.length?<ul className="list-disc pl-5 text-sm">{base.checklist.map((x,i)=><li key={i}>{x}</li>)}</ul>:<p className="text-sm">Chưa phát hiện trường bắt buộc bị thiếu qua kiểm tra sơ bộ; vẫn cần đối chiếu nội dung chứng từ.</p>}</div>}
  {!busy&&attempted&&base&&<p role="status" className="text-sm font-semibold">{stale?'Nguồn đã thay đổi, cần tải lại/quét lại.':!base.files.length?'Chưa có tệp để quét.':complete?`Đã đọc đủ ${reviews.length} tệp; hãy xem từng nhận xét bên dưới.`:`Quét chưa đầy đủ: ${reviews.length}/${base.files.length} tệp thành công. Chưa có kết luận cho toàn bộ hồ sơ.`}</p>}
  {errors.length>0&&<ul role="alert" className="text-sm text-red-700 list-disc pl-5 break-words">{errors.map((x,i)=><li key={i}>{x}</li>)}</ul>}
  {precheckConflicts(reviews).length>0&&<ul className="text-sm text-amber-900 list-disc pl-5">{precheckConflicts(reviews).map(x=><li key={x}>{x}</li>)}</ul>}
  {reviews.map(r=><div key={r.runId??r.review?.fileId} className="bg-white border rounded-lg p-3 text-sm break-words"><strong>{base?.files.find(f=>f.id===r.review?.fileId)?.filename}</strong><p>{r.review?.readable?'AI đọc được nội dung; vẫn cần kiểm tra bản gốc.':'Ảnh/tệp khó đọc hoặc chưa đủ thông tin. Hãy thay bản rõ hơn.'}</p>{r.review?.findings.length?<ul className="list-disc pl-5">{r.review.findings.map((f,i)=><li key={i}>{f.message}</li>)}</ul>:<p>Chưa ghi nhận mâu thuẫn trong tệp này; không đồng nghĩa hồ sơ hợp lệ.</p>}<p className="text-xs text-slate-500">Model: {r.model} · {r.promptVersion}</p></div>)}
  {!autoScan&&!busy&&complete&&!acknowledged&&<button type="button" className="underline text-sm" onClick={()=>void acknowledge()}>Tôi đã xem các nhận xét</button>}{acknowledged&&<p className="text-sm">Đã ghi nhận bạn xem kết quả của bản nháp này.</p>}
  <p className="text-xs text-slate-500">Quét lỗi vẫn có thể nộp theo quy trình thông thường khi đủ điều kiện. Mọi thay đổi thông tin hoặc tệp đều yêu cầu kiểm tra lại.</p>
 </section>;
}
