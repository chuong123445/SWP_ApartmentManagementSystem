import type {ActiveTab} from '@/types';
import type {OwnerFinancialReport} from '@/hooks/useOwnerFinancialSummary';
import type {OwnerWorkspaceSummary} from '@/types/owner';
import {FinancialCard,FinancialChart,FinancialFilters,FinancialState,money} from '@/components/finance/FinancialReportParts';

export function DashboardPage({propertyName,report,counters,onNavigateTab}:{propertyName:string;report:OwnerFinancialReport;counters:OwnerWorkspaceSummary|null;onNavigateTab:(tab:ActiveTab)=>void}){
  const {month,setMonth}=report;
  const data=report.data;const current=data?.months[month-1];
  return <div className="space-y-5 pb-12">
    <header className="flex flex-wrap gap-4 justify-between bg-white border border-slate-200 rounded-xl p-5"><div><h1 className="text-xl font-bold">Bảng điều khiển vận hành — {propertyName}</h1><p className="text-xs text-slate-500 mt-2">Hóa đơn và thanh toán theo số liệu tổng hợp; quy mô căn hộ là hiện trạng.</p></div><div className="flex flex-wrap gap-2 items-center">{[['rooms','Xem Sơ Đồ Phòng','btn-quick-view-rooms'],['utilities','Ghi Điện Nước','btn-quick-record-meter'],['invoices','Thu Tiền Phòng','btn-quick-invoices']].map(([tab,label,id])=><button key={tab} id={id} onClick={()=>onNavigateTab(tab as ActiveTab)} className="px-3 py-2 text-xs border border-slate-300 rounded-lg">{label}</button>)}</div></header>
    <div className="bg-white p-4 border border-slate-200 rounded-xl flex flex-wrap items-end gap-3"><FinancialFilters report={report}/><label className="grid gap-1 text-xs text-slate-600">Tháng thống kê<select aria-label="Tháng thống kê" value={month} onChange={e=>setMonth(Number(e.target.value))} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">{Array.from({length:12},(_,index)=><option key={index+1} value={index+1}>Tháng {index+1}</option>)}</select></label></div>
    <FinancialState report={report}/>
    {data&&current&&<>
      <p className="text-xs text-slate-500">Đang xem tháng {month}/{data.year}. Ngày thống kê {data.asOf}; công nợ chưa thu bao gồm mọi kỳ.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <FinancialCard label="Lấp đầy hiện tại" value={data.inventory.units?`${Math.round(100*data.inventory.occupied/data.inventory.units)}%`:'—'} note={`${data.inventory.occupied}/${data.inventory.units} căn đang ở, ${data.inventory.vacant} căn trống.`}/>
        <FinancialCard label={`HĐ đã gửi kỳ ${current.period}`} value={money(current.invoices.billedAmount)} note={`${current.invoices.invoiceCount} hóa đơn, ${money(current.invoices.unpaidInvoiceAmount)} chưa thu theo kỳ.`}/>
        <FinancialCard label={`Tiền nhận tháng ${current.period}`} value={money(current.receipts.totalAmount)} note="Theo ngày thu từ hóa đơn tháng và phiếu bổ sung."/>
        <FinancialCard label="Hóa đơn tháng chưa thu — mọi kỳ" value={money(data.arrears.monthlyInvoiceAmount)} note={`${data.arrears.monthlyInvoiceCount} hóa đơn; ${money(data.arrears.overdueInvoiceAmount)} đã quá hạn.`}/>
      </div>
      <FinancialChart months={data.months.slice(Math.max(0,month-6),month)}/>
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FinancialCard label="Hợp đồng sắp hết trong 20 ngày" value={counters?String(counters.expiringContractCount):'—'} note="Theo ngày hiện tại, không theo năm báo cáo."/>
        <FinancialCard label="Hợp đồng đã hết hạn chờ xử lý" value={counters?String(counters.expiredContractCount):'—'} note="Cần xem quy trình thuê tiếp hoặc bàn giao."/>
        <FinancialCard label="Phiếu bổ sung chưa thu — mọi kỳ" value={money(data.arrears.additionalAmount)} note={`${data.arrears.additionalCount} phiếu gắn đúng người thuê.`}/>
      </section>
      <div className="flex flex-wrap gap-2">{[['reports','Mở báo cáo năm'],['contracts','Xử lý hợp đồng'],['maintenance','Quản lý bảo trì'],['finance','Mở sổ quỹ']].map(([tab,label])=><button key={tab} onClick={()=>onNavigateTab(tab as ActiveTab)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg bg-white">{label}</button>)}</div>
      <p className="text-xs text-slate-500">Tiền thu theo ngày thanh toán có thể thuộc hóa đơn kỳ khác. Cọc do hai bên tự quản lý ngoài hệ thống; sổ quỹ thủ công và rút ví được theo dõi riêng; chưa dùng số liệu này để tính lợi nhuận.</p>
    </>}
  </div>;
}
