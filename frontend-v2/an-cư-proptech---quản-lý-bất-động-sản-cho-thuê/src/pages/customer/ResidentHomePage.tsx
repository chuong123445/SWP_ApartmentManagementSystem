import { useEffect,useState } from 'react';
import { Link,useSearchParams } from 'react-router';
import { Building2,Home,ReceiptText,Wrench,FileText,ArrowUpRight,RefreshCw,CalendarDays } from 'lucide-react';
import { CustomerLayout } from '@/layouts/CustomerLayout';
import { useTenancyContext } from '@/contexts/TenancyContext';
import { billingMoney } from '@/services/billing/billingService';
import { roomInvoices,roomMaintenance } from '@/services/resident/residentService';
import { MaintenancePage } from '@/pages/owner/MaintenancePage';
import type { BillingInvoice } from '@/types/billing';
import type { MaintenanceTicket } from '@/types';
import '@/styles/operations.css';
import '@/styles/resident.css';

const tabs=[['overview','Tổng quan',Home],['invoices','Hóa đơn & thanh toán',ReceiptText],['maintenance','Sự cố & sửa chữa',Wrench],['contract','Hợp đồng',FileText]] as const;
function ResidentHomeContent(){
  const {tenancies,loading:leasesLoading,error:leaseError,reload:reloadLeases}=useTenancyContext();
  const [params,setParams]=useSearchParams();
  const leases=tenancies.filter(c=>c.status==='ACTIVE');
  const selected=leases.find(c=>c.apartmentId===params.get('room'))??leases[0];
  const tab=tabs.some(([v])=>v===params.get('tab'))?params.get('tab')!:'overview';
  const [invoices,setInvoices]=useState<BillingInvoice[]>([]);
  const [tickets,setTickets]=useState<MaintenanceTicket[]>([]);
  const [invoiceError,setInvoiceError]=useState('');const [ticketError,setTicketError]=useState('');
  const [loading,setLoading]=useState(false);const [loadedRoom,setLoadedRoom]=useState('');const [revision,setRevision]=useState(0);
  const reload=()=>setRevision(v=>v+1);
  useEffect(()=>{
    let active=true;if(!selected)return;
    setLoading(true);setInvoiceError('');setTicketError('');setInvoices([]);setTickets([]);
    Promise.allSettled([roomInvoices(selected.apartmentId),roomMaintenance(selected.apartmentId)]).then(([bills,issues])=>{
      if(!active)return;
      if(bills.status==='fulfilled')setInvoices(bills.value);else setInvoiceError(bills.reason instanceof Error?bills.reason.message:'Không tải được hóa đơn.');
      if(issues.status==='fulfilled')setTickets(issues.value);else setTicketError(issues.reason instanceof Error?issues.reason.message:'Không tải được sự cố.');
      setLoadedRoom(selected.apartmentId);setLoading(false);
    });
    return()=>{active=false;};
  },[selected?.apartmentId,revision]);
  useEffect(()=>{const refresh=()=>setRevision(v=>v+1);window.addEventListener('focus',refresh);window.addEventListener('ancu:tenancy-changed',refresh);return()=>{window.removeEventListener('focus',refresh);window.removeEventListener('ancu:tenancy-changed',refresh);};},[]);
  const selectTab=(value:string)=>setParams(p=>{p.set('tab',value);p.delete('report');return p;});
  const busy=loading||loadedRoom!==selected?.apartmentId;
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date());
  const canReport=!!selected&&selected.startDate<=today;
  const openTickets=tickets.filter(t=>!['RESOLVED','CANCELLED','REJECTED'].includes(t.apiStatus??'')).length;
  const places=selected&&canReport?[{value:selected.apartmentId,label:`${selected.propertyName} — ${selected.roomNumber}`,apartmentId:selected.apartmentId}]:[];
  return <main className="resident-hub operations-page max-w-7xl mx-auto px-5 py-8">
    <header className="op-heading"><div className="op-title-group"><span className="op-heading-icon"><Home size={23}/></span><div><div className="op-eyebrow">Không gian của bạn</div><h1>Nhà đang thuê</h1><p>Thông tin nơi ở, hóa đơn và hỗ trợ sửa chữa trong một nơi.</p></div></div><button className="op-button" onClick={()=>{reloadLeases();reload();}} disabled={leasesLoading||loading}><RefreshCw size={14}/>Làm mới</button></header>
    {leaseError&&<p role="alert" className="op-error">{leaseError}</p>}
    {leasesLoading&&!selected&&<p role="status" className="op-empty">Đang tải nơi ở của bạn...</p>}
    {!leasesLoading&&!leaseError&&!selected&&<section className="op-panel op-empty"><Building2 size={34}/><strong>Bạn chưa có nhà đang thuê.</strong><p>Nhà sẽ xuất hiện khi hợp đồng được hai bên ký và kích hoạt.</p><div className="op-buttons justify-center mt-5"><Link className="op-button op-button-primary" to="/">Tìm nhà để thuê</Link><Link className="op-button" to="/my/rental-requests">Yêu cầu & hợp đồng</Link></div></section>}
    {selected&&<>
      <section className="resident-home-card" aria-label="Nơi ở được chọn">
        <div className="resident-home-icon"><Building2 size={32}/></div>
        <div className="min-w-0 flex-1"><span className="op-badge green">{canReport?'Đang thuê':'Sắp đến ngày thuê'}</span><h2>{selected.roomNumber} · {selected.apartmentTitle}</h2><p>{selected.propertyName}</p><div className="resident-home-meta"><span><CalendarDays size={13}/>{selected.startDate} → {selected.endDate}</span><span>{billingMoney(selected.monthlyRent)} / tháng</span></div></div>
        {leases.length>1&&<label className="text-sm">Chọn nơi ở<select aria-label="Chọn nơi ở" value={selected.apartmentId} onChange={e=>setParams(p=>{p.set('room',e.target.value);p.delete('report');return p;})} className="block mt-2">{leases.map(c=><option key={c.id} value={c.apartmentId}>{c.propertyName} — {c.roomNumber}</option>)}</select></label>}
      </section>
      <nav className="resident-tabs" aria-label="Quản lý nhà đang thuê">{tabs.map(([value,label,Icon])=><button key={value} aria-pressed={tab===value} onClick={()=>selectTab(value)}><Icon size={16}/>{label}</button>)}</nav>
      {tab==='overview'&&<>
        <div className="resident-actions">
          <button onClick={()=>selectTab('invoices')} className="resident-action"><span className="op-stat-icon"><ReceiptText size={21}/></span><strong>Hóa đơn & thanh toán</strong><p>{busy?'Đang tải...':invoiceError?'Chưa tải được hóa đơn':`${invoices.length} hóa đơn đã gửi cho phòng này`}</p><span className="op-link">Xem hóa đơn<ArrowUpRight size={14}/></span></button>
          <button disabled={!canReport} onClick={()=>setParams(p=>{p.set('tab','maintenance');p.set('report','1');return p;})} className="resident-action"><span className="op-stat-icon amber"><Wrench size={21}/></span><strong>Báo sự cố</strong><p>{canReport?'Gửi yêu cầu sửa chữa đúng phòng đang thuê.':'Có thể báo sự cố từ ngày bắt đầu thuê.'}</p><span className="op-link">{busy?'Đang tải...':ticketError?'Chưa tải được sự cố':`${openTickets} yêu cầu đang xử lý`}<ArrowUpRight size={14}/></span></button>
          <button onClick={()=>selectTab('contract')} className="resident-action"><span className="op-stat-icon blue"><FileText size={21}/></span><strong>Hợp đồng của phòng</strong><p>Xem PDF, chữ ký, thời hạn và điều khoản thuê.</p><span className="op-link">Mở hợp đồng<ArrowUpRight size={14}/></span></button>
        </div>
        {(invoiceError||ticketError)&&<p role="alert" className="op-error">{invoiceError||ticketError} Bạn có thể nhấn Làm mới để thử lại.</p>}
        <p className="text-xs text-slate-400 mt-5">Xem hồ sơ thuê cũ và lịch sử tại <Link className="text-emerald-700 underline" to="/my/rental-requests">Yêu cầu & hợp đồng</Link>.</p>
      </>}
      {tab==='invoices'&&<section className="op-panel"><div className="op-toolbar"><div><h2 className="font-bold">Hóa đơn phòng {selected.roomNumber}</h2><p className="text-xs text-slate-500 mt-1">Các kỳ đã gửi đến bạn tại phòng này. “Đã gửi” không xác nhận đã thanh toán.</p></div></div>
        {busy?<p role="status" className="op-empty">Đang tải hóa đơn...</p>:invoiceError?<p role="alert" className="op-error">{invoiceError}</p>:!invoices.length?<div className="op-empty"><ReceiptText size={28}/><strong>Chưa có hóa đơn cho phòng này.</strong>Hóa đơn xuất hiện khi chủ nhà gửi đến bạn.</div>:<div className="resident-invoices">{invoices.map(i=><Link key={i.id} to={`/my/invoices/${i.id}?from=home`} className="resident-invoice"><div><span className="op-badge green">Đã gửi</span><h3>Kỳ {i.period}</h3><p>Hạn đóng: {i.dueDate}</p></div><div><strong>{billingMoney(i.totalAmount)}</strong><span className="op-link">Chi tiết & thông tin thanh toán<ArrowUpRight size={13}/></span></div></Link>)}</div>}
      </section>}
      {tab==='maintenance'&&<>
        <MaintenancePage key={`${selected.apartmentId}-${params.get('report')}`} initialCreating={params.get('report')==='1'&&canReport} owner={false} tickets={busy?[]:tickets} places={places} loading={busy} error={ticketError} onReload={reload}/>
      </>}
      {tab==='contract'&&<section className="op-panel p-6 space-y-4"><span className="op-badge green">Hợp đồng hiện tại</span><h2 className="text-xl font-bold">Phòng {selected.roomNumber} · {selected.propertyName}</h2><p className="text-sm text-slate-500">Thời hạn: {selected.startDate} → {selected.endDate}</p><p className="font-semibold">Giá thuê: {billingMoney(selected.monthlyRent)} / tháng</p><div className="op-buttons"><Link className="op-button op-button-primary" to={`/contracts/${selected.id}`}>Xem PDF / ký và bàn giao<ArrowUpRight size={14}/></Link><Link className="op-button" to="/my/rental-requests">Xem toàn bộ hồ sơ thuê</Link></div></section>}
    </>}
  </main>;
}
export function ResidentHomePage(){return <CustomerLayout><ResidentHomeContent/></CustomerLayout>;}
