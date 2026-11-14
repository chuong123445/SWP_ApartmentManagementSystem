import {ApiError} from '@/services/http/client';
import { DescriptionSuggestion } from './DescriptionSuggestion';
import { useEffect,useRef,useState,type FormEvent } from 'react';
import { useNavigate,useSearchParams } from 'react-router';
import { evidenceLabels,rightLabels,type Dossier,type EvidenceFile,type EvidencePurpose } from '@/types/dossier';
import { uploadEvidence } from '@/services/property/dossierService';
import { uploadPropertyImages } from '@/services/property/propertyImageService';
import { precheckDossier } from '@/services/property/ownerPrecheckService';
import { extractListingDocument,finishListingDraft,getListingDraft,listListingDrafts,saveListingDraft,startListingDraft,type ListingDraft } from '@/services/property/listingDraftService';
import { acceptableSuggestion,applyExtractedFields,propertyExtractionKeys,blankListing,blankListingUnit,copyCommonTerms,legalFields,listingDossier,listingProperty,requiredEvidence,restoreListing,selectedListingUnits,type LegalKey,type ListingState,type Suggestion,type WizardUnit } from '@/utils/listingWizard';
import { DossierDateInput } from '@/components/property/DossierDateInput';
import { dossierFieldDisplay } from '@/utils/dossierDates';
import { OwnerPrecheckPanel } from '@/components/property/OwnerPrecheckPanel';
import { ApartmentImage } from '@/components/apartments/ApartmentImage';

