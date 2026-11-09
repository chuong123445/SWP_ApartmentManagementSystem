import {useEffect,useRef,useState} from 'react';
import {useAuth} from '@/hooks/useAuth';
import {SignaturePad} from './SignaturePad';
import {getHandoverPdf,signHandover,type ContractExit} from '@/services/contract/contractExitService';

export function HandoverDocument({data,disabled,onUpdated}:{data:ContractExit;disabled:boolean;onUpdated:(value:ContractExit)=>Promise<void>}){
 const {user}=useAuth();const [url,setUrl]=useState('');const [pdfError,setPdfError]=useState('');const [error,setError]=useState('');
 const [signature,setSignature]=useState<string|null>(null);const [consent,setConsent]=useState(false);const [busy,setBusy]=useState(false);const [retry,setRetry]=useState(0);const [blocked,setBlocked]=useState(false);const writing=useRef(false);
 const key=JSON.stringify([data.contractId,data.sourceVersion,data.signing]);
 useEffect(()=>{const controller=new AbortController();let objectUrl='';setUrl('');setPdfError('');setSignature(null);setConsent(false);setBlocked(false);setError('');
  getHandoverPdf(data.contractId,controller.signal).then(blob=>{if(!controller.signal.aborted){objectUrl=URL.createObjectURL(blob);setUrl(objectUrl);}}).catch(e=>{if(!controller.signal.aborted)setPdfError(e.message);});
  return()=>{controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};
 },[key,retry]);
 const sign=async()=>{if(writing.current||disabled||blocked||!data.canSign||!signature||!consent||!url||!data.signing)return;writing.current=true;setBusy(true);setError('');let saved=false;
  try{const result=await signHandover(data.contractId,data.sourceVersion,data.signing.contentHash,signature);saved=true;setSignature(null);setConsent(false);window.dispatchEvent(new Event('ancu:tenancy-changed'));await onUpdated(result);}
  catch(e){setBlocked(true);setSignature(null);setConsent(false);setError((saved?'Đã lưu, nhưng chưa tải lại được hợp đồng. ':'')+(e instanceof Error?e.message:'Chưa lưu được chữ ký. Tải lại trạng thái trước khi ký tiếp.')); }
  finally{writing.current=false;setBusy(false);}
 };
 if(!data.document||!data.signing)return null;
 return <section aria-label="PDF và chữ ký bàn giao" className="rounded-xl border p-4 space-y-4 min-w-0">
  <h3 className="font-bold">Biên bản bàn giao · {data.document.number}</h3>
  <p className="text-sm">{data.signing.state==='SIGNED'?'Hai bên đã ký, bàn giao hoàn tất.':data.signing.state==='WAITING_OWNER'?'Chờ chủ nhà ký.':data.signing.state==='WAITING_CUSTOMER'?'Chờ khách thuê ký.':'Chờ chữ ký của chủ nhà và khách thuê.'}</p>
  {error&&<p role="alert" className="text-red-700 text-sm">{error}</p>}
  {pdfError?<p role="alert" className="text-red-700 text-sm">{pdfError}<button type="button" className="underline ml-2" onClick={()=>setRetry(v=>v+1)}>Tải lại PDF bàn giao</button></p>:!url?<p role="status">Đang tải PDF bàn giao…</p>:<>
   <div className="flex flex-wrap gap-3 text-sm"><a className="underline text-emerald-800" href={url} download={`${data.document.number}.pdf`}>Tải PDF bàn giao</a><a className="underline text-emerald-800" href={url} target="_blank" rel="noreferrer">Mở PDF bàn giao / In</a></div>
   <iframe title="Bản PDF biên bản bàn giao" src={url} className="block w-full rounded-lg border" style={{aspectRatio:'210 / 297',height:'auto'}}/>
  </>}
  <div className="grid sm:grid-cols-2 gap-3">{([
   ['Bên cho thuê - nhận lại nhà',data.document.snapshot.owner,data.signing.ownerSignedAt,data.signing.ownerSignature],
   ['Bên thuê - bàn giao lại nhà',data.document.snapshot.customer,data.signing.customerSignedAt,data.signing.customerSignature],
  ] as const).map(([label,party,at,image])=><div key={label} className="border rounded-lg p-3 space-y-2 min-w-0"><h4 className="font-semibold text-sm">{label}</h4><p className="text-sm break-words">{party.fullName}</p>{image&&<img alt={`Chữ ký ${party.fullName}`} src={image} className="h-20 max-w-full object-contain"/>}<p className="text-sm">{at?`Đã ký lúc ${new Date(at).toLocaleString('vi-VN')}`:'Chưa ký'}</p></div>)}</div>
  {data.canSign&&<div className="space-y-3"><p className="text-sm">Bạn ký với tư cách {user?.id===data.ownerId?'bên cho thuê':'bên thuê'}. Hãy đọc PDF trước khi ký.</p><SignaturePad key={key} disabled={busy||disabled||blocked||!url} onChange={setSignature}/><label className="flex gap-2 items-start text-sm"><input type="checkbox" checked={consent} disabled={busy||disabled||blocked} onChange={e=>setConsent(e.target.checked)}/>Tôi đã đọc biên bản PDF, đồng ý nội dung và ký bàn giao lại nhà. Hợp đồng kết thúc khi đủ hai chữ ký.</label><button type="button" disabled={busy||disabled||blocked||!signature||!consent||!url} onClick={()=>void sign()} className="bg-emerald-700 text-white px-4 py-2 rounded-lg disabled:opacity-50">{busy?'Đang lưu chữ ký…':'Ký biên bản bàn giao'}</button></div>}
 </section>;
}
