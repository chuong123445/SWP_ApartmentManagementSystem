import {Link} from 'react-router';
import { useState } from 'react';
import { ReceiptText, RefreshCw, Plus, FileText, Send, Search, CalendarDays, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import type { Invoice } from '@/types';
import { billingMoney } from '@/services/billing/billingService';
import { Pagination } from '@/components/common/Pagination';
import '@/styles/operations.css';

export function InvoicesPage({ invoices, onOpenInvoiceModal, onOpenCreateInvoiceModal, onSendInvoice, error, loading, onReload, page, totalPages, onPageChange }: {
  invoices: Invoice[]; onOpenInvoiceModal: (i: Invoice) => void; onOpenCreateInvoiceModal: () => void;
  onSendInvoice: (id: string) => Promise<void>; error: string; loading: boolean; onReload: () => void;
  page: number; totalPages: number; onPageChange: (page: number) => void;
}) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sendError, setSendError] = useState('');
  const [sending, setSending] = useState('');
  const visible = invoices.filter(i => (filter === 'all' || i.apiInvoice?.status === filter) && `${i.roomNumber} ${i.tenantName} ${i.monthYear}`.toLowerCase().includes(search.toLowerCase()));
  const draftCount = invoices.filter(i => i.apiInvoice?.status === 'DRAFT').length;
  const sentCount = invoices.filter(i => i.apiInvoice?.status === 'SENT').length;
  const send = async (id: string) => {
    setSending(id); setSendError('');
    try { await onSendInvoice(id); }
    catch (e) { setSendError(e instanceof Error ? e.message : 'Không thể gửi hóa đơn.'); }
    finally { setSending(''); }
  };
  const dateLabel = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.split('-').reverse().join('/') : date;

  return <section className="operations-page" aria-label="Quản lý hóa đơn">
    <header className="op-heading">
      <div className="op-title-group"><span className="op-heading-icon"><ReceiptText size={23}/></span><div>
        <div className="op-eyebrow">Tài chính · Thu tiền thuê</div><h1>Hóa đơn người thuê</h1>
        <p>Lập hóa đơn từ hợp đồng và chỉ số công tơ, gửi trực tiếp đến người thuê.</p>
      </div></div>
      <div className="op-buttons"><Link to="/account/settings/payments/test" className="op-button">Tạo phiếu thanh toán thử</Link><button onClick={onReload} className="op-button" disabled={loading}><RefreshCw size={14}/>Làm mới</button><button id="btn-create-invoice-page" onClick={onOpenCreateInvoiceModal} className="op-button op-button-primary"><Plus size={15}/>Lập hóa đơn mới</button></div>
    </header>
    <div className="op-stats">
      {[{label:'Hóa đơn trên trang',value:invoices.length,icon:ReceiptText,tone:''},{label:'Bản nháp trên trang',value:draftCount,icon:FileText,tone:'amber'},{label:'Đã gửi trên trang',value:sentCount,icon:Send,tone:'blue'}].map(s=><div className="op-stat" key={s.label}><span className={`op-stat-icon ${s.tone}`}><s.icon size={19}/></span><div><small>{s.label}</small><strong>{loading?'—':s.value}</strong></div></div>)}
    </div>
    {(error || sendError) && <p role="alert" className="op-error">{error || sendError}</p>}
    <div className="op-panel">
      <div className="op-toolbar">
        <div className="op-tabs" aria-label="Lọc hóa đơn">{[['all','Tất cả',invoices.length],['DRAFT','Bản nháp',draftCount],['SENT','Đã gửi',sentCount]].map(([v,label,count])=><button key={v} aria-pressed={filter===v} onClick={()=>setFilter(String(v))}>{label}<span className="op-count">{count}</span></button>)}</div>
        <label className="op-search"><Search size={15}/><input aria-label="Tìm hóa đơn" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm căn hộ, người thuê, kỳ..."/></label>
      </div>
      {loading && <p role="status" className="op-empty">Đang tải hóa đơn...</p>}
      {!loading && <table className="op-table"><thead><tr>{['Kỳ hóa đơn','Căn hộ','Người thuê','Hạn đóng','Tổng tiền','Trạng thái','Thao tác'].map(x=><th key={x} scope="col">{x}</th>)}</tr></thead><tbody>
        {visible.map(i=><tr key={i.id} data-invoice-id={i.id}>
          <td data-label="Kỳ hóa đơn"><span className="op-period"><CalendarDays size={13}/>{i.monthYear}</span></td>
          <td data-label="Căn hộ"><span className="op-room">{i.roomNumber}</span></td>
          <td data-label="Người thuê"><span className="op-person"><span className="op-avatar" aria-hidden="true">{i.tenantName.trim().split(/\s+/).slice(-2).map(x=>x[0]).join('')}</span>{i.tenantName}</span></td>
          <td data-label="Hạn đóng">{dateLabel(i.dueDate)}</td>
          <td data-label="Tổng tiền"><span className="op-money">{i.apiInvoice?billingMoney(i.apiInvoice.totalAmount):'—'}</span></td>
          <td data-label="Trạng thái"><span className={`op-badge ${i.apiInvoice?.status==='SENT'?'green':'amber'}`}>{i.apiInvoice?.status==='SENT'?<><CheckCircle2 size={11}/>Đã gửi</>:<><FileText size={11}/>Bản nháp</>}</span>{i.apiInvoice?.status==='SENT'&&<span className="block text-xs mt-1">{i.apiInvoice.paymentStatus==='PAID'?'Đã thanh toán':'Chưa thanh toán'}</span>}</td>
          <td data-label="Thao tác"><div className="op-buttons"><button onClick={()=>onOpenInvoiceModal(i)} className="op-link">Chi tiết<ArrowUpRight size={13}/></button>{i.apiInvoice?.status==='DRAFT'&&<button disabled={!!sending} onClick={()=>void send(i.id)} className="op-link"><Send size={12}/>{sending===i.id?'Đang gửi...':'Gửi người thuê'}</button>}</div></td>
        </tr>)}
        {!visible.length&&<tr><td colSpan={7} className="op-empty-cell"><div className="op-empty"><ReceiptText size={29}/><strong>Chưa có hóa đơn phù hợp.</strong>Thử đổi bộ lọc hoặc lập hóa đơn mới cho người thuê.</div></td></tr>}
      </tbody></table>}
      <div className="op-caption">{visible.length} hóa đơn hiển thị · Trang {page+1}/{Math.max(1,totalPages)} · Bộ lọc áp dụng trên trang hiện tại</div>
    </div>
    <Pagination page={page} totalPages={totalPages} onChange={onPageChange}/>
  </section>;
}
