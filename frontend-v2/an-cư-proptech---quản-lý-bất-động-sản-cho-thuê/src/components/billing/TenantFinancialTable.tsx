import { useEffect, useState } from 'react';
import { billingMoney } from '@/services/billing/billingService';
import { apiFetch, readApiError } from '@/services/http/client';

const labels = {
  RENT: 'Tiền thuê',
  UTILITY: 'Điện, nước và dịch vụ',
  LEGACY: 'Hóa đơn tổng hợp',
  ADDITIONAL: 'Phiếu bổ sung',
};

interface InvoiceTotals {
  kind: keyof typeof labels;
  paidCount: number;
  paidAmount: string;
  unpaidCount: number;
  unpaidAmount: string;
}

export function TenantFinancialTable({ revision }: { revision: number }) {
  const [result, setResult] = useState<{ revision: number; rows: InvoiceTotals[]; error?: string }>();
  useEffect(() => {
    const controller = new AbortController();
    let running = false;
    async function load() {
      if (running || controller.signal.aborted) return;
      running = true;
      try {
        const response = await apiFetch('/api/v1/me/financial-summary', { signal: controller.signal });
        if (!response.ok) throw await readApiError(response);
        const rows: InvoiceTotals[] = await response.json();
        if (!Array.isArray(rows)) throw new Error('Thiếu số liệu thống kê.');
        if (!controller.signal.aborted) setResult({ revision, rows });
      } catch {
        if (!controller.signal.aborted) setResult({ revision, rows: [], error: 'Chưa tải được thống kê hóa đơn. Bấm Làm mới để thử lại.' });
      } finally {
        running = false;
      }
    }
    void load();
    const refresh = () => { if (document.visibilityState === 'visible') void load(); };
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [revision]);

  const current = result?.revision === revision ? result : undefined;
  const rows = current?.rows.filter(row => row.paidCount > 0 || row.unpaidCount > 0) ?? [];
  return <section aria-labelledby="tenant-financial-title" className="mb-6 rounded-xl border border-slate-200 bg-white">
    <div className="p-4 sm:px-5">
      <h2 id="tenant-financial-title" className="font-bold text-slate-900">Thống kê hóa đơn của tôi</h2>
      <p className="mt-1 text-sm text-slate-600">Tất cả kỳ hóa đơn của tài khoản, gồm cả hợp đồng đã kết thúc.</p>
      {!current && <p role="status" className="mt-3 text-sm text-slate-600">Đang tải thống kê…</p>}
      {current?.error && <p role="alert" className="mt-3 text-sm text-rose-700">{current.error}</p>}
      {current && !current.error && rows.length === 0 && <p className="mt-3 text-sm text-slate-600">Chưa có hóa đơn để thống kê.</p>}
    </div>
    {rows.length > 0 && <table aria-labelledby="tenant-financial-title" className="w-full table-fixed border-collapse text-sm">
      <thead className="bg-slate-50 text-slate-700">
        <tr>
          <th scope="col" className="px-2 py-3 text-left sm:px-5">Loại hóa đơn</th>
          <th scope="col" className="px-2 py-3 text-right sm:px-5">Đã thanh toán</th>
          <th scope="col" className="px-2 py-3 text-right sm:px-5">Chưa thanh toán</th>
        </tr>
      </thead>
      <tbody>{rows.map(row => <tr key={row.kind} className="border-t border-slate-100">
        <th scope="row" className="px-2 py-3 text-left font-medium sm:px-5">{labels[row.kind]}</th>
        <td className="break-words px-2 py-3 text-right sm:px-5">
          <span className="font-semibold text-emerald-800">{billingMoney(row.paidAmount)}</span>
          <span className="block text-xs text-slate-600">{row.paidCount} hóa đơn</span>
        </td>
        <td className="break-words px-2 py-3 text-right sm:px-5">
          <span className="font-semibold text-slate-900">{billingMoney(row.unpaidAmount)}</span>
          <span className="block text-xs text-slate-600">{row.unpaidCount} hóa đơn</span>
        </td>
      </tr>)}</tbody>
    </table>}
  </section>;
}
