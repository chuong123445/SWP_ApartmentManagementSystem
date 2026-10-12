import type { BillingInvoice } from '@/types/billing';
import { billingMoney } from '@/services/billing/billingService';
export function InvoiceBreakdown({ invoice: i }: { invoice: BillingInvoice }) {
  return <div className="space-y-4">
    <div><h2 className="font-bold text-lg">Hóa đơn căn hộ {i.roomNumber}</h2><p className="text-sm text-slate-500">{i.tenantName} · Kỳ {i.period} · Hạn đóng {i.dueDate}</p>
      <span className="text-xs text-emerald-700">{i.status === 'SENT' ? 'Đã gửi người thuê' : 'Bản nháp'}</span></div>
    <table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="p-3 text-left">Khoản thu</th><th className="p-3 text-right">Số lượng / Đơn giá</th><th className="p-3 text-right">Thành tiền</th></tr></thead>
      <tbody><tr><td className="p-3">Tiền thuê tháng</td><td className="p-3 text-right">1 tháng</td><td className="p-3 text-right">{billingMoney(i.monthlyRent)}</td></tr>
        <tr><td className="p-3">Điện <span className="block text-xs text-slate-500">{i.electricityStartReading} → {i.electricityEndReading} kWh</span></td><td className="p-3 text-right">{i.electricityQuantity} × {billingMoney(i.electricityUnitPrice)}</td><td className="p-3 text-right">{billingMoney(i.electricityAmount)}</td></tr>
        <tr><td className="p-3">Nước <span className="block text-xs text-slate-500">{i.waterStartReading} → {i.waterEndReading} m³</span></td><td className="p-3 text-right">{i.waterQuantity} × {billingMoney(i.waterUnitPrice)}</td><td className="p-3 text-right">{billingMoney(i.waterAmount)}</td></tr></tbody>
    </table><p className="text-right font-bold text-xl text-emerald-700">Tổng: {billingMoney(i.totalAmount)}</p>
  </div>;
}
