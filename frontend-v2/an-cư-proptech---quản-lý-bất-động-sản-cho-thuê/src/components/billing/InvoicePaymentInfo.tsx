import {PrivatePaymentQr} from './PrivatePaymentQr';
import { useEffect,useState } from 'react';
import { Landmark,Copy,RefreshCw } from 'lucide-react';
import { getContract } from '@/services/contract/contractService';
import { billingMoney } from '@/services/billing/billingService';
import type { BillingInvoice } from '@/types/billing';
import type { ContractDraft } from '@/types/contract';

export function InvoicePaymentInfo({invoice}:{invoice:BillingInvoice}){
  const [contract,setContract]=useState<ContractDraft|null>(null);
  const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [revision,setRevision]=useState(0);const [notice,setNotice]=useState('');
  useEffect(()=>{
    let active=true;setContract(null);setLoading(true);setError('');setNotice('');
    getContract(invoice.contractId).then(data=>{if(active)setContract(data);}).catch(()=>{if(active)setError('Chưa tải được thông tin thanh toán từ hợp đồng.');}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[invoice.contractId,revision]);
  const account=contract?.snapshot.receivingAccount;
  const hasBank=!!account?.bank?.trim()&&!!account?.accountNumber?.trim()&&!!account?.accountHolderName?.trim();
  return <section className="op-panel p-5 sm:p-6 space-y-4" aria-label="Thông tin thanh toán">
    <h2 className="font-bold flex items-center gap-2"><Landmark size={19} className="text-emerald-700"/>Thông tin thanh toán</h2>
    {loading&&<p role="status" className="text-sm text-slate-500">Đang tải tài khoản nhận tiền theo hợp đồng...</p>}
    {error&&<div className="text-sm text-amber-800"><p role="alert">{error}</p><button onClick={()=>setRevision(v=>v+1)} className="op-link mt-2"><RefreshCw size={13}/>Thử lại</button></div>}
    {!loading&&!error&&<>
      <p className="text-sm text-slate-500">Phương thức theo hợp đồng: {contract?.paymentMethod||'Chưa có thông tin'}.</p>
      {hasBank&&account?<dl className="grid sm:grid-cols-2 gap-5 text-sm">
        <div><dt className="text-xs text-slate-500 mb-1">Ngân hàng</dt><dd className="font-semibold">{account.bank}</dd></div>
        <div><dt className="text-xs text-slate-500 mb-1">Chủ tài khoản</dt><dd className="font-semibold">{account.accountHolderName}</dd></div>
        <div><dt className="text-xs text-slate-500 mb-1">Số tài khoản</dt><dd className="font-semibold flex gap-3 items-center break-all">{account.accountNumber}<button aria-label="Sao chép số tài khoản" className="op-link" onClick={async()=>{try{await navigator.clipboard.writeText(account.accountNumber);setNotice('Đã sao chép số tài khoản.');}catch{setNotice('Không thể sao chép tự động. Bạn có thể chép số tài khoản ở trên.');}}}><Copy size={14}/></button></dd></div>
        <div><dt className="text-xs text-slate-500 mb-1">Số tiền hóa đơn</dt><dd className="font-semibold text-emerald-800">{billingMoney(invoice.totalAmount)}</dd></div>
        <div className="sm:col-span-2"><dt className="text-xs text-slate-500 mb-1">Nội dung chuyển khoản tham khảo</dt><dd className="font-semibold break-words">Hoa don {invoice.id} - Phong {invoice.roomNumber}</dd></div>
      </dl>:<p className="op-note">Hợp đồng chưa lưu tài khoản chuyển khoản. Bạn liên hệ chủ nhà để thanh toán theo phương thức đã thỏa thuận.</p>}
    </>}
    {contract?.snapshot.ownerPaymentQrId&&<div className="space-y-3"><h3 className="font-semibold text-sm">QR nhận tiền đã lưu cùng hợp đồng</h3><PrivatePaymentQr path={'/api/v1/invoices/'+encodeURIComponent(invoice.id)+'/payment-qr'} alt="QR thanh toán hóa đơn"/><p className="text-xs text-slate-500">QR cá nhân không điền sẵn số tiền. Nhập {billingMoney(invoice.totalAmount)} và nội dung chuyển khoản phía trên; kiểm tra người nhận trong ứng dụng ngân hàng.</p></div>}
    {notice&&<p role="status" className="text-sm text-emerald-700">{notice}</p>}
    <p className="text-xs text-slate-500 leading-relaxed">Thông tin nhận tiền lấy từ hợp đồng của hóa đơn này. Thanh toán thực hiện ngoài hệ thống; trạng thái “Đã gửi” chỉ cho biết chủ nhà đã gửi hóa đơn, chưa xác nhận tiền đã được thanh toán.</p>
  </section>;
}
