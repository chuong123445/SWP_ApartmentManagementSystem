import {useEffect,useState} from 'react';
import type {ReactNode} from 'react';
import {paymentApi,type InvoicePayment,type TestReceipt} from '@/services/payment/sepayService';
import {billingMoney} from '@/services/billing/billingService';
export function InvoicePaymentPanel({invoiceId,additional=false,fallback}:{invoiceId:string;additional?:boolean;fallback?:ReactNode}){
 const [data,setData]=useState<InvoicePayment|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);const [revision,setRevision]=useState(0);
 useEffect(()=>{const c=new AbortController();let inFlight=false;
  async function refresh(){if(inFlight||c.signal.aborted)return;inFlight=true;try{const p=additional?(await paymentApi<TestReceipt>(`/me/payments/sepay/test-payments/${invoiceId}`,'GET',undefined,c.signal)).payment:await paymentApi<InvoicePayment>(`/invoices/${invoiceId}/payment`,'GET',undefined,c.signal);if(!c.signal.aborted){setData(p);setError('');}}catch(e){if(!c.signal.aborted)setError(e instanceof Error?e.message:'Không thể tải thanh toán.');}finally{inFlight=false;}}
  void refresh();const timer=window.setInterval(()=>{if(document.visibilityState==='visible')void refresh();},10000);return()=>{c.abort();window.clearInterval(timer);};
 },[invoiceId,revision,additional]);
 async function generate(){if(busy||additional)return;setBusy(true);setError('');try{setData(await paymentApi<InvoicePayment>(`/invoices/${invoiceId}/payment`,'POST'));setRevision(v=>v+1);}catch(e){setError(e instanceof Error?e.message:'Không thể tạo mã QR.');}finally{setBusy(false);}}
 if(data?.status==='NOT_CONFIGURED'&&fallback)return <>{fallback}</>;
 return <section aria-label="Thanh toán hóa đơn" className="mt-6 border-t pt-5 space-y-3"><h2 className="font-bold text-lg">Thanh toán hóa đơn</h2>
 {error&&<p role="alert" className="text-rose-700">{error}</p>}
 {data?.status==='PAID'?<p role="status" className="rounded-xl p-4 bg-emerald-50 text-emerald-800">Đã thanh toán qua SePay{data.paidAt&&` · Ghi nhận ${new Date(data.paidAt).toLocaleString('vi-VN')}`}</p>:data?.status==='NOT_CONFIGURED'?<p className="text-amber-800">Chủ nhà chưa bật thanh toán SePay. Vui lòng liên hệ chủ nhà.</p>:<>
 {data?.qrUrl?<div className="space-y-2"><img src={data.qrUrl} alt="QR chuyển khoản hóa đơn SePay" referrerPolicy="no-referrer" className="w-72 max-w-full mx-auto rounded-lg"/><p>Ngân hàng: {data.bank}</p><p className="break-all">Tài khoản nhận: {data.accountNumber}</p><p>Chủ tài khoản: {data.accountHolderName}</p><p className="font-semibold">Số tiền: {billingMoney(data.amount??'0')}</p><p className="break-all">Nội dung: <strong>{data.paymentCode}</strong></p><p className="text-sm text-slate-600">Chuyển đúng số tiền và giữ nguyên nội dung. Trạng thái tự cập nhật khi nhận được webhook; quét QR không có nghĩa đã thanh toán.</p></div>:<button type="button" disabled={busy||!data} onClick={()=>void generate()} className="bg-emerald-700 text-white rounded-lg px-4 py-3 disabled:opacity-50">{busy?'Đang tạo QR...':'Hiển thị QR thanh toán SePay'}</button>}
 </>}
 <button type="button" onClick={()=>setRevision(v=>v+1)} className="block underline text-sm text-emerald-800">Kiểm tra trạng thái thanh toán</button>
 </section>;
}
