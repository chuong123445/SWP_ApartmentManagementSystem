import { useEffect,useRef,useState,type FormEvent } from 'react';
import { useNavigate,useSearchParams } from 'react-router';
import { evidenceLabels,rightLabels,type Dossier,type EvidenceFile,type EvidencePurpose } from '@/types/dossier';
import { uploadEvidence } from '@/services/property/dossierService';
import { uploadPropertyImages } from '@/services/property/propertyImageService';
import { precheckDossier } from '@/services/property/ownerPrecheckService';
import { extractListingDocument,finishListingDraft,getListingDraft,listListingDrafts,saveListingDraft,startListingDraft,type ListingDraft } from '@/services/property/listingDraftService';
import { acceptableSuggestion,blankListing,blankListingUnit,copyCommonTerms,legalFields,listingDossier,listingProperty,requiredEvidence,restoreListing,selectedListingUnits,type LegalKey,type ListingState,type Suggestion,type WizardUnit } from '@/utils/listingWizard';
import { OwnerPrecheckPanel } from '@/components/property/OwnerPrecheckPanel';
import { ApartmentImage } from '@/components/apartments/ApartmentImage';

const field='mt-1 w-full min-w-0 border border-slate-300 rounded-lg px-3 py-2 bg-white';
const button='rounded-lg border px-4 py-2 text-sm disabled:opacity-50';
const steps=['Giấy tờ','Xác nhận thông tin','Căn/phòng','Hình ảnh','Xem trước & gửi'];
export function PropertyListingWizard({rightType}:{rightType:Dossier['rightType']}){
 const navigate=useNavigate();const [query,setQuery]=useSearchParams();const draftId=query.get('draft');
 const [draft,setDraft]=useState<ListingDraft|null>(null);const [saved,setSaved]=useState<ListingDraft[]>([]);const [state,setState]=useState<ListingState>(blankListing);
 const [busy,setBusy]=useState(false);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [notice,setNotice]=useState('');const [scanIssues,setScanIssues]=useState<string[]>([]);
 const [requestKey]=useState(()=>crypto.randomUUID());const form=useRef<HTMLFormElement>(null);const mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 useEffect(()=>{let active=true;setLoading(true);setError('');(draftId?getListingDraft(draftId):listListingDrafts()).then(result=>{
   if(!active)return;if(Array.isArray(result)){setSaved(result.filter(d=>d.rightType===rightType));setDraft(null);}else{if(result.rightType!==rightType)throw new Error('Loại quyền không khớp bản nháp.');if(result.completed){navigate('/account/rental-properties',{replace:true});return;}setDraft(result);setState(restoreListing(result.payload));}
 }).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[draftId,rightType,navigate]);
 const change=(next:Partial<ListingState>)=>{setState(s=>({...s,...next}));setNotice('Có thay đổi chưa lưu.');};
 const updateUnit=(key:string,values:Partial<WizardUnit>)=>{change({units:state.units.map(u=>u.key===key?{...u,...values}:u)});};
 const fail=(e:unknown)=>setError(e instanceof Error?e.message:'Không thể thực hiện. Vui lòng thử lại.');
 const run=async(work:()=>Promise<void>)=>{if(busy)return;setBusy(true);setError('');try{await work();}catch(e){if(mounted.current)fail(e);}finally{if(mounted.current)setBusy(false);}};
 const persist=async(next:ListingState,current=draft)=>{if(!current)return;const result=await saveListingDraft(current,next);if(mounted.current){setDraft(result);setState(next);setNotice('Đã lưu tiến trình. Bạn có thể quay lại sau.');}return result;};
 const files=(draft?.files??[]).filter(f=>!state.excludedFiles.includes(f.id));const units=selectedListingUnits(state);
 const legalKeys=legalFields.filter(([key])=>rightType==='OWNERSHIP'?key.startsWith('certificate'):rightType==='AUTHORIZATION'?!key.startsWith('originalLease'):true);
 const dossier=()=>listingDossier(state,draft?.files??[],rightType,draft?.propertyVersion??0);
 const scan=()=>run(async()=>{
   if(!draft||!files.length)throw new Error('Tải ít nhất một chứng từ để đọc.');
   setScanIssues([]);const input=dossier();const base=await precheckDossier(draft.propertyId,input,{},undefined,true);const suggestions:Suggestion[]=[];const issues:string[]=[];
   for(const file of files){try{const result=await extractListingDocument(draft.propertyId,input,file.id,base.sourceHash);
     if(result.review?.readable)for(const item of result.review.extractedFields){if((item.field==='propertyAddress'||legalFields.some(([key])=>key===item.field))&&acceptableSuggestion(item.field,item.value))suggestions.push({...item,fileId:file.id,filename:file.filename});}
     for(const finding of result.review?.findings??[])issues.push(`${file.filename}: ${finding.message}`);
   }catch(e){issues.push(`${file.filename}: ${e instanceof Error?e.message:'Chưa đọc được.'}`);}}
   if(!mounted.current)return;setScanIssues(issues);await persist({...state,suggestions,confirmed:false});
   if(!suggestions.length)setNotice('Chưa có dữ liệu đủ rõ để điền giúp. Bạn có thể nhập tay ở bước tiếp theo.');
 });
 const upload=async(purpose:EvidencePurpose,chosen:File[])=>{
   if(!draft||!chosen.length)return;if(files.length+chosen.length>20)throw new Error('Hồ sơ tối đa 20 tệp.');
   let current=draft;
   for(const file of chosen){const result=await uploadEvidence(draft.propertyId,purpose,file,true);current={...current,files:[...current.files,result]};setDraft(current);}
   await persist({...state,confirmed:false},current);
 };
 const photos=async(chosen:File[],key?:string)=>{
   if(!chosen.length)return;const ids=await uploadPropertyImages(chosen);
   await persist(key?{...state,units:state.units.map(u=>u.key===key?{...u,imageIds:ids}:u)}:{...state,imageIds:ids});
 };
 const conflicts=legalFields.filter(([key])=>new Set(state.suggestions.filter(item=>item.field===key&&files.some(file=>file.id===item.fileId)).map(item=>item.value.trim().normalize('NFC').toLocaleLowerCase('vi'))).size>1);
 const changePhotos=(key:string|undefined,ids:string[])=>change(key?{units:state.units.map(unit=>unit.key===key?{...unit,imageIds:ids}:unit)}:{imageIds:ids});
 const apply=(item:Suggestion)=>{
   if(item.field==='propertyAddress')change({address:item.value,confirmed:false});
   else change({legal:{...state.legal,[item.field]:item.value},confirmed:false});
 };
 const validate=()=>{
   if(!form.current?.reportValidity())return false;
   if(state.step===0&&requiredEvidence(rightType).some(p=>!files.some(f=>f.purpose===p)))throw new Error('Cần đủ loại giấy tờ bắt buộc trước khi tiếp tục. Có thể lưu nháp để bổ sung sau.');
   if(state.step===1){const l=state.legal;
     if(rightType!=='OWNERSHIP'&&(l.rightsValidUntil<l.rightsValidFrom||!l.rightsValidFrom||!l.rightsValidUntil))throw new Error('Thời hạn quyền cho thuê không hợp lệ.');
     if(rightType==='SUBLEASE'&&(l.rightsValidFrom<l.originalLeaseFrom||l.rightsValidUntil>l.originalLeaseUntil||!l.originalLeaseFrom||!l.originalLeaseUntil))throw new Error('Thời hạn cho thuê lại phải nằm trong hợp đồng gốc.');
     if(!state.confirmed)throw new Error('Vui lòng xác nhận đã đối chiếu thông tin với giấy tờ.');
   }
   if(state.step===2){if(!units.length)throw new Error('Chọn ít nhất một phòng.');if(new Set(units.map(u=>u.roomNumber.trim().toLowerCase())).size!==units.length)throw new Error('Mã phòng bị trùng.');}
   if(state.step===3&&(!state.imageIds.length||units.some(u=>!u.imageIds.length)))throw new Error('Cần ảnh chung và ít nhất một ảnh cho từng căn/phòng đã chọn.');
   return true;
 };
 const next=(event:FormEvent)=>{event.preventDefault();void run(async()=>{if(!validate())return;if(state.step<4){await persist({...state,step:state.step+1});return;}
   if(!draft)return;await finishListingDraft(draft,listingProperty(state),dossier());navigate('/account/rental-properties');
 });};
 if(loading)return <p role="status">Đang tải bản nháp...</p>;
 if(!draft)return <section className="border bg-white rounded-2xl p-5 space-y-4"><h2 className="text-xl font-bold">{rightLabels[rightType]} — Chuẩn bị hồ sơ</h2><p>Tải giấy tờ trước, xác nhận thông tin rồi chọn các căn/phòng muốn cho thuê.</p>
   {saved.length>0&&<div className="space-y-2"><h3 className="font-semibold">Tiếp tục bản nháp</h3>{saved.map(d=><button key={d.propertyId} className={`${button} block w-full text-left`} onClick={()=>setQuery({...Object.fromEntries(query),draft:d.propertyId})}>{restoreListing(d.payload).name||'Hồ sơ đang chuẩn bị'} · {d.files.length} chứng từ</button>)}</div>}
   <button disabled={busy} className={`${button} bg-emerald-700 text-white`} onClick={()=>void run(async()=>{const result=await startListingDraft(requestKey,rightType);setQuery({...Object.fromEntries(query),draft:result.propertyId});})}>Bắt đầu hồ sơ mới</button>{error&&<p role="alert">{error}</p>}</section>;
 return <section className="border bg-white rounded-2xl p-4 md:p-6 space-y-5 min-w-0">
   <ol aria-label="Tiến trình đăng tải" className="flex flex-wrap gap-2 text-sm">{steps.map((label,index)=><li key={label} aria-current={state.step===index?'step':undefined} className={`rounded-lg px-3 py-2 ${state.step===index?'bg-emerald-700 text-white':'bg-slate-100'}`}>{index+1}. {label}</li>)}</ol>
   <p className="text-sm text-slate-600">{rightLabels[rightType]} · Bản nháp #{draft.propertyId} · Chỉ bạn xem được trong lúc chuẩn bị.</p>
   <form ref={form} onInvalidCapture={event=>{(event.target as HTMLElement).closest("details")?.setAttribute("open","");}} onSubmit={next} className="space-y-5"><fieldset disabled={busy} className="space-y-5 min-w-0">
   {state.step===0&&<><h2 className="text-xl font-bold">Giấy tờ quyền cho thuê</h2><p>PDF/JPEG/PNG, tối đa 10 MB/tệp và 20 tệp. Giấy tờ được lưu riêng tư, không dùng làm ảnh quảng cáo.</p>
     {[...requiredEvidence(rightType),'SUPPORTING' as EvidencePurpose].map(p=><label key={p} className="block border rounded-lg p-3 text-sm">{evidenceLabels[p]}{p!=='SUPPORTING'?' *':''}<input className="block mt-2 w-full" type="file" multiple accept="application/pdf,image/png,image/jpeg" onChange={e=>{const chosen=Array.from(e.target.files??[]);e.target.value='';void run(()=>upload(p,chosen));}}/></label>)}
     <ul className="space-y-2">{files.map(f=><li key={f.id} className="flex justify-between gap-3 text-sm"><span className="break-all">{f.filename} · {evidenceLabels[f.purpose]}</span><button type="button" className="shrink-0 underline" onClick={()=>void run(async()=>{await persist({...state,excludedFiles:[...state.excludedFiles,f.id],suggestions:state.suggestions.filter(s=>s.fileId!==f.id),confirmed:false});})}>Bỏ</button></li>)}</ul>
     <div className="rounded-xl bg-emerald-50 p-4 space-y-3"><h3 className="font-semibold">Đọc giấy tờ để điền giúp</h3><p className="text-sm">Bấm nút bên dưới sẽ gửi các tệp đã chọn đến Gemini. Bạn kiểm tra và chọn từng giá trị trước khi dùng. Có thể tiếp tục nhập tay.</p><button type="button" className={button} onClick={scan}>AI đọc giấy tờ</button><p className="text-sm">{state.suggestions.length} giá trị gợi ý. Xem và xác nhận ở bước tiếp theo.</p>{scanIssues.map((s,i)=><p key={i} className="text-sm text-amber-900 break-words">{s}</p>)}</div>
   </>}
   {state.step===1&&<><h2 className="text-xl font-bold">Xác nhận tài sản và quyền cho thuê</h2>
     {conflicts.length>0&&<p role="status" className="text-sm text-amber-900">Các tệp có giá trị khác nhau cho {conflicts.map(([,label])=>label).join(", ")}. Đối chiếu bản gốc trước khi chọn.</p>}
     {state.suggestions.length>0&&<div className="space-y-2 rounded-xl bg-emerald-50 p-3"><h3 className="font-semibold">Dữ liệu đọc được — chọn để điền</h3><p className="text-sm">Nếu các tệp có giá trị khác nhau, đối chiếu bản gốc rồi chọn giá trị đúng. Bấm “Dùng giá trị này” sẽ thay nội dung trường tương ứng.</p>{state.suggestions.filter(s=>files.some(f=>f.id===s.fileId)).map((s,i)=><div key={i} className="border rounded-lg bg-white p-3 text-sm break-words"><strong>{s.field==='propertyAddress'?'Địa chỉ':legalFields.find(([key])=>key===s.field)?.[1]}: {s.value}</strong><p>Nguồn: {s.filename}{s.page?` · trang ${s.page}`:''}</p><button type="button" className="text-emerald-800 underline" onClick={()=>apply(s)}>Dùng giá trị này</button></div>)}</div>}
     <div className="grid sm:grid-cols-2 gap-3">{([['name','Tên tài sản',150],['address','Địa chỉ tài sản',300],['city','Tỉnh/Thành phố',80],['district','Quận/Huyện/Khu vực',80],['ward','Phường/Xã',80]] as const).map(([key,label,max])=><label key={key} className="text-sm">{label}{key!=='ward'?' *':''}<input className={field} required={key!=='ward'} maxLength={max} value={state[key]} onChange={e=>change({[key]:e.target.value,confirmed:false})}/></label>)}</div>
     <div className="grid sm:grid-cols-2 gap-3">{legalKeys.map(([key,label])=>{const date=/Date$|From$|Until$/.test(key);const certificate=key.startsWith('certificate');const required=certificate?Object.entries(state.legal).some(([k,v])=>k.startsWith('certificate')&&v!==''):true;return <label key={key} className="text-sm">{label}{required?' *':''}<input className={field} type={date?'date':'text'} required={required} pattern={key==='principalDocumentNumber'?'[0-9]{12}':undefined} maxLength={key==='principalDocumentNumber'?12:key==='certificateIssuePlace'?200:100} value={state.legal[key]} onChange={e=>change({legal:{...state.legal,[key]:e.target.value},confirmed:false})}/></label>;})}</div>
     <p className="text-sm text-slate-500">Giấy chứng nhận là nhóm tùy chọn: nếu nhập, cần đủ số, ngày và nơi cấp. Diện tích đất không thay thế diện tích phòng.</p>
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
       <label className="text-sm sm:col-span-2">Mô tả phòng<textarea className={field} rows={3} maxLength={3000} value={u.description} onChange={e=>updateUnit(u.key,{description:e.target.value})}/></label>
       </div></details>}
       {index===0&&state.rentalMode==='MULTI_UNIT'&&<button type="button" className={button} onClick={()=>change({units:state.units.map((target,i)=>i&&target.selected?copyCommonTerms(u,target):target)})}>Áp dụng điện, nước, cọc, số người và tiện ích cho phòng đã chọn</button>}
     </section>)}
     {state.rentalMode==='MULTI_UNIT'&&<button type="button" disabled={state.units.length>=50} className={button} onClick={()=>change({units:[...state.units,blankListingUnit()]})}>Thêm phòng</button>}
   </>}
   {state.step===3&&<><h2 className="text-xl font-bold">Ảnh chung và ảnh từng phòng</h2><p className="text-sm">Mỗi nhóm từ 1 đến 4 ảnh JPEG/PNG, tối đa 5 MB/ảnh. Ảnh đầu là ảnh đại diện. Chọn lại để thay nhóm ảnh.</p>
     {[{key:undefined,label:'Ảnh chung: mặt tiền, lối đi, khu vực chung',ids:state.imageIds},...units.map(u=>({key:u.key,label:`Ảnh riêng căn/phòng ${u.roomNumber}`,ids:u.imageIds}))].map(group=><section key={group.key??'common'} className="border rounded-xl p-3 space-y-3"><label className="block text-sm font-semibold">{group.label}<input className="block mt-2 w-full text-sm" type="file" multiple accept="image/png,image/jpeg" onChange={e=>{const chosen=Array.from(e.target.files??[]);e.target.value='';void run(()=>photos(chosen,group.key));}}/></label><div className="flex flex-wrap gap-2">{group.ids.map(id=><div key={id} className="space-y-1"><ApartmentImage src={`/api/v1/property-images/${id}`} alt={group.label} className="w-28 h-24 object-cover rounded-lg"/><button type="button" className="block text-xs underline" onClick={()=>changePhotos(group.key,[id,...group.ids.filter(other=>other!==id)])}>Đặt đại diện</button><button type="button" className="block text-xs underline text-rose-700" onClick={()=>changePhotos(group.key,group.ids.filter(other=>other!==id))}>Bỏ ảnh</button></div>)}</div></section>)}
   </>}
   {state.step===4&&<><h2 className="text-xl font-bold">Kiểm tra trước khi gửi</h2><section className="border rounded-xl p-4 space-y-2"><h3 className="font-bold">Nội dung khách thuê sẽ thấy sau khi công khai</h3><p>{state.name} · {state.address}</p>{units.map(u=><div key={u.key} className="border-t pt-2"><strong>{u.roomNumber} · {u.areaM2} m² · {Number(u.advertisedMonthlyRent).toLocaleString('vi-VN')} đ/tháng</strong><p className="text-sm break-words">{u.description}</p><p className="text-sm">{u.imageIds.length} ảnh riêng · {u.amenities.join(', ')}</p></div>)}</section><section className="rounded-xl bg-slate-50 p-4"><h3 className="font-bold">Hồ sơ riêng tư gửi Admin</h3><p>{rightLabels[rightType]} · {files.length} chứng từ</p>{legalKeys.map(([key,label])=>state.legal[key]&&<p key={key} className="text-sm break-words">{label}: {state.legal[key]}</p>)}</section><OwnerPrecheckPanel propertyId={draft.propertyId} draft={dossier()} selfService propertyFields={{name:state.name,address:state.address,city:state.city,district:state.district,ward:state.ward||null}}/><p className="text-sm text-amber-900">Gửi hồ sơ chưa công khai các phòng. Sau khi Admin duyệt, bạn chọn công khai từng căn. Tiền cọc do hai bên tự quản lý ngoài hệ thống.</p></>}
   <div className="flex flex-wrap gap-3 border-t pt-4">{state.step>0&&<button type="button" className={button} onClick={()=>void run(async()=>{await persist({...state,step:state.step-1});})}>Quay lại</button>}<button type="button" className={button} onClick={()=>void run(async()=>{await persist(state);})}>Lưu tiến trình</button><button type="submit" className={`${button} bg-emerald-700 text-white`}>{busy?'Đang xử lý…':state.step===4?'Gửi hồ sơ kiểm duyệt':'Lưu và tiếp tục'}</button></div>
   </fieldset></form>
   {notice&&<p role="status" className="text-sm text-emerald-800">{notice}</p>}{error&&<div role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-800 text-sm">{error}<button className="ml-3 underline" onClick={()=>window.location.reload()}>Tải lại bản đã lưu</button></div>}
 </section>;
}
