import { useEffect, useState, type ReactNode } from 'react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { billingMoney } from '@/services/billing/billingService';
import type { OwnerFinancialReport } from '@/hooks/useOwnerFinancialSummary';
import type { FinancialMonth } from '@/types/financialReport';

export const money = billingMoney;

export function FinancialFilters({ report }: { report: OwnerFinancialReport }) {
  const [from, setFrom] = useState(report.fromMonth);
  const [to, setTo] = useState(report.toMonth);

  useEffect(() => {
    setFrom(report.fromMonth);
    setTo(report.toMonth);
  }, [report.fromMonth, report.toMonth]);

  const isInvalid = Boolean(from && to && from > to);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isInvalid || !from || !to) return;
    if (from === report.fromMonth && to === report.toMonth) {
      report.reload();
    } else {
      report.setRange(from, to);
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <span className="text-xs font-semibold text-slate-500 mr-0.5">Xem nhanh:</span>
        <button
          type="button"
          onClick={() => report.applyPreset('THIS_MONTH')}
          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
            report.activePreset === 'THIS_MONTH'
              ? 'bg-brand-700 text-white shadow-xs'
              : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          Tháng này
        </button>
        <button
          type="button"
          onClick={() => report.applyPreset('LAST_3_MONTHS')}
          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
            report.activePreset === 'LAST_3_MONTHS'
              ? 'bg-brand-700 text-white shadow-xs'
              : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          3 tháng gần nhất
        </button>
        <button
          type="button"
          onClick={() => report.applyPreset('THIS_YEAR')}
          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
            report.activePreset === 'THIS_YEAR'
              ? 'bg-brand-700 text-white shadow-xs'
              : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          Năm nay
        </button>
      </div>

      <form className="flex flex-wrap items-end gap-2.5" onSubmit={handleSubmit}>
        <label className="text-xs text-slate-600 grid gap-1">
          Từ tháng
          <input
            aria-label="Từ tháng"
            className={`border rounded-lg px-3 py-1.5 text-sm min-w-40 sm:w-44 ${
              isInvalid ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
            }`}
            type="month"
            required
            value={from}
            onChange={e => setFrom(e.target.value)}
          />
        </label>
        <label className="text-xs text-slate-600 grid gap-1">
          Đến tháng
          <input
            aria-label="Đến tháng"
            className={`border rounded-lg px-3 py-1.5 text-sm min-w-40 sm:w-44 ${
              isInvalid ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
            }`}
            type="month"
            required
            value={to}
            onChange={e => setTo(e.target.value)}
          />
        </label>
        <button
          className="app-action-secondary text-sm disabled:opacity-50"
          type="submit"
          disabled={isInvalid || report.loading}
        >
          Xem báo cáo
        </button>
        <button
          className="app-action-secondary text-sm disabled:opacity-50"
          type="button"
          disabled={report.loading}
          onClick={report.reload}
        >
          Tải lại số liệu
        </button>
      </form>
      {isInvalid && (
        <p role="alert" className="text-xs font-medium text-red-600">
          Tháng bắt đầu không được lớn hơn tháng kết thúc.
        </p>
      )}
    </div>
  );
}

export function FinancialState({ report }: { report: OwnerFinancialReport }) {
  return (
    <>
      {report.loading && <p role="status" className="text-sm text-slate-500">Đang tải số liệu tài chính…</p>}
      {report.error && <p role="alert" className="text-sm text-red-700">{report.error}</p>}
    </>
  );
}

