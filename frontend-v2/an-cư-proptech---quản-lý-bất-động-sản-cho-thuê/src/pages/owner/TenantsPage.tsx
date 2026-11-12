import { externalDepositNotice } from '@/utils/depositPolicy';
import { useState } from 'react';
import { Search, Users } from 'lucide-react';
import type { Tenant } from '@/types';
import { billingMoney } from '@/services/billing/billingService';
import { OpenConversationButton } from '@/components/apartments/StartRentalConversation';

export function identityLabel(tenant: Tenant) {
  if (tenant.identityStatus === 'NOT_VERIFIED') return 'Chưa xác minh định danh';
  if (tenant.identityStatus !== 'VERIFIED') return 'Chưa có dữ liệu định danh';
  if (tenant.identitySource === 'AUTH0_VNEID_SIMULATION') return 'Đã đối chiếu qua Auth0 (mô phỏng)';
  if (tenant.identitySource === 'LOCAL_DEMO') return 'Định danh mẫu local';
  return 'Đã xác minh theo nguồn hệ thống';
}

const signingLabels = {
  NO_DATA: 'Chưa có dữ liệu ký', UNSIGNED: 'Chưa ký', OWNER_SIGNED: 'Chủ nhà đã ký, chờ người thuê',
  CUSTOMER_SIGNED: 'Người thuê đã ký, chờ chủ nhà', BOTH_SIGNED: 'Hai bên đã ký trong ứng dụng',
};

export function TenantsPage({ tenants, loading = false, error = '', onReload }: {
  tenants: Tenant[]; loading?: boolean; error?: string; onReload: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const active = tenants.filter(t => t.status === 'active');
  const q = searchTerm.trim().toLocaleLowerCase('vi-VN');
  const filtered = active.filter(t => [t.name, t.email, t.phone, t.roomNumber, t.buildingName].some(value => value?.toLocaleLowerCase('vi-VN').includes(q)));
  return <div className="space-y-5 pb-12">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
      <div>
        <h1 className="app-page-title flex items-center gap-2"><Users className="w-5 h-5 shrink-0" />Khách thuê theo hợp đồng</h1>
        <p className="text-sm text-slate-600 mt-2">{loading || error ? '—' : `${active.length} hợp đồng đang thuê · ${new Set(active.map(t => t.id)).size} tài khoản`}</p>
        <p className="text-xs text-slate-500 mt-1">Mỗi dòng là một hợp đồng đang hiệu lực. Một tài khoản có thể thuê nhiều căn hộ.</p>
      </div>
      <button type="button" disabled={loading} onClick={onReload} className="px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:opacity-50 shrink-0">Tải lại khách thuê</button>
    </div>
    <p className="text-sm text-slate-600">Cọc theo hợp đồng là số tiền thỏa thuận. {externalDepositNotice} Xác thực email, định danh tài khoản và ký hợp đồng được hiển thị riêng.</p>
    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
      <label htmlFor="input-search-tenants" className="sr-only">Tìm khách thuê</label>
      <div className="relative"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" /><input id="input-search-tenants" type="search" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Tìm theo tên, email, tài sản, số căn hộ…" className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm" /></div>
    </div>
    {error && <p role="alert" className="text-red-700 text-sm">{error}</p>}
    {loading ? <p role="status" className="text-sm">Đang tải khách thuê…</p> : !error && <div className="app-panel overflow-hidden">
      <div className="overflow-x-auto"><table className="app-data-table w-full text-left text-xs min-w-[1050px]">
        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]"><tr>{['Người thuê', 'Căn hộ / Tài sản', 'Xác thực email', 'Định danh tài khoản', 'Ký trong ứng dụng', 'Cọc theo hợp đồng', 'Quản lý cọc', 'Trạng thái'].map(label => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">{filtered.map(tenant => <tr key={tenant.contractId ?? `${tenant.id}-${tenant.roomId}`} className="hover:bg-slate-50/80">
          <td className="px-4 py-3"><div className="font-semibold text-slate-900">{tenant.name}</div><div className="text-slate-500 break-all mt-1">{tenant.email || 'Chưa có email'}</div>
            {tenant.contractId && <OpenConversationButton target={{ contractId: tenant.contractId }} label="Nhắn tin"
              accessibleName={`Nhắn tin cho ${tenant.name} · ${tenant.roomNumber}`}
              className="mt-2 inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-50 px-2.5 py-1.5 font-semibold text-emerald-800 hover:bg-brand-100 disabled:opacity-50" />}
          </td>
          <td className="px-4 py-3"><div className="font-bold text-emerald-700">{tenant.roomNumber}</div><div className="text-slate-500 mt-1">{tenant.buildingName}</div><div className="text-slate-500 mt-1">{tenant.contractId ? `HĐ #${tenant.contractId}` : 'Chưa có mã hợp đồng'}</div></td>
          <td className="px-4 py-3">{tenant.emailVerified === true ? 'Đã xác thực email' : tenant.emailVerified === false ? 'Chưa xác thực email' : 'Chưa có dữ liệu xác thực email'}</td>
          <td className="px-4 py-3">{identityLabel(tenant)}</td>
          <td className="px-4 py-3">{signingLabels[tenant.inAppSigningStatus ?? 'NO_DATA'] ?? signingLabels.NO_DATA}</td>
          <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{tenant.contractDeposit == null ? 'Chưa có dữ liệu' : billingMoney(tenant.contractDeposit)}</td>
          <td className="px-4 py-3 text-slate-500">Hai bên tự quản lý ngoài hệ thống</td>
          <td className="px-4 py-3"><span className="inline-block bg-emerald-100 text-emerald-800 rounded-full px-2 py-1 whitespace-nowrap">Đang thuê</span></td>
        </tr>)}{!filtered.length && <tr><td colSpan={8} className="p-6 text-slate-500">{active.length ? 'Không có khách thuê khớp tìm kiếm.' : 'Chưa có hợp đồng đang hiệu lực trong tài sản đã chọn.'}</td></tr>}</tbody>
      </table></div>
    </div>}
    <p className="text-xs text-slate-500">Trạng thái ký phản ánh bản ghi ký trong ứng dụng, không xác nhận chứng thư ký số của nhà cung cấp. Quan hệ thuê được tạo qua quy trình yêu cầu thuê và hợp đồng.</p>
  </div>;
}
