import { useEffect,useRef,useState } from 'react';
import { Save,Settings,Landmark,RefreshCw,CheckCircle2 } from 'lucide-react';
import { getPropertySettings,savePropertySettings,type PropertySettings,type SettingsInput } from '@/services/property/settingsService';
const fields=[['electricityUnitPrice','Giá điện (đ/kWh)'],['waterUnitPrice','Giá nước (đ/m³)'],['internetFee','Internet (đ/phòng/tháng)'],['garbageFee','Vệ sinh và rác (đ/phòng/tháng)']] as const;
const empty={waterBillingMode:'METERED' as 'METERED'|'PER_PERSON',electricityUnitPrice:'',waterUnitPrice:'',internetFee:'',garbageFee:''};
export function SettingsPage({propertyId,onDossier}:{propertyId:string;onDossier:(id:string)=>void}) {
 const [data,setData]=useState<PropertySettings|null>(null);const [form,setForm]=useState(empty);
 const [loading,setLoading]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[revision,setRevision]=useState(0);
 const current=useRef(propertyId);current.current=propertyId;const busy=useRef(false);
 useEffect(()=>{let active=true;setData(null);setError('');setNotice('');setForm(empty);if(propertyId==='all')return;
 setLoading(true);getPropertySettings(propertyId).then(d=>{if(active){setData(d);setForm({waterBillingMode:d.waterBillingMode??'METERED',electricityUnitPrice:d.electricityUnitPrice??'',waterUnitPrice:d.waterUnitPrice??'',internetFee:d.internetFee??'',garbageFee:d.garbageFee??''});}}).catch(e=>{if(active)setError(e instanceof Error?e.message:'Không tải được cài đặt.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[propertyId,revision]);
 async function save(e:React.FormEvent){e.preventDefault();if(!data||busy.current)return;setError('');setNotice('');
 if(fields.some(([key])=>!/^\d{1,13}(\.\d{1,2})?$/.test(form[key]))){setError('Nhập đủ đơn giá không âm, tối đa 2 chữ số thập phân.');return;}
 const id=propertyId;busy.current=true;setSaving(true);
 try{const d=await savePropertySettings(id,{...form,version:data.version} satisfies SettingsInput);if(current.current===id){setData(d);setNotice('Đã lưu cài đặt cho '+d.propertyName+'.');}}
 catch(e){if(current.current===id)setError(e instanceof Error?e.message:'Không lưu được cài đặt.');}
 finally{busy.current=false;setSaving(false);}}
 return <section className="space-y-6 pb-12" aria-label="Cài đặt đơn giá tài sản">
 <header className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-start gap-4"><div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl"><Settings size={23}/></div><div><h1 className="text-xl font-bold text-slate-900">Cài đặt đơn giá & tài khoản nhận tiền</h1><p className="text-sm text-slate-500 mt-2">{data?.propertyName??'Cấu hình riêng cho từng tài sản'}</p></div></header>
 {propertyId==='all'?<p className="bg-amber-50 text-amber-900 border border-amber-200 rounded-xl p-5">Chọn một tài sản ở thanh bên để xem và sửa cài đặt.</p>:<>
 {loading&&<p role="status">Đang tải cài đặt...</p>}
 {error&&<div role="alert" className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl">{error}<button type="button" disabled={saving} className="ml-3 underline" onClick={()=>setRevision(v=>v+1)}>Tải lại cài đặt</button></div>}
 {data&&!loading&&<form onSubmit={save} className="space-y-6">
 <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"><h2 className="font-bold mb-2">Đơn giá mặc định</h2><p className="text-sm text-slate-500 mb-5">Dùng làm gợi ý cho hợp đồng mới. Không thay đổi đơn giá trong hợp đồng đã ký hoặc hóa đơn cũ.</p>
 {!data.configured&&<p className="text-sm text-amber-800 mb-4">Tài sản chưa có cấu hình. Nhập đủ bốn khoản; nhập 0 nếu không thu phí.</p>}
 <label className="block text-sm font-medium mb-5">Cách tính tiền nước<select aria-label="Cách tính tiền nước" value={form.waterBillingMode} disabled={saving} onChange={e=>{setForm(f=>({...f,waterBillingMode:e.target.value as 'METERED'|'PER_PERSON'}));setNotice('');}} className="block mt-2 border border-slate-300 rounded-lg p-3"><option value="METERED">Theo chỉ số đồng hồ (m³)</option><option value="PER_PERSON">Theo người / tháng</option></select></label><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">{fields.map(([key,label])=><label key={key} className="text-sm font-medium text-slate-700">{key==='waterUnitPrice'&&form.waterBillingMode==='PER_PERSON'?'Giá nước (đ/người/tháng)':label}<input required type="number" min="0" max="9999999999999.99" step="0.01" value={form[key]} disabled={saving} onChange={e=>{setForm(f=>({...f,[key]:e.target.value}));setNotice('');}} className="mt-2 w-full rounded-lg border border-slate-300 p-3 bg-slate-50 focus:outline-emerald-600"/></label>)}</div></div>
 <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"><h2 className="font-bold flex gap-2 items-center"><Landmark size={20} className="text-emerald-700"/>Tài khoản nhận tiền đã duyệt</h2>
 {data.receivingAccount?<dl className="grid sm:grid-cols-3 gap-5 mt-5 text-sm">{[['Ngân hàng',data.receivingAccount.bank],['Số tài khoản',data.receivingAccount.accountNumber],['Chủ tài khoản',data.receivingAccount.accountHolderName]].map(([label,value])=><div key={label}><dt className="text-slate-500 mb-1">{label}</dt><dd className="font-semibold break-all">{value}</dd></div>)}</dl>:<p className="text-sm text-amber-800 mt-4">Chưa có tài khoản nhận tiền từ hồ sơ đã duyệt.</p>}
 <p className="text-sm text-slate-500 mt-5">Muốn đổi tài khoản, cập nhật hồ sơ tài sản để được xét duyệt. Hợp đồng đã ký giữ tài khoản đã lưu; QR thanh toán dùng thông tin của từng hóa đơn.</p><button type="button" onClick={()=>onDossier(propertyId)} className="text-emerald-700 font-semibold text-sm mt-3 underline">Xem hồ sơ tài sản</button></div>
 <div className="flex flex-wrap items-center justify-end gap-4">{notice&&<p role="status" className="text-emerald-700 text-sm flex items-center gap-2"><CheckCircle2 size={17}/>{notice}</p>}<button type="button" disabled={saving} onClick={()=>setRevision(v=>v+1)} className="border border-slate-300 rounded-lg px-4 py-3 text-sm flex gap-2 items-center"><RefreshCw size={16}/>Tải lại</button><button disabled={saving} type="submit" className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-lg px-5 py-3 text-sm flex gap-2 items-center"><Save size={17}/>{saving?'Đang lưu...':'Lưu thay đổi'}</button></div>
 </form>}</>}
 </section>;
}