export function FinancialCard({ label, value, note, icon }: { label: string; value: string; note?: string; icon?: ReactNode }) {
  return (
    <div className="app-panel p-3 sm:p-5">
      <div className="flex min-h-9 items-center justify-between gap-2">
        <h2 className="text-sm font-medium leading-snug text-slate-600">{label}</h2>
        {icon && <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">{icon}</span>}
      </div>
      <p className="mt-2 break-words text-lg font-bold tracking-tight text-brand-950 tabular-nums sm:text-2xl">{value}</p>
      {note && <p className="mt-2 text-xs leading-relaxed text-slate-600">{note}</p>}
    </div>
  );
}

export function FinancialChart({ months, mode = 'comparison' }: { months: FinancialMonth[]; mode?: 'cash' | 'comparison' }) {
  const rows = months.map(m => {
    // Trải đều giá trị tiền phòng phân bổ về từng tháng sử dụng thực tế + tiền điện nước tiện ích chốt hàng tháng
    const allocatedRent = Number(m.allocatedRentAmount ?? '0') / 1000000;
    const utility =
      (Number(m.invoices.electricityAmount ?? '0') +
        Number(m.invoices.waterAmount ?? '0') +
        Number(m.invoices.serviceAmount ?? '0')) /
      1000000;
    const unpaidUtility = Math.min(utility, Number(m.invoices.unpaidInvoiceAmount ?? '0') / 1000000);
    const paidUtility = Math.max(0, utility - unpaidUtility);

    const paid = allocatedRent + paidUtility;
    const unpaid = unpaidUtility;
    const billed = paid + unpaid;
    const collected = Number(m.receipts.totalAmount ?? '0') / 1000000;
    return {
      period: m.period,
      paid,
      unpaid,
      billed,
      collected,
    };
  });
  const hasActivity = rows.some(row => (mode === 'comparison' && (row.paid !== 0 || row.unpaid !== 0)) || row.collected !== 0);
  const maxVal = Math.max(0, ...rows.map(r => Math.max(r.paid + r.unpaid, r.collected)));
  const yDomain = maxVal > 0 ? ([0, 'auto'] as const) : ([0, 1] as const);

  return (
    <section className="app-panel p-4 sm:p-5">
      <h2 className="font-bold text-base">
        {mode === 'cash' ? 'Tiền thực thu theo tháng' : 'Doanh thu phát sinh phân bổ và dòng tiền thực thu theo tháng'}
      </h2>
      <p className="text-xs leading-relaxed text-slate-600 mt-1 mb-4">
        {mode === 'cash'
          ? 'Theo ngày ghi nhận thanh toán, gồm hóa đơn và phiếu bổ sung. Đơn vị: triệu đồng.'
          : 'Cột chồng thể hiện doanh thu chuẩn hóa theo từng tháng (gồm tiền phòng phân bổ và tiền điện nước/tiện ích chốt hàng tháng, chia theo Đã thu và Còn nợ); đường biểu diễn dòng tiền thực tế nhận được theo ngày thanh toán. Đơn vị: triệu đồng.'}
      </p>
      {rows.length > 0 ? (
        <>
          <div className="h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={rows} margin={{ left: 0, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={42} allowDecimals={false} domain={yDomain} />
                <Tooltip
                  formatter={(value: any, name: any) => [
                    `${Number(value).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} triệu đ`,
                    name,
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {mode === 'comparison' ? (
                  <>
                    <Bar dataKey="paid" name="Hóa đơn đã thu" stackId="invoice" fill="#16a34a" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="unpaid" name="Hóa đơn còn nợ" stackId="invoice" fill="#ea580c" radius={[3, 3, 0, 0]} />
                    <Line
                      type="monotone"
                      dataKey="collected"
                      name="Dòng tiền thực thu"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#2563eb' }}
                      activeDot={{ r: 5 }}
                    />
                  </>
                ) : (
                  <Bar dataKey="collected" name="Tiền thực thu" fill="#0284c7" radius={[3, 3, 0, 0]} />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            {hasActivity
              ? 'Biểu đồ làm tròn để hiển thị; số tiền chi tiết trong bảng giữ nguyên độ chính xác.'
              : 'Chưa phát sinh hóa đơn hoặc dòng tiền thực thu trong kỳ này. Số tiền chi tiết trong bảng giữ nguyên độ chính xác.'}
          </p>
        </>
      ) : (
        <div className="grid justify-items-center gap-2 rounded-xl bg-brand-50 px-4 py-8 text-center text-sm text-slate-600">
          <BarChart3 size={24} className="text-brand-700" aria-hidden="true" />
          {mode === 'cash' ? 'Chưa có tiền thực thu trong kỳ hiển thị.' : 'Chưa có hóa đơn phát sinh hoặc tiền thực thu trong kỳ hiển thị.'}
        </div>
      )}
    </section>
  );
}
