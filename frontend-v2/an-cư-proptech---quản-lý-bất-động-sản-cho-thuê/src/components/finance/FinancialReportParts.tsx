import {useState, type ReactNode} from 'react';
import {ResponsiveContainer,BarChart,Bar,XAxis,YAxis,Tooltip,CartesianGrid,Legend} from 'recharts';
import {billingMoney} from '@/services/billing/billingService';
import type {OwnerFinancialReport} from '@/hooks/useOwnerFinancialSummary';
import type {FinancialMonth} from '@/types/financialReport';

export const money=billingMoney;
export function FinancialFilters({report}:{report:OwnerFinancialReport}){
  const [year,setYear]=useState(String(report.year));
  return <form className="flex flex-wrap items-end gap-2" onSubmit={e=>{e.preventDefault();if(Number(year)===report.year)report.reload();else report.setYear(Number(year));}}>
    <label className="text-xs text-slate-600 grid gap-1">Năm báo cáo<input aria-label="Năm báo cáo" className="border border-slate-300 rounded-lg px-3 py-2 w-28 text-sm" type="number" required min={1900} max={9998} value={year} onChange={e=>setYear(e.target.value)}/></label>
    <button className="app-action-secondary text-sm" type="submit">Xem báo cáo</button>
    <button className="app-action-secondary text-sm disabled:opacity-50" type="button" disabled={report.loading} onClick={report.reload}>Tải lại số liệu</button>
  </form>;
}
export function FinancialState({report}:{report:OwnerFinancialReport}){return <>{report.loading&&<p role="status" className="text-sm text-slate-500">Đang tải số liệu tài chính…</p>}{report.error&&<p role="alert" className="text-sm text-red-700">{report.error}</p>}</>;}
export function FinancialCard({label,value,note,icon}:{label:string;value:string;note?:string;icon?:ReactNode}){
  return <div className="app-panel p-4 sm:p-5">
    <div className="flex min-h-9 items-center justify-between gap-2">
      <h2 className="text-sm font-medium leading-snug text-slate-600">{label}</h2>
      {icon && <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">{icon}</span>}
    </div>
    <p className="mt-2 break-words text-2xl font-bold tracking-tight text-brand-950 tabular-nums">{value}</p>
    {note&&<p className="mt-2 text-xs leading-relaxed text-slate-600">{note}</p>}
  </div>;
}
export function FinancialChart({months}:{months:FinancialMonth[]}){
  const rows=months.map(m=>({period:m.period,billed:Number(m.invoices.billedAmount)/1000000,collected:Number(m.receipts.totalAmount)/1000000}));
  return <section className="app-panel p-4 sm:p-5"><h2 className="font-bold text-base">Hóa đơn đã gửi và tiền nhận theo tháng</h2><p className="text-xs leading-relaxed text-slate-600 mt-1 mb-4">Đơn vị triệu đồng. Hóa đơn theo kỳ lập; tiền nhận theo ngày thanh toán, có thể thuộc hóa đơn kỳ khác và phiếu bổ sung.</p>
    <div className="h-64 w-full min-w-0"><ResponsiveContainer width="100%" height="100%"><BarChart data={rows} margin={{left:0,right:8}}>
      <CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="period" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}} width={42}/><Tooltip/><Legend wrapperStyle={{fontSize:12}}/>
      <Bar dataKey="billed" name="HĐ đã gửi theo kỳ" fill="var(--app-primary)" radius={[3,3,0,0]}/><Bar dataKey="collected" name="Tiền nhận theo ngày thu" fill="var(--app-secondary)" radius={[3,3,0,0]}/>
    </BarChart></ResponsiveContainer></div>
    <p className="text-xs text-slate-500 mt-3">Biểu đồ làm tròn để hiển thị; số tiền chi tiết trong bảng giữ nguyên độ chính xác.</p>
  </section>;
}
