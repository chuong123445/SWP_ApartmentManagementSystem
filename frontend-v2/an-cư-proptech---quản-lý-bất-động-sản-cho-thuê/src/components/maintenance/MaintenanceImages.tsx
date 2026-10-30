import { useEffect,useState } from 'react';
import type { MaintenanceTicket } from '@/types';
import { apiFetch,readApiError } from '@/services/http/client';
import { uploadMaintenanceImage } from '@/services/maintenance/maintenanceService';
const labels:Record<string,string>={BEFORE:'Ảnh sự cố',AFTER:'Ảnh sau sửa',RECEIPT:'Chứng từ chi phí'};
function PrivateImage({id,kind}:{id:string;kind:string}){
 const [url,setUrl]=useState('');const [error,setError]=useState('');
 useEffect(()=>{let active=true;let blob='';apiFetch(`/api/v1/maintenance-images/${encodeURIComponent(id)}`).then(async response=>{if(!response.ok)throw await readApiError(response);return response.blob();}).then(data=>{if(active){blob=URL.createObjectURL(data);setUrl(blob);}}).catch(()=>{if(active)setError('Không tải được ảnh.');});return()=>{active=false;if(blob)URL.revokeObjectURL(blob);};},[id]);
 return <div>{url?<a href={url} target="_blank" rel="noreferrer"><img src={url} alt={labels[kind]??'Ảnh sự cố'} className="w-28 h-24 object-cover border rounded-lg"/></a>:<span className="text-xs">{error||'Đang tải ảnh...'}</span>}<p className="text-xs mt-1">{labels[kind]}</p></div>;
}
export function MaintenanceImages({ticket,owner,onReload}:{ticket:MaintenanceTicket;owner:boolean;onReload:()=>void}){
 const [kind,setKind]=useState('BEFORE');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const closed=['RESOLVED','CANCELLED','REJECTED'].includes(ticket.apiStatus??'');
 return <div className="space-y-2"><div className="flex flex-wrap gap-2">{ticket.images?.map(image=><PrivateImage key={image.id} {...image}/>)}</div>
 {!closed&&(ticket.images?.length??0)<5&&<div className="text-xs space-y-2"><label className="block">Loại ảnh<select disabled={busy} value={kind} onChange={e=>setKind(e.target.value)} className="border rounded p-2 ml-2"><option value="BEFORE">Ảnh sự cố</option>{owner&&<><option value="AFTER">Ảnh sau sửa</option><option value="RECEIPT">Chứng từ chi phí</option></>}</select></label><label className="block">Thêm ảnh (PNG/JPEG ≤ 1 MB, tối đa 5 ảnh)<input disabled={busy} type="file" accept="image/png,image/jpeg" className="block mt-1 max-w-full" onChange={async e=>{const file=e.target.files?.[0];e.target.value='';if(!file||busy)return;setError('');if(file.size>1000000){setError('Ảnh tối đa 1 MB.');return;}setBusy(true);try{await uploadMaintenanceImage(ticket.id,kind,file);onReload();}catch(err){setError(err instanceof Error?err.message:'Không thể tải ảnh lên.');}finally{setBusy(false);}}}/></label>{busy&&<p role="status">Đang tải ảnh lên...</p>}</div>}
 {error&&<p role="alert" className="text-rose-700 text-sm">{error}</p>}</div>;
}
