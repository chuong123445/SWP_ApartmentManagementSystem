import {useEffect,useRef,useState} from 'react';
import {getIdentity,saveIdentity} from '@/services/identity/identityService';
import {myIdentitySubmission,submitIdentity,type IdentitySubmission} from '@/services/identity/identityReviewService';
import {IdentityImage} from './IdentityImage';
import {useAuth} from '@/hooks/useAuth';
import type {IdentityFields,IdentityProfile} from '@/types/identity';
export const identityLabels: [keyof IdentityFields,string][]=[['legalName','Họ và tên trên căn cước'],['documentNumber','Số căn cước công dân'],['dateOfBirth','Ngày sinh'],['issueDate','Ngày cấp căn cước'],['issuePlace','Nơi cấp căn cước'],['permanentAddress','Địa chỉ thường trú'],['currentAddress','Địa chỉ hiện tại']];
const blank:IdentityFields={legalName:'',documentNumber:'',dateOfBirth:'',issueDate:'',issuePlace:'',permanentAddress:'',currentAddress:''};
export function ManualIdentityForm({onRefresh}:{onRefresh:()=>void}){
 const {reloadUser}=useAuth();const [fields,setFields]=useState<IdentityFields>(blank);const [profile,setProfile]=useState<IdentityProfile|null>(null);const [submission,setSubmission]=useState<IdentitySubmission|null>(null);
 const [front,setFront]=useState<File|null>(null),[back,setBack]=useState<File|null>(null);const [consent,setConsent]=useState(false);const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [notice,setNotice]=useState('');const [revision,setRevision]=useState(0);const writing=useRef(false);
 useEffect(()=>{let active=true;setLoading(true);setError('');Promise.all([getIdentity(),myIdentitySubmission()]).then(([p,s])=>{if(active){setProfile(p);setFields(p??blank);setSubmission(s);setFront(null);setBack(null);setConsent(false);}}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[revision]);
 async function save(send:boolean){
  if(writing.current||(send&&!consent))return;writing.current=true;setBusy(true);setError('');setNotice('');
  try{const clean=Object.fromEntries(identityLabels.map(([key])=>[key,fields[key]])) as unknown as IdentityFields;const p=await saveIdentity(clean,profile?.version??null,front,back);setProfile(p);setFront(null);setBack(null);if(send){setSubmission(await submitIdentity(p.version));setNotice('Đã gửi hồ sơ. Admin sẽ kiểm tra thông tin và ảnh căn cước.');}else setNotice('Đã lưu hồ sơ. Bạn có thể gửi Admin xét duyệt.');}
  catch(e){setError(e instanceof Error?e.message:'Chưa lưu được hồ sơ.');}finally{writing.current=false;setBusy(false);}
 }
 const pending=submission?.status==='PENDING',approved=submission?.status==='APPROVED';
 return <section className="app-panel p-4 sm:p-6 space-y-4" aria-label="Xác thực bằng hồ sơ nhập tay"><h2 className="font-bold text-lg">Gửi hồ sơ để Admin xác thực</h2><p className="text-sm text-slate-600">Nhập đúng thông tin căn cước và tải ảnh hai mặt. Khi gửi, Admin được xem bản hồ sơ và ảnh bạn đã nộp để xét duyệt.</p>
  {loading&&<p role="status">Đang tải hồ sơ…</p>}
  {submission&&<div className="rounded-lg bg-slate-50 p-3 space-y-2"><p className="font-semibold">{pending?'Đang chờ Admin duyệt':approved?'Hồ sơ đã được Admin duyệt':'Hồ sơ bị từ chối — cần bổ sung'}</p>{submission.reason&&<p className="whitespace-pre-wrap break-words">Lý do / ghi chú: {submission.reason}</p>}<button type="button" disabled={busy} className="underline text-brand-700" onClick={()=>{setRevision(v=>v+1);onRefresh();void reloadUser().catch(e=>setError(e.message));}}>Cập nhật trạng thái hồ sơ</button></div>}
  {error&&<p role="alert" className="text-rose-700">{error}<button type="button" className="ml-2 underline" onClick={()=>setRevision(v=>v+1)}>Tải lại hồ sơ</button></p>}{notice&&<p role="status" className="text-emerald-800">{notice}</p>}
  {!loading&&!pending&&!approved&&<form className="space-y-4" onSubmit={e=>{e.preventDefault();void save(true);}}><fieldset disabled={busy} className="space-y-4 min-w-0"><div className="grid gap-4 sm:grid-cols-2">{identityLabels.map(([key,label])=><label key={key} className="block min-w-0 text-sm font-medium">{label}<input className="mt-1 w-full min-w-0 rounded-lg border p-2" required type={key==='dateOfBirth'||key==='issueDate'?'date':'text'} inputMode={key==='documentNumber'?'numeric':undefined} pattern={key==='documentNumber'?'[0-9]{12}':undefined} maxLength={key==='documentNumber'?12:key==='legalName'?100:key==='issuePlace'?200:key==='permanentAddress'?500:300} value={fields[key]} onChange={e=>setFields(f=>({...f,[key]:e.target.value}))}/></label>)}</div>
   <div className="grid gap-4 sm:grid-cols-2">{(['front','back'] as const).map(side=><div key={side} className="min-w-0"><label className="block text-sm">Ảnh căn cước {side==='front'?'mặt trước':'mặt sau'}<input className="mt-2 block w-full min-w-0" type="file" accept="image/png,image/jpeg" required={!profile} onChange={e=>(side==='front'?setFront:setBack)(e.target.files?.[0]??null)}/></label><IdentityImage side={side} file={side==='front'?front:back} stored={!!profile} revision={profile?.version??0}/></div>)}</div>
   <p className="text-xs text-slate-600">Mỗi ảnh PNG/JPEG tối đa 5 MB. Lưu hồ sơ chưa đồng nghĩa đã được xác thực.</p>
   <label className="flex gap-2 text-sm"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>Tôi xác nhận thông tin đã nhập và đồng ý gửi hồ sơ, ảnh căn cước cho Admin xét duyệt.</label>
   <div className="flex flex-wrap gap-3"><button type="button" className="rounded-lg border px-4 py-2" onClick={e=>{const form=e.currentTarget.closest('form');if(form?.reportValidity())void save(false);}}>Lưu hồ sơ</button><button type="submit" disabled={!consent} className="rounded-lg bg-brand-700 px-4 py-2 text-white disabled:opacity-50">{busy?'Đang gửi…':submission?'Gửi lại hồ sơ':'Gửi Admin xét duyệt'}</button></div>
  </fieldset></form>}
 </section>;
}