const documentWarning='Chưa thể tiếp tục. Bỏ tệp không phù hợp, gửi lại giấy tờ đúng loại và quét lại.';
const field='mt-1 w-full min-w-0 border border-slate-300 rounded-lg px-3 py-2 bg-white';
const button='rounded-lg border px-4 py-2 text-sm disabled:opacity-50';
const steps=['Giấy tờ','Thông tin & ảnh tài sản','Căn/phòng','Xem trước & gửi'];
export function PropertyListingWizard({rightType}:{rightType:Dossier['rightType']}){
 const navigate=useNavigate();const [query,setQuery]=useSearchParams();const draftId=query.get('draft');
 const [draft,setDraft]=useState<ListingDraft|null>(null);const [saved,setSaved]=useState<ListingDraft[]>([]);const [state,setState]=useState<ListingState>(blankListing);
 const [busy,setBusy]=useState(false);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [notice,setNotice]=useState('');const [scanIssues,setScanIssues]=useState<string[]>([]);
 const [requestKey]=useState(()=>crypto.randomUUID());const form=useRef<HTMLFormElement>(null);const mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 useEffect(()=>{let active=true;setLoading(true);setError('');(draftId?getListingDraft(draftId):listListingDrafts()).then(async result=>{
   if(!active)return;if(Array.isArray(result)){setSaved(result.filter(d=>d.rightType===rightType));setDraft(null);}else{if(result.rightType!==rightType)throw new Error('Loại quyền không khớp bản nháp.');if(result.completed){navigate('/account/rental-properties',{replace:true});return;}setDraft(result);const restored=restoreListing(result.payload);if(result.files.some(f=>!restored.excludedFiles.includes(f.id)&&!result.acceptedFileIds?.includes(f.id)))restored.step=0;setState(restored);
     if(result.files.some(file=>!restored.excludedFiles.includes(file.id)&&(restored.extractionVersion!==3||!result.acceptedFileIds?.includes(file.id)||!restored.extractedFileIds?.includes(file.id)))){
      setBusy(true);
      try{await scanDocuments(result,restored,result.files.filter(file=>!restored.excludedFiles.includes(file.id)));}
      finally{if(active)setBusy(false);}
     }}
 }).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[draftId,rightType,navigate]);
 const change=(next:Partial<ListingState>)=>{setState(s=>({...s,...next}));setNotice('Có thay đổi chưa lưu.');};
 const updateUnit=(key:string,values:Partial<WizardUnit>)=>{change({units:state.units.map(u=>u.key===key?{...u,...values}:u)});};
 const fail=(e:unknown)=>{if(e instanceof ApiError&&e.code==='DOCUMENT_SCAN_REQUIRED')setNotice(documentWarning);else setError(e instanceof Error?e.message:'Không thể thực hiện. Vui lòng thử lại.');};
 const run=async(work:()=>Promise<void>)=>{if(busy)return;setBusy(true);setError('');try{await work();}catch(e){if(mounted.current)fail(e);}finally{if(mounted.current)setBusy(false);}};
 const persist=async(next:ListingState,current=draft)=>{if(!current)return;const result=await saveListingDraft(current,next);if(mounted.current){setDraft(result);setState(next);setNotice('Đã lưu tiến trình. Bạn có thể quay lại sau.');}return result;};
 const files=(draft?.files??[]).filter(f=>!state.excludedFiles.includes(f.id));const units=selectedListingUnits(state);
 const legalKeys=legalFields.filter(([key])=>rightType==='OWNERSHIP'?key.startsWith('certificate'):rightType==='AUTHORIZATION'?!key.startsWith('originalLease'):true);
 const dossier=()=>listingDossier(state,draft?.files??[],rightType,draft?.propertyVersion??0);
 const scanDocuments=async(current:ListingDraft,next:ListingState,requested:EvidenceFile[])=>{
   const selected=current.files.filter(file=>!next.excludedFiles.includes(file.id)&&(requested.some(item=>item.id===file.id)||!next.extractedFileIds?.includes(file.id)));
   const extracted=new Set(next.extractedFileIds??[]);
   const input=listingDossier(next,current.files,rightType,current.propertyVersion);
   const base=await precheckDossier(current.propertyId,input,{},undefined,true);
   const suggestions=next.suggestions.filter(item=>!selected.some(file=>file.id===item.fileId));
   const issues:string[]=[];
   for(const file of selected){
    extracted.delete(file.id);
    try{
     const result=await extractListingDocument(current.propertyId,input,file.id,base.sourceHash);
     if(!mounted.current)return;
     if(!result.review?.readable||result.review.purposeMatch!==true||result.review.documentType!==file.purpose)throw new Error('Giấy tờ không phù hợp hoặc chưa đọc rõ. Hãy gửi lại đúng loại giấy tờ.');
     extracted.add(file.id);
     if(result.review?.readable){
      for(const item of result.review.extractedFields){
       if(propertyExtractionKeys.some(key=>key===item.field)||legalFields.some(([key])=>key===item.field))
        suggestions.push({...item,fileId:file.id,filename:file.filename});
      }
     }
     for(const finding of result.review?.findings??[])issues.push(`${file.filename}: ${finding.message}`);
    }catch(error){issues.push(`${file.filename}: ${error instanceof Error?error.message:'Chưa đọc được.'}`);}
   }
   if(!mounted.current)return;
   setScanIssues(issues);
   const filled={...applyExtractedFields(next,suggestions),step:current.files.some(f=>!next.excludedFiles.includes(f.id)&&!extracted.has(f.id))?0:next.step,extractionVersion:3,extractedFileIds:[...extracted]};
   await persist(filled,current);
   setNotice(current.files.some(f=>!next.excludedFiles.includes(f.id)&&!extracted.has(f.id))?documentWarning:'Đã đọc giấy tờ phù hợp và tự điền thông tin.');
 };
 const upload=async(purpose:EvidencePurpose,chosen:File[])=>{
   if(!draft||!chosen.length)return;
   if(files.length+chosen.length>20)throw new Error('Hồ sơ tối đa 20 tệp.');
   let current=draft;
   const added:EvidenceFile[]=[];
   const uploadErrors:string[]=[];
   for(const file of chosen){
    try{
     const uploaded=await uploadEvidence(draft.propertyId,purpose,file,true);
     if(!mounted.current)return;
     added.push(uploaded);current={...current,files:[...current.files,uploaded]};setDraft(current);
    }catch(error){uploadErrors.push(`${file.name}: ${error instanceof Error?error.message:'Tải chưa thành công.'}`);}
   }
   if(!added.length)throw new Error(uploadErrors.join(' '));
   const next={...state,confirmed:false};
   const saved=await persist(next,current);
   if(!saved||!mounted.current)return;
   setNotice('Đang tự đọc giấy tờ và điền thông tin…');
   try{await scanDocuments(saved,next,added);}
   catch(error){setScanIssues([error instanceof Error?error.message:'Chưa đọc được giấy tờ.']);setNotice('Chưa quét thành công. Cần quét lại trước khi sang bước thông tin.');}
   if(uploadErrors.length)setError(uploadErrors.join(' '));
 };
 const photos=async(chosen:File[],key?:string)=>{
   if(!chosen.length)return;const ids=await uploadPropertyImages(chosen);
   await persist(key?{...state,units:state.units.map(u=>u.key===key?{...u,imageIds:ids}:u)}:{...state,imageIds:ids});
 };
 const conflicts=legalFields.filter(([key])=>new Set(state.suggestions.filter(item=>item.field===key&&files.some(file=>file.id===item.fileId)).map(item=>item.value.trim().normalize('NFC').toLocaleLowerCase('vi'))).size>1);
 const changePhotos=(key:string|undefined,ids:string[])=>change(key?{units:state.units.map(unit=>unit.key===key?{...unit,imageIds:ids}:unit)}:{imageIds:ids});
 const photoGroup=(key:string|undefined,label:string,ids:string[])=> <section className="border rounded-xl p-3 space-y-3"><label className="block text-sm font-semibold">{label}<input className="block mt-2 w-full text-sm" type="file" multiple accept="image/png,image/jpeg" onChange={e=>{const chosen=Array.from(e.target.files??[]);e.target.value='';void run(()=>photos(chosen,key));}}/></label><p className="text-xs text-slate-500">Từ 1 đến 4 ảnh JPEG/PNG, tối đa 5 MB/ảnh. Ảnh đầu là ảnh đại diện; chọn lại để thay nhóm ảnh.</p><div className="flex flex-wrap gap-2">{ids.map(id=><div key={id} className="space-y-1"><ApartmentImage src={`/api/v1/property-images/${id}`} alt={label} className="w-28 h-24 object-cover rounded-lg"/><button type="button" className="block text-xs underline" onClick={()=>changePhotos(key,[id,...ids.filter(other=>other!==id)])}>Đặt đại diện</button><button type="button" className="block text-xs underline text-rose-700" onClick={()=>changePhotos(key,ids.filter(other=>other!==id))}>Bỏ ảnh</button></div>)}</div></section>;
 const validate=()=>{
   if(!form.current?.reportValidity())return false;
   if(state.step===0&&requiredEvidence(rightType).some(p=>!files.some(f=>f.purpose===p)))throw new Error('Cần đủ loại giấy tờ bắt buộc trước khi tiếp tục. Có thể lưu nháp để bổ sung sau.');
   if(state.step===0&&(state.extractionVersion!==3||files.some(f=>!draft?.acceptedFileIds?.includes(f.id)))){setNotice(documentWarning);return false;}
   if(state.step===1){const l=state.legal;
     if(rightType!=='OWNERSHIP'&&(l.rightsValidUntil<l.rightsValidFrom||!l.rightsValidFrom||!l.rightsValidUntil))throw new Error('Thời hạn quyền cho thuê không hợp lệ.');
     if(rightType==='SUBLEASE'&&(l.rightsValidFrom<l.originalLeaseFrom||l.rightsValidUntil>l.originalLeaseUntil||!l.originalLeaseFrom||!l.originalLeaseUntil))throw new Error('Thời hạn cho thuê lại phải nằm trong hợp đồng gốc.');
     if(!state.imageIds.length)throw new Error('Cần ít nhất một ảnh chung của tài sản.');
     if(!state.confirmed)throw new Error('Vui lòng xác nhận đã đối chiếu thông tin với giấy tờ.');
   }
   if(state.step===2){if(!units.length)throw new Error('Chọn ít nhất một phòng.');if(new Set(units.map(u=>u.roomNumber.trim().toLowerCase())).size!==units.length)throw new Error('Mã phòng bị trùng.');}
   if(state.step>=2&&units.some(u=>!u.imageIds.length))throw new Error('Cần ít nhất một ảnh riêng cho từng căn/phòng đã chọn.');
   return true;
 };
 const next=(event:FormEvent)=>{event.preventDefault();void run(async()=>{if(!validate())return;if(state.step<3){await persist({...state,step:state.step+1});return;}
   if(!draft)return;await finishListingDraft(draft,listingProperty(state),dossier());navigate('/account/rental-properties');
 });};
 if(loading)return <p role="status">Đang tải bản nháp...</p>;
 if(!draft)return <section className="border bg-white rounded-2xl p-5 space-y-4"><h2 className="text-xl font-bold">{rightLabels[rightType]} — Chuẩn bị hồ sơ</h2><p>Tải giấy tờ trước, xác nhận thông tin rồi chọn các căn/phòng muốn cho thuê.</p>
   {saved.length>0&&<div className="space-y-2"><h3 className="font-semibold">Tiếp tục bản nháp</h3>{saved.map(d=><button key={d.propertyId} className={`${button} block w-full text-left`} onClick={()=>setQuery({...Object.fromEntries(query),draft:d.propertyId})}>{restoreListing(d.payload).name||'Hồ sơ đang chuẩn bị'} · {d.files.length} chứng từ</button>)}</div>}
   <button disabled={busy} className={`${button} bg-brand-700 text-white`} onClick={()=>void run(async()=>{const result=await startListingDraft(requestKey,rightType);setQuery({...Object.fromEntries(query),draft:result.propertyId});})}>Bắt đầu hồ sơ mới</button>{error&&<p role="alert">{error}</p>}</section>;
 return <section className="border bg-white rounded-2xl p-4 md:p-6 space-y-5 min-w-0">
   <ol aria-label="Tiến trình đăng tải" className="flex flex-wrap gap-2 text-sm">{steps.map((label,index)=><li key={label} aria-current={state.step===index?'step':undefined} className={`rounded-lg px-3 py-2 ${state.step===index?'bg-brand-700 text-white':'bg-slate-100'}`}>{index+1}. {label}</li>)}</ol>
   <form ref={form} onInvalidCapture={event=>{(event.target as HTMLElement).closest("details")?.setAttribute("open","");}} onSubmit={next} className="space-y-5"><fieldset disabled={busy} className="space-y-5 min-w-0">
   {state.step===0&&<><h2 className="text-xl font-bold">Giấy tờ quyền cho thuê</h2><p>PDF/JPEG/PNG, tối đa 10 MB/tệp và 20 tệp. Giấy tờ được lưu riêng tư, không dùng làm ảnh quảng cáo.</p>
     {[...requiredEvidence(rightType),'SUPPORTING' as EvidencePurpose].map(p=><label key={p} className="block border rounded-lg p-3 text-sm">{evidenceLabels[p]}{p!=='SUPPORTING'?' *':''}<input className="block mt-2 w-full" type="file" multiple accept="application/pdf,image/png,image/jpeg" onChange={e=>{const chosen=Array.from(e.target.files??[]);e.target.value='';void run(()=>upload(p,chosen));}}/></label>)}
     <p className="text-sm text-slate-600">Giấy tờ phải được AI đọc rõ và nhận đúng loại trước khi sang phần thông tin. Nếu tệp sai, hãy bỏ tệp đó rồi tải giấy tờ phù hợp.</p>
     {files.length>0&&<button type="button" className={button} onClick={()=>void run(()=>scanDocuments(draft,{...state,step:0},files))}>Quét lại giấy tờ</button>}
     <ul className="space-y-2">{files.map(f=><li key={f.id} className="flex justify-between gap-3 text-sm"><span className="break-all">{f.filename} · {evidenceLabels[f.purpose]}</span><button type="button" className="shrink-0 underline" onClick={()=>void run(async()=>{await persist({...state,excludedFiles:[...state.excludedFiles,f.id],suggestions:state.suggestions.filter(s=>s.fileId!==f.id),confirmed:false});})}>Bỏ</button></li>)}</ul>
     {(busy||scanIssues.length>0)&&<div role={scanIssues.length?'alert':undefined} className={`rounded-xl p-4 space-y-2 ${scanIssues.length?'bg-amber-50':'bg-emerald-50'}`}>{busy&&<p role="status">Đang tải và đọc giấy tờ…</p>}{scanIssues.map((issue,index)=><p key={index} className="text-sm text-amber-900 break-words">{issue}</p>)}</div>}
   </>}
   {state.step===1&&<><h2 className="text-xl font-bold">Thông tin, quyền cho thuê và ảnh tài sản</h2>
     {conflicts.length>0&&<p role="status" className="text-sm text-amber-900">Các tệp có giá trị khác nhau cho {conflicts.map(([,label])=>label).join(", ")}. Đối chiếu bản gốc trước khi chọn.</p>}
     {state.suggestions.length>0&&<details className="rounded-xl bg-emerald-50 p-3 text-sm"><summary className="cursor-pointer font-semibold">Đã tự điền từ giấy tờ · xem nguồn</summary>{state.suggestions.filter(item=>files.some(file=>file.id===item.fileId)).map((item,index)=><p key={index} className="mt-2 break-words">{propertyExtractionKeys.includes(item.field as typeof propertyExtractionKeys[number])?({propertyName:'Tên tài sản',propertyAddress:'Địa chỉ',city:'Tỉnh/Thành phố',district:'Quận/Huyện',ward:'Phường/Xã'}[item.field as 'city']):legalFields.find(([key])=>key===item.field)?.[1]} · {dossierFieldDisplay(item.field,item.value)} — {item.filename}{item.page?` · trang ${item.page}`:''}</p>)}</details>}
     <div className="grid sm:grid-cols-2 gap-3">{([['name','Tên tài sản',150],['address','Địa chỉ tài sản',300],['city','Tỉnh/Thành phố',80],['district','Quận/Huyện/Khu vực',80],['ward','Phường/Xã',80]] as const).map(([key,label,max])=><label key={key} className="text-sm">{label}{key!=='ward'?' *':''}<input className={field} required={key!=='ward'} maxLength={max} value={state[key]} onChange={e=>change({[key]:e.target.value,confirmed:false})}/></label>)}</div>
     <div className="grid sm:grid-cols-2 gap-3">{legalKeys.map(([key,label])=>{const date=/Date$|From$|Until$/.test(key);const certificate=key.startsWith('certificate');const required=certificate?Object.entries(state.legal).some(([k,v])=>k.startsWith('certificate')&&v!==''):true;return <label key={key} className="text-sm">{label}{required?' *':''}<>{date?<DossierDateInput className={field} required={required} value={state.legal[key]} onChange={value=>change({legal:{...state.legal,[key]:value},confirmed:false})}/>:<input className={field} required={required} pattern={key==='principalDocumentNumber'?'[0-9]{12}':undefined} maxLength={key==='principalDocumentNumber'?12:key==='certificateIssuePlace'?200:100} value={state.legal[key]} onChange={e=>change({legal:{...state.legal,[key]:e.target.value},confirmed:false})}/>}</></label>;})}</div>
     <p className="text-sm text-slate-500">Giấy chứng nhận là nhóm tùy chọn: nếu nhập, cần đủ số, ngày và nơi cấp. Diện tích đất không thay thế diện tích phòng.</p>
     {photoGroup(undefined,'Ảnh chung: mặt tiền, lối đi, khu vực chung',state.imageIds)}
     <label className="flex gap-2 text-sm"><input type="checkbox" required checked={state.confirmed} onChange={e=>change({confirmed:e.target.checked})}/>Tôi đã đối chiếu thông tin khai báo với giấy tờ.</label>
   </>}
   {state.step===2&&<><h2 className="text-xl font-bold">Các căn/phòng muốn cho thuê</h2><label className="block text-sm">Cách cho thuê<select className={field} value={state.rentalMode} onChange={e=>change({rentalMode:e.target.value as ListingState['rentalMode']})}><option value="SINGLE_UNIT">Cho thuê nguyên căn</option><option value="MULTI_UNIT">Nhiều căn/phòng</option></select></label><p className="text-sm">Chỉ cần hoàn thiện các phòng đã chọn. Chỉ số công tơ được bổ sung khi chuẩn bị hợp đồng/bàn giao.</p>
     {(state.rentalMode==='SINGLE_UNIT'?state.units.slice(0,1):state.units).map((u,index)=><section key={u.key} className="border rounded-xl p-4 space-y-3 min-w-0">
       <div className="flex flex-wrap justify-between gap-2"><label className="font-semibold">{state.rentalMode==='MULTI_UNIT'&&<input type="checkbox" checked={u.selected} onChange={e=>updateUnit(u.key,{selected:e.target.checked})}/>} Căn/phòng {index+1}</label>{state.units.length>1&&state.rentalMode==='MULTI_UNIT'&&<button type="button" className="underline text-sm" onClick={()=>change({units:state.units.filter(x=>x.key!==u.key)})}>Xóa phòng</button>}</div>
       {(state.rentalMode==='SINGLE_UNIT'||u.selected)&&<details open={index===0||!u.roomNumber}><summary className="cursor-pointer text-sm text-emerald-800">Thông tin {u.roomNumber||`căn/phòng ${index+1}`}{u.areaM2?` · ${u.areaM2} m²`:''}{u.advertisedMonthlyRent?` · ${Number(u.advertisedMonthlyRent).toLocaleString('vi-VN')} đ/tháng`:''}</summary><div className="grid sm:grid-cols-2 gap-3 mt-3">
       <label className="text-sm">Mã căn/phòng *<input className={field} required maxLength={20} value={u.roomNumber} onChange={e=>updateUnit(u.key,{roomNumber:e.target.value})}/></label>
       {([['areaM2','Diện tích (m²)',true,'0.01'],['advertisedMonthlyRent','Giá thuê/tháng (đ)',true,'0.01'],['deposit','Cọc thỏa thuận (đ)',false,'0'],['electricityUnitPrice','Đơn giá điện (đ/kWh)',true,'0'],['waterUnitPrice','Đơn giá nước (đ/m³)',true,'0']] as const).map(([key,label,required,min])=><label key={key} className="text-sm">{label}{required?' *':''}<input className={field} type="number" step="0.01" min={min} max={key==='areaM2'?'9999999999.99':'9999999999999.99'} required={required} value={u[key]??''} onChange={e=>updateUnit(u.key,{[key]:e.target.value||null})}/></label>)}
       {([['floor','Tầng',0],['maxOccupants','Số người tối đa',1],['bedrooms','Phòng ngủ',0],['bathrooms','Phòng tắm',0]] as const).map(([key,label,min])=><label key={key} className="text-sm">{label}<input className={field} type="number" min={min} max={key==='floor'?200:100} step="1" required={key==='floor'} value={u[key]??''} onChange={e=>updateUnit(u.key,{[key]:e.target.value===''?null:Number(e.target.value)})}/></label>)}
       <label className="text-sm sm:col-span-2">Tiện ích (phân cách bằng dấu phẩy)<input className={field} value={u.amenitiesText??u.amenities.join(', ')} onChange={e=>updateUnit(u.key,{amenitiesText:e.target.value,amenities:e.target.value.split(',').map(x=>x.trim()).filter(Boolean)})}/></label>
       <div className="sm:col-span-2">{photoGroup(u.key,`Ảnh riêng căn/phòng ${u.roomNumber||index+1}`,u.imageIds)}</div>
       <div className="sm:col-span-2">
         <label className="block text-sm">Mô tả phòng<textarea className={field} rows={3} maxLength={3000} value={u.description} onChange={e=>updateUnit(u.key,{description:e.target.value})}/></label>
         <DescriptionSuggestion facts={{
           areaM2: u.areaM2, monthlyRent: u.advertisedMonthlyRent,
           floor: u.floor, maxOccupants: u.maxOccupants, bedrooms: u.bedrooms,
           bathrooms: u.bathrooms, amenities: u.amenities, imageIds:u.imageIds,
         }} onApply={description => updateUnit(u.key, { description })} />
       </div>
       </div></details>}
       {index===0&&state.rentalMode==='MULTI_UNIT'&&<button type="button" className={button} onClick={()=>change({units:state.units.map((target,i)=>i&&target.selected?copyCommonTerms(u,target):target)})}>Áp dụng điện, nước, cọc, số người và tiện ích cho phòng đã chọn</button>}
     </section>)}
     {state.rentalMode==='MULTI_UNIT'&&<button type="button" disabled={state.units.length>=50} className={button} onClick={()=>change({units:[...state.units,blankListingUnit()]})}>Thêm phòng</button>}
   </>}
   {state.step===3&&<><h2 className="text-xl font-bold">Kiểm tra trước khi gửi</h2><section className="border rounded-xl p-4 space-y-2"><h3 className="font-bold">Nội dung khách thuê sẽ thấy sau khi công khai</h3><p>{state.name} · {state.address}</p>{units.map(u=><div key={u.key} className="border-t pt-2"><strong>{u.roomNumber} · {u.areaM2} m² · {Number(u.advertisedMonthlyRent).toLocaleString('vi-VN')} đ/tháng</strong><p className="text-sm break-words">{u.description}</p><p className="text-sm">{u.imageIds.length} ảnh riêng · {u.amenities.join(', ')}</p></div>)}</section><section className="rounded-xl bg-slate-50 p-4"><h3 className="font-bold">Hồ sơ riêng tư gửi Admin</h3><p>{rightLabels[rightType]} · {files.length} chứng từ</p>{legalKeys.map(([key,label])=>state.legal[key]&&<p key={key} className="text-sm break-words">{label}: {dossierFieldDisplay(key,state.legal[key])}</p>)}</section><OwnerPrecheckPanel autoScan propertyId={draft.propertyId} draft={dossier()} selfService propertyFields={{name:state.name,address:state.address,city:state.city,district:state.district,ward:state.ward||null}}/><p className="text-sm text-amber-900">Gửi hồ sơ chưa công khai các phòng. Sau khi Admin duyệt, bạn chọn công khai từng căn. Tiền cọc do hai bên tự quản lý ngoài hệ thống.</p></>}
   <div className="flex flex-wrap gap-3 border-t pt-4">{state.step>0&&<button type="button" className={button} onClick={()=>void run(async()=>{await persist({...state,step:state.step-1});})}>Quay lại</button>}<button type="button" className={button} onClick={()=>void run(async()=>{await persist(state);})}>Lưu tiến trình</button><button type="submit" className={`${button} bg-brand-700 text-white`}>{busy?'Đang xử lý…':state.step===3?'Gửi hồ sơ kiểm duyệt':'Lưu và tiếp tục'}</button></div>
   </fieldset></form>
   {notice&&<p role={notice===documentWarning?'alert':'status'} className={notice===documentWarning?'rounded-lg bg-rose-50 p-3 text-sm font-medium text-red-700':'text-sm text-emerald-800'}>{notice}</p>}{error&&<div role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-800 text-sm">{error}<button className="ml-3 underline" onClick={()=>window.location.reload()}>Tải lại bản đã lưu</button></div>}
 </section>;
}
