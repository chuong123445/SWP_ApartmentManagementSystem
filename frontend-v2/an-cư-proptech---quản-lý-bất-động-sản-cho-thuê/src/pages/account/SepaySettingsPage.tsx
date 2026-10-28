import {useEffect,useState} from 'react';
import {Link} from 'react-router';
import {AccountLayout} from '@/layouts/AccountLayout';
import {useAuth} from '@/hooks/useAuth';
import {paymentApi,type SepayConfig,type SepayEvent} from '@/services/payment/sepayService';
const input='block w-full border rounded-lg p-3 mt-1';
const button='border border-emerald-300 text-emerald-800 rounded-lg px-4 py-2 disabled:opacity-50';
const results:Record<string,string>={MATCHED:'Đã khớp hóa đơn',AMOUNT_MISMATCH:'Sai số tiền — cần đối soát',ACCOUNT_MISMATCH:'Sai tài khoản / VA',UNMATCHED:'Không tìm thấy mã hóa đơn',ALREADY_PAID:'Hóa đơn đã được thanh toán',IGNORED_OUTGOING:'Bỏ qua tiền ra',DISABLED:'Kết nối đã tắt',INVOICE_NOT_SENT:'Hóa đơn chưa được gửi'};
export function SepaySettingsPage(){
 const {user}=useAuth();const [config,setConfig]=useState<SepayConfig|null>(null);const [events,setEvents]=useState<SepayEvent[]>([]);
 const [apiToken,setApiToken]=useState(''),[bankId,setBankId]=useState(''),[vaId,setVaId]=useState('');const [banks,setBanks]=useState<{id:string;bank:string;accountNumber:string;accountHolderName:string}[]>([]);const [vas,setVas]=useState<{id:string;number:string}[]>([]);const [bankPage,setBankPage]=useState(1),[hasMoreBanks,setHasMoreBanks]=useState(false);const [vaPage,setVaPage]=useState(1),[hasMoreVas,setHasMoreVas]=useState(false);const [enabled,setEnabled]=useState(true);
 const [secret,setSecret]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState('');const [busy,setBusy]=useState(false);const [revision,setRevision]=useState(0);const [rotateConfirm,setRotateConfirm]=useState(false);
 useEffect(()=>{const c=new AbortController();if(!user?.roles.includes('OWNER'))return;
  setError('');Promise.all([paymentApi<SepayConfig>('/owner/payments/sepay','GET',undefined,c.signal),paymentApi<SepayEvent[]>('/owner/payments/sepay/events','GET',undefined,c.signal)])
   .then(([data,list])=>{if(c.signal.aborted)return;setConfig(data);setEnabled(!data.configured||data.enabled);setEvents(list);})
   .catch(e=>{if(!c.signal.aborted)setError(e.message);});return()=>c.abort();
 },[user?.id,revision]);
 async function save(rotate=false){if(busy||!config)return;setBusy(true);setError('');setNotice('');try{
  const data=await paymentApi<SepayConfig>(`/owner/payments/sepay${rotate?'/rotate-key':''}`,rotate?'POST':'PUT',rotate?{version:config.version}:{apiToken,bankAccountId:bankId,virtualAccountId:vaId||null,enabled,version:config.version});
  setConfig(data);if(!rotate){setApiToken('');setBanks([]);setVas([]);setBankId('');setVaId('');}if(data.webhookSecret)setSecret(data.webhookSecret);setRotateConfirm(false);setNotice(rotate?'Đã đổi khóa. Cập nhật ngay khóa mới trên SePay.':'Đã lưu cấu hình. Cần thiết lập webhook trên SePay và kiểm tra kết nối.');
 }catch(e){setError(e instanceof Error?e.message:'Không thể lưu cấu hình.');}finally{setBusy(false);}}
 async function toggle(){if(busy||!config)return;setBusy(true);setError('');try{const data=await paymentApi<SepayConfig>('/owner/payments/sepay/status','PATCH',{enabled:!config.enabled,version:config.version});setConfig(data);setEnabled(data.enabled);setNotice(data.enabled?'Đã bật nhận thanh toán.':'Đã tạm dừng nhận thanh toán tự động.');}catch(e){setError(e instanceof Error?e.message:'Không thể cập nhật.');}finally{setBusy(false);}}
 async function loadBanks(page=1){if(busy)return;setBusy(true);setError('');try{const data=await paymentApi<{items:typeof banks;page:number;hasMore:boolean}>('/owner/payments/sepay/bank-accounts','POST',{apiToken,page});setBanks(data.items);setBankPage(data.page);setHasMoreBanks(data.hasMore);setBankId(data.items.length===1&&!data.hasMore&&page===1?data.items[0].id:'');setVaId('');setVas([]);if(!data.items.length)setNotice('Không có tài khoản ngân hàng đang hoạt động trên SePay.');}catch(e){setError(e instanceof Error?e.message:'Không thể đọc tài khoản.');}finally{setBusy(false);}}
 async function loadVas(page=1){if(busy||!bankId)return;setBusy(true);setError('');try{const data=await paymentApi<{items:typeof vas;page:number;hasMore:boolean}>('/owner/payments/sepay/virtual-accounts','POST',{apiToken,bankAccountId:bankId,page});setVas(data.items);setVaPage(data.page);setHasMoreVas(data.hasMore);setVaId(data.items.length===1?data.items[0].id:'');if(!data.items.length)setNotice('Chưa có VA chính thức, tĩnh đang hoạt động. Tạo VA trên SePay nếu ngân hàng yêu cầu.');}catch(e){setError(e instanceof Error?e.message:'Không thể đọc VA.');}finally{setBusy(false);}}
 async function copy(value:string){try{await navigator.clipboard.writeText(value);setNotice('Đã sao chép.');}catch{setError('Không thể sao chép tự động. Bạn có thể chọn và sao chép nội dung bên dưới.');}}
 return <AccountLayout><h1 className="text-2xl font-bold mb-5">Thanh toán SePay</h1>{!user?.roles.includes('OWNER')?<p>Chức năng dành cho chủ cho thuê.</p>:<div className="space-y-5">
  <p>Chủ nhà liên kết ngân hàng trên SePay, sau đó nhập API Token để ứng dụng đọc tài khoản nhận tiền. Không nhập lại thông tin ngân hàng.</p>
  {error&&<p role="alert" className="text-rose-700 break-words">{error}</p>}{notice&&<p role="status" className="text-emerald-800">{notice}</p>}
  <button type="button" disabled={busy} onClick={()=>setRevision(v=>v+1)} className={button}>Tải lại cấu hình và lịch sử</button>
  {!config&&!error&&<p role="status">Đang tải cấu hình...</p>}
  {config&&<><form onSubmit={e=>{e.preventDefault();void save();}} className="border rounded-xl p-5 space-y-4 bg-white"><h2 className="font-bold text-lg">Tài khoản nhận tiền</h2>
   {config.configured&&<p className="text-sm break-words">{config.enabled?'Đang nhận qua':'Đã tạm dừng'} {config.bank} · {config.virtualAccount??config.accountNumber} · {config.accountHolderName}</p>}
   {config.configured&&<button type="button" disabled={busy} className={button} onClick={()=>void toggle()}>{config.enabled?'Tạm dừng nhận thanh toán':'Bật lại nhận thanh toán'}</button>}
   <fieldset disabled={busy} className="space-y-4">
   <label className="block">API Token SePay<input type="password" required autoComplete="off" maxLength={4096} value={apiToken} onChange={e=>{setApiToken(e.target.value);setBanks([]);setBankId('');setVas([]);setVaId('');}} className={input}/></label>
   <p className="text-sm text-slate-600">Tạo token tại SePay → Cấu hình Công ty → API Access. Token chỉ dùng để đọc khi thiết lập; không lưu vào localStorage/cookie hoặc database. Không nhập mật khẩu ngân hàng.</p>
   <button type="button" disabled={!apiToken||busy} onClick={()=>void loadBanks()} className={button}>Lấy tài khoản từ SePay</button>
   {banks.length>0&&<><div><label htmlFor="sepay-bank" className="block">Tài khoản ngân hàng nhận tiền</label><select id="sepay-bank" required value={bankId} onChange={e=>{setBankId(e.target.value);setVas([]);setVaId('');}} className={input}><option value="">Chọn tài khoản</option>{banks.map(b=><option key={b.id} value={b.id}>{b.bank} · {b.accountNumber} · {b.accountHolderName}</option>)}</select></div>{banks.length===1&&!hasMoreBanks&&bankPage===1&&<p className="text-sm text-emerald-800">Đã tự chọn tài khoản ngân hàng duy nhất.</p>}
   <div className="flex flex-wrap gap-2">{bankPage>1&&<button type="button" className={button} onClick={()=>void loadBanks(bankPage-1)}>Trang tài khoản trước</button>}{hasMoreBanks&&<button type="button" className={button} onClick={()=>void loadBanks(bankPage+1)}>Trang tài khoản sau</button>}</div>
   {bankId&&<><button type="button" onClick={()=>void loadVas()} className={button}>Lấy VA đã tạo trên SePay</button><p className="text-sm text-slate-600">BIDV cá nhân, OCB, MSB và KienLongBank cần VA. Các ngân hàng khác có thể dùng tài khoản gốc. VietinBank tự thêm SEVQR trong nội dung QR.</p></>}
   {vas.length>0&&<div><label htmlFor="sepay-va" className="block">VA nhận tiền</label><select id="sepay-va" value={vaId} onChange={e=>setVaId(e.target.value)} className={input}><option value="">Dùng tài khoản gốc nếu ngân hàng cho phép</option>{vas.map(v=><option key={v.id} value={v.id}>{v.number}</option>)}</select></div>}
   <div className="flex flex-wrap gap-2">{vaPage>1&&<button type="button" className={button} onClick={()=>void loadVas(vaPage-1)}>Trang VA trước</button>}{hasMoreVas&&<button type="button" className={button} onClick={()=>void loadVas(vaPage+1)}>Trang VA sau</button>}</div>
   <label className="flex gap-2 items-center"><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/>Bật nhận thanh toán SePay</label>
   <p className="text-sm text-slate-600">QR đã cấp giữ nguyên thông tin nhận tiền lúc tạo, kể cả sau khi đổi tài khoản nhận.</p>
   <button disabled={!bankId||busy} className={`${button} bg-emerald-700 text-white`}>{busy?'Đang lưu...':'Lưu cấu hình SePay'}</button></>}
   </fieldset></form>
   {config.configured&&<section className="border rounded-xl p-5 space-y-4 bg-white"><h2 className="font-bold text-lg">Cấu hình webhook trên SePay</h2>
    <p className="text-sm">Chọn Có tiền vào, đúng tài khoản ngân hàng / VA và phương thức bảo mật API Key. Cấu hình tiền tố mã thanh toán ANCU nếu dùng tính năng bóc tách mã.</p>
    {config.webhookUrl?<div><label htmlFor="sepay-url" className="font-semibold">URL nhận thông báo thanh toán</label><input id="sepay-url" readOnly value={config.webhookUrl} className={`${input} text-sm`}/><button type="button" className={`${button} mt-2`} onClick={()=>void copy(config.webhookUrl!)}>Sao chép URL webhook</button></div>:<p className="text-amber-800">Chưa có URL HTTPS công khai. Quản trị viên cần cấu hình APP_PUBLIC_BASE_URL rồi khởi động lại Backend. localhost không nhận được webhook từ SePay.</p>}
    {secret?<div><label htmlFor="sepay-secret" className="font-semibold">Khóa webhook — chỉ hiển thị trong phiên này</label><input id="sepay-secret" type="password" readOnly value={secret} className={input}/><button type="button" className={`${button} mt-2`} onClick={()=>void copy(secret)}>Sao chép khóa webhook</button><button type="button" className={`${button} ml-2 mt-2`} onClick={()=>setSecret('')}>Ẩn khóa</button></div>:<p className="text-sm">Khóa không được trả lại khi tải trang. Nếu chưa lưu khóa, hãy đổi khóa và cập nhật trên SePay.</p>}
    <button type="button" disabled={busy} className={button} onClick={()=>setRotateConfirm(true)}>Đổi khóa webhook</button>
    {rotateConfirm&&<div className="rounded-lg bg-amber-50 p-3 space-y-2"><p>Khóa cũ sẽ ngừng hoạt động. Bạn cần cập nhật khóa mới trên SePay.</p><button type="button" disabled={busy} className={button} onClick={()=>void save(true)}>Xác nhận đổi khóa</button><button type="button" className={`${button} ml-2`} onClick={()=>setRotateConfirm(false)}>Hủy</button></div>}
    <p className="text-sm">{config.lastWebhookAt?`Đã nhận webhook gần nhất: ${new Date(config.lastWebhookAt).toLocaleString('vi-VN')}`:'Chưa nhận được webhook. Lưu cấu hình chưa chứng minh kết nối thành công.'}</p>
    <p className="text-sm text-slate-600">Gửi thử dùng mã giả để kiểm tra kết nối; không dùng mã hóa đơn thật. Sau đó kiểm tra một giao dịch thật. Chuyển thiếu/thừa tiền không tự hoàn tất hóa đơn và cần chủ nhà đối soát.</p>
    <a className="underline text-emerald-800" href="https://docs.sepay.vn/tich-hop-webhooks.html" target="_blank" rel="noreferrer">Hướng dẫn webhook SePay</a>
   </section>}
  </>}
  <section className="border rounded-xl p-5 space-y-3 bg-white"><h2 className="font-bold text-lg">20 thông báo giao dịch gần nhất</h2>{!events.length&&<p className="text-sm">Chưa có thông báo.</p>}{events.map(e=><article key={e.transactionId} className="border-t pt-3 text-sm break-words"><p className="font-semibold">{results[e.result]??e.result}</p><p>Giao dịch {e.transactionId} · {Number(e.amount).toLocaleString('vi-VN')} đ {e.invoiceId&&`· Hóa đơn ${e.invoiceId}`}</p><p>{new Date(e.receivedAt).toLocaleString('vi-VN')}</p></article>)}</section>
  <Link to="/account/settings" className="inline-block underline text-emerald-800">Quay lại cài đặt</Link>
 </div>}</AccountLayout>;
}
