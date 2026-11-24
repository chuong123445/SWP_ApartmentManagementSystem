import type { MaintenanceCharge } from '@/types/billing';
import { billingMoney } from '@/services/billing/billingService';

export function MaintenanceChargeList({ items = [] }: { items?: MaintenanceCharge[] }) {
  if (!items.length) return null;
  return <section aria-label="Chi phí sửa chữa trong hóa đơn" className="rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm">
    <h3 className="font-semibold text-brand-900">Chi phí sửa chữa tự động tính vào hóa đơn</h3>
    <ul className="mt-2 divide-y divide-brand-100">{items.map(item =>
      <li key={item.ticketId} className="flex flex-wrap justify-between gap-2 py-2">
        <div className="min-w-0 break-words"><p className="font-medium">{item.title} · Sự cố #{item.ticketId}</p>
          <p className="text-xs text-slate-600">Tháng thu {item.period} · Chủ nhà chịu {billingMoney(item.ownerCost)}</p>
        </div>
        <strong className="whitespace-nowrap">Khách trả {billingMoney(item.customerCost)}</strong>
      </li>)}</ul>
  </section>;
}
