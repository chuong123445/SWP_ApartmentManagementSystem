import {useEffect,useState} from 'react';
import {propertyDossiers} from '@/services/property/dossierService';
import {dossierStatusLabels,type Dossier} from '@/types/dossier';

export function PropertyReviewResult({propertyId,revision}:{propertyId:string;revision?:number}){
  const [history,setHistory]=useState<Dossier[]>([]);const [error,setError]=useState('');
  useEffect(()=>{let active=true;setError('');propertyDossiers(propertyId,true).then(data=>{if(active)setHistory(data);}).catch(e=>{if(active)setError(e instanceof Error?e.message:'Không tải được kết quả xét duyệt.');});return()=>{active=false;};},[propertyId,revision]);
  if(error)return <p role="alert" className="text-sm text-rose-700">{error}</p>;
  if(!history.length)return null;
  return <section aria-label="Kết quả xét duyệt" className="rounded-xl border bg-slate-50 p-4 space-y-3 text-sm">
    <h3 className="font-bold">Kết quả xét duyệt hồ sơ</h3>
    {history.map((d,index)=><div key={d.id} className={index?'border-t pt-3':''}>
      <p className="font-semibold">{index===0?'Mới nhất · ':''}{dossierStatusLabels[d.status]}</p>
      <p>Nộp lúc {new Date(d.submittedAt).toLocaleString('vi-VN')}</p>
      {d.reviewedAt&&<p>Xét duyệt lúc {new Date(d.reviewedAt).toLocaleString('vi-VN')}</p>}
      {d.reviewReason&&<p className="whitespace-pre-wrap break-words">Ý kiến Admin · {d.reviewReason}</p>}
      {d.status==='APPROVED'&&<p>Hồ sơ đã được chấp nhận. Bạn có thể công khai từng căn/phòng.</p>}
    </div>)}
  </section>;
}
