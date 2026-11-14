import { ArrowDownToLine, ArrowUpRight, Building2, Clock3, FileText, LayoutGrid, ReceiptText, Wallet, Wrench, Zap } from 'lucide-react';
import type { ActiveTab } from '@/types';
import type { OwnerFinancialReport } from '@/hooks/useOwnerFinancialSummary';
import type { OwnerWorkspaceSummary } from '@/types/owner';
import { FinancialCard, FinancialChart, FinancialFilters, FinancialState, money } from '@/components/finance/FinancialReportParts';

const quickActions = [
  { tab: 'rooms', label: 'Xem sơ đồ phòng', id: 'btn-quick-view-rooms', icon: LayoutGrid },
  { tab: 'utilities', label: 'Ghi điện nước', id: 'btn-quick-record-meter', icon: Zap },
  { tab: 'invoices', label: 'Thu tiền phòng', id: 'btn-quick-invoices', icon: ReceiptText },
] as const;

const workspaceLinks = [
  { tab: 'reports', label: 'Mở báo cáo năm', icon: FileText },
  { tab: 'contracts', label: 'Xử lý hợp đồng', icon: Clock3 },
  { tab: 'maintenance', label: 'Quản lý bảo trì', icon: Wrench },
  { tab: 'finance', label: 'Mở sổ quỹ', icon: Wallet },
] as const;

export function DashboardPage({ propertyName, report, counters, onNavigateTab }: {
  propertyName: string;
  report: OwnerFinancialReport;
  counters: OwnerWorkspaceSummary | null;
  onNavigateTab: (tab: ActiveTab) => void;
}) {
  const { data, month, setMonth } = report;
  const current = data?.months[month - 1];

  return <div className="space-y-4 pb-10">
    <header className="app-panel flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
      <div className="min-w-0">
        <h1 className="app-page-title">Tổng quan vận hành</h1>
        <p className="mt-2 break-words text-sm text-slate-600">{propertyName}</p>
      </div>
      <div className="flex flex-wrap gap-2 [&_button]:min-h-10 [&_button]:py-2">
        {quickActions.map(({ tab, label, id, icon: Icon }) => <button key={tab} id={id} type="button" onClick={() => onNavigateTab(tab)}
          className={tab === 'invoices' ? 'home-primary text-sm' : 'app-action-secondary text-sm'}>
          <Icon size={16} aria-hidden="true" />{label}
        </button>)}
      </div>
    </header>

    <section aria-label="Kỳ thống kê" className="flex flex-wrap items-end gap-3 px-1">
      <FinancialFilters report={report} />
      <label className="grid gap-1 text-xs text-slate-600">Tháng thống kê
        <select value={month} onChange={event => setMonth(Number(event.target.value))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          {Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>Tháng {index + 1}</option>)}
        </select>
      </label>
      {data && <p className="pb-1 text-xs text-slate-600 sm:ml-auto">Ngày thống kê {data.asOf}</p>}
    </section>
    <FinancialState report={report} />

    {data && current && <>
      <section aria-label="Chỉ số tổng quan" className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 xl:grid-cols-4">
        <FinancialCard label="Lấp đầy hiện tại" icon={<Building2 size={18} />}
          value={data.inventory.units ? `${Math.round(100 * data.inventory.occupied / data.inventory.units)}%` : '—'}
          note={`${data.inventory.occupied}/${data.inventory.units} căn đang ở · ${data.inventory.vacant} căn trống`} />
        <FinancialCard label="Hóa đơn quá hạn · Mọi kỳ" icon={<ReceiptText size={18} />}
          value={money(data.arrears.overdueInvoiceAmount)}
          note={`${data.arrears.overdueInvoiceCount} hóa đơn cần nhắc thanh toán`} />
        <FinancialCard label={`Thực thu tháng ${current.period}`} icon={<ArrowDownToLine size={18} />}
          value={money(current.receipts.totalAmount)} note="Theo ngày thu từ hóa đơn và phiếu bổ sung." />
        <FinancialCard label="Hóa đơn chưa thu · Mọi kỳ" icon={<Wallet size={18} />}
          value={money(data.arrears.monthlyInvoiceAmount)}
          note={`${data.arrears.monthlyInvoiceCount} hóa đơn · ${money(data.arrears.overdueInvoiceAmount)} quá hạn`} />
      </section>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(245px,1fr)]">
        <FinancialChart mode="cash" months={data.months.slice(Math.max(0, month - 6), month)} />
        <section className="app-panel p-4 sm:p-5" aria-labelledby="dashboard-followup">
          <h2 id="dashboard-followup" className="text-base font-bold">Cần theo dõi</h2>
          <dl className="mt-2 divide-y divide-slate-100 text-sm">
            <div className="flex items-center justify-between gap-3 py-3">
              <dt>Hợp đồng sắp hết trong 20 ngày</dt>
              <dd className="font-bold tabular-nums">{counters?.expiringContractCount ?? '—'}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-3">
              <dt>Hợp đồng đã hết hạn chờ xử lý</dt>
              <dd className="font-bold tabular-nums">{counters?.expiredContractCount ?? '—'}</dd>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 py-3">
              <dt>Phiếu bổ sung chưa thu · Mọi kỳ</dt>
              <dd className="font-bold tabular-nums">{money(data.arrears.additionalAmount)}</dd>
            </div>
          </dl>
          <div className="mt-3 grid gap-1 border-t border-slate-100 pt-2">
            {workspaceLinks.map(({ tab, label, icon: Icon }) => <button key={tab} type="button" onClick={() => onNavigateTab(tab)}
              className="flex items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-semibold text-brand-800 hover:bg-brand-50">
              <Icon size={16} aria-hidden="true" />{label}<ArrowUpRight size={14} className="ml-auto" aria-hidden="true" />
            </button>)}
          </div>
        </section>
      </div>
      <p className="text-xs leading-relaxed text-slate-600">Tiền thu theo ngày thanh toán có thể thuộc kỳ khác. Số liệu chưa bao gồm tiền cọc và sổ quỹ thủ công.</p>
    </>}
  </div>;
}
