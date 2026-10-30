import {useEffect,useRef,useState} from 'react';
import {QrCode,Upload,CheckCircle2} from 'lucide-react';
import {currentPaymentQr,scanPaymentQr,confirmPaymentQr,type PaymentQr} from '@/services/property/paymentQrService';
import {PrivatePaymentQr} from './PrivatePaymentQr';
interface Account {bank:string;accountNumber:string;accountHolderName:string}
export function OwnerPaymentQrPanel({fallback}:{fallback:Account|null}){
 const fileInput=useRef<HTMLInputElement>(null);
 const [preview,setPreview]=useState('');
 const [current,setCurrent]=useState<PaymentQr|null>(null),[draft,setDraft]=useState<PaymentQr|null>(null),[file,setFile]=useState<File|null>(null),[holder,setHolder]=useState('');
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[useAi,setUseAi]=useState(true),[consent,setConsent]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[revision,setRevision]=useState(0);
 useEffect(()=>{let active=true;setLoading(true);setError('');currentPaymentQr().then(q=>{if(active){setCurrent(q);setHolder(q?.accountHolderName??'');}}).catch(e=>{if(active)setError(e instanceof Error?e.message:'Không tải được QR.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[revision]);
 const selected=draft??current;const account=selected??fallback;
 useEffect(()=>{if(!file){setPreview('');return;}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url);},[file]);
 async function scan(source:File){if(busy)return;setError('');setNotice('');setBusy(true);setConsent(false);
 try{if(source.size>1000000)throw new Error('Ảnh QR tối đa 1 MB.');const q=await scanPaymentQr(source,useAi);setDraft(q);setHolder(q.accountHolderName??'');setNotice(q.aiStatus==='AI_SUGGESTED'?'AI đã gợi ý tên chủ tài khoản. Kiểm tra lại trước khi lưu.':q.accountHolderName?'Đã đọc thông tin từ QR. Kiểm tra lại trước khi lưu.':'Đã đọc ngân hàng và số tài khoản. Chưa đọc được tên; hãy nhập tên chủ tài khoản.');}
 catch(e){setError(e instanceof Error?e.message:'Không quét được QR.');}finally{setBusy(false);}}
 async function confirm(){if(!draft||busy||!consent)return;if(!holder.trim()){setError('Nhập tên chủ tài khoản trước khi xác nhận.');return;}setError('');setBusy(true);
 try{const q=await confirmPaymentQr(draft,holder.trim());setCurrent(q);setDraft(null);setConsent(false);setFile(null);setNotice('Đã lưu QR nhận tiền riêng của tài khoản chủ nhà.');}
 catch(e){setError(e instanceof Error?e.message:'Không lưu được QR.');}finally{setBusy(false);}}
 const input='mt-2 w-full border border-slate-300 rounded-lg p-3 bg-slate-50 text-sm';
 return <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5" aria-label="QR nhận tiền của chủ nhà">
 <div><h2 className="font-bold flex gap-2 items-center"><QrCode size={21} className="text-emerald-700"/>Tài khoản ngân hàng & QR của bạn</h2><p className="text-sm text-slate-500 mt-2">QR dùng chung cho các tài sản của tài khoản này. Chỉ QR đã xác nhận mới đưa vào hợp đồng mới; hợp đồng đã lưu giữ bản riêng.</p></div>
 {loading?<p role="status">Đang tải tài khoản nhận tiền...</p>:<div className="grid md:grid-cols-2 gap-7">
 <div className="space-y-4"><label className="block text-sm font-medium">Ngân hàng<input aria-label="Ngân hàng nhận tiền" readOnly value={account?.bank??''} className={input}/></label>
 <label className="block text-sm font-medium">Số tài khoản<input aria-label="Số tài khoản nhận tiền" readOnly value={account?.accountNumber??''} className={input}/></label>
 <label className="block text-sm font-medium">Tên chủ tài khoản<input aria-label="Tên chủ tài khoản nhận tiền" maxLength={200} readOnly={!draft} disabled={busy} value={draft?holder:account?.accountHolderName??''} onChange={e=>{setHolder(e.target.value);setConsent(false);}} className={input}/></label>
 {!selected&&<p className="text-xs text-slate-500">{fallback?'Đang hiển thị tài khoản từ hồ sơ tài sản. Tải QR riêng để dùng cho hợp đồng mới.':'Chưa có QR nhận tiền. Tải ảnh QR cá nhân không gắn số tiền.'}</p>}
 {draft&&<><p className="text-sm text-amber-800">Bản quét chưa được lưu làm tài khoản nhận tiền.{['AI_UNAVAILABLE','NOT_CONFIGURED','MISMATCH','NEEDS_MANUAL_INPUT'].includes(draft.aiStatus)?' AI chưa đọc chắc chắn tên tài khoản; hãy kiểm tra và nhập bổ sung.':''}</p><label className="flex gap-2 text-sm items-start"><input type="checkbox" checked={consent} disabled={busy} onChange={e=>setConsent(e.target.checked)}/>Tôi đã kiểm tra ngân hàng, số tài khoản, tên và QR đúng của mình.</label><button type="button" disabled={busy||!consent||!holder.trim()} onClick={()=>void confirm()} className="bg-emerald-600 text-white rounded-lg px-4 py-3 disabled:opacity-50 text-sm font-semibold">{busy?'Đang lưu...':'Xác nhận và lưu QR'}</button></>}
 </div><div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-4">
 {preview?<img src={preview} alt="Ảnh QR vừa chọn" className="max-w-full max-h-80 mx-auto object-contain rounded-lg"/>:selected?<PrivatePaymentQr path={'/api/v1/owner/payment-qr/'+encodeURIComponent(selected.id)+'/image'} alt="QR nhận tiền của chủ nhà"/>:<div className="p-7 text-center text-slate-400"><QrCode size={72} className="mx-auto mb-3"/>Chưa tải mã QR</div>}
 <label className="block text-sm font-medium">Ảnh QR cá nhân (PNG/JPEG, tối đa 1 MB)<input aria-label="Tải ảnh QR cá nhân" ref={fileInput} type="file" accept="image/png,image/jpeg" disabled={busy} onChange={e=>{const chosen=e.target.files?.[0];if(!chosen)return;setFile(chosen);setDraft(null);setConsent(false);setNotice('');void scan(chosen);}} className="block mt-2 w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-100 file:px-4 file:py-2 file:text-emerald-800 file:font-semibold"/></label>
 <label className="flex gap-2 items-start text-sm"><input type="checkbox" checked={useAi} disabled={busy} onChange={e=>setUseAi(e.target.checked)}/>Dùng AI đọc tên chủ tài khoản trên ảnh (ảnh sẽ được gửi đến Gemini).</label>
 <button type="button" disabled={busy} onClick={()=>{if(file)void scan(file);else fileInput.current?.click();}} className="bg-slate-900 text-white px-4 py-3 rounded-lg text-sm font-semibold disabled:opacity-50 flex gap-2 items-center"><Upload size={16}/>{busy?'Đang quét QR...':file?'Quét lại QR':'Tải QR và điền thông tin'}</button>
 <p className="text-xs text-slate-500">Bấm nút phía trên để chọn ảnh; hệ thống sẽ tự quét sau khi chọn. Ngân hàng và số tài khoản lấy trực tiếp từ mã QR, không lấy theo phỏng đoán AI. Dùng QR không có số tiền cố định; người thuê nhập số tiền và nội dung theo hóa đơn.</p>
 </div></div>}
 {error&&<p role="alert" className="text-rose-700 text-sm">{error}<button type="button" disabled={busy} className="underline ml-3" onClick={()=>setRevision(v=>v+1)}>Tải lại</button></p>}
 {notice&&<p role="status" className="text-emerald-700 text-sm flex items-center gap-2"><CheckCircle2 size={17}/>{notice}</p>}
 </section>;
}
