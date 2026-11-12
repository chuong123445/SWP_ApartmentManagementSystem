import React from 'react';
import { Link } from 'react-router';
import {
  LayoutDashboard,
  Home,
  Users,
  FileCheck2,
  ReceiptText,
  Zap,
  Wrench,
  Wallet,
  TrendingUp,
  Settings,
  Building2,
  Sparkles,
  MessageSquare,
} from 'lucide-react';
import { ActiveTab, UserRole, Building } from '@/types';
import type { OwnerWorkspaceCounters } from '@/types/owner';

interface SidebarProps {
  properties: Building[];
  propertiesLoading: boolean;
  propertiesError: boolean;
  canManage: boolean;
  accountRole: string;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  selectedBuildingId: string;
  onSelectBuilding: (id: string) => void;
  counters: OwnerWorkspaceCounters;
  userRole: UserRole;
}

export const Sidebar: React.FC<SidebarProps> = ({
  properties, propertiesLoading, propertiesError,
  canManage,
  accountRole,
  activeTab,
  onSelectTab,
  selectedBuildingId,
  onSelectBuilding,
  counters,
  userRole,
}) => {
  const unpaidCount = counters.data?.unpaidCount;
  const expiringCount = counters.data?.expiringContractCount;
  const expiredCount = counters.data?.expiredContractCount;
  const maintenanceCount = counters.maintenanceCount;
  const adminMenuItems = [
    { id: 'dashboard' as ActiveTab, label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'properties' as ActiveTab, label: 'Tài sản cho thuê', icon: Building2 },
    { id: 'rooms' as ActiveTab, label: 'Quản lý căn hộ', icon: Home },
    { id: 'rental_requests' as ActiveTab, label: 'Yêu cầu thuê', icon: MessageSquare },
    { id: 'tenants' as ActiveTab, label: 'Khách thuê', icon: Users },
    {
      id: 'contracts' as ActiveTab,
      label: 'Hợp đồng & Ký số',
      icon: FileCheck2,
      badge: (expiringCount ?? 0) > 0 ? `${expiringCount} sắp hết` : undefined,
      secondaryBadge: (expiredCount ?? 0) > 0 ? `${expiredCount} hết hạn` : undefined,
      title: counters.data ? `Sắp hết: hợp đồng ACTIVE đã bắt đầu, hết hạn từ ${counters.data.asOf} đến ${counters.data.expiringThrough}. Đã hết hạn: ACTIVE trước ngày ${counters.data.asOf}, đang chờ xử lý.` : 'Số đếm thời hạn chưa có dữ liệu.',
      badgeColor: 'bg-amber-500 text-slate-950 font-bold',
    },
    {
      id: 'invoices' as ActiveTab,
      label: 'Hóa đơn & Thu',
      icon: ReceiptText,
      badge: (unpaidCount ?? 0) > 0 ? `${unpaidCount} chưa thu` : undefined,
      title: counters.data ? `${counters.data.unpaidMonthlyInvoiceCount} hóa đơn tháng đã gửi và ${counters.data.unpaidAdditionalReceiptCount} phiếu bổ sung gắn đúng người thuê chưa thu; toàn bộ dữ liệu tài sản đang chọn, không chỉ trang hiện tại. Chưa thu không đồng nghĩa quá hạn.` : 'Số đếm chưa thu chưa có dữ liệu.',
      badgeColor: 'bg-rose-600 text-white font-bold',
    },
    { id: 'utilities' as ActiveTab, label: 'Chỉ số Điện Nước', icon: Zap },
    {
      id: 'maintenance' as ActiveTab,
      label: 'Sự cố & Bảo trì',
      icon: Wrench,
      badge: maintenanceCount > 0 ? `${maintenanceCount}` : undefined,
      badgeColor: 'bg-amber-500/90 text-slate-950 font-bold',
    },
    { id: 'finance' as ActiveTab, label: 'Sổ quỹ Thu - Chi', icon: Wallet },
    { id: 'reports' as ActiveTab, label: 'Báo cáo & Thống kê', icon: TrendingUp },
    { id: 'settings' as ActiveTab, label: 'Cài đặt Đơn giá', icon: Settings },
  ];


  return (
    <aside className="w-64 max-w-[85vw] xl:w-72 bg-brand-950 text-brand-100 flex flex-col shrink-0 border-r border-brand-900 select-none min-h-0 h-full overflow-y-auto">
      {/* Building Selector */}
      <div className="p-4 border-b border-brand-800 bg-brand-900/50">
        <label htmlFor="select-building-sidebar" className="text-xs font-bold text-brand-200 uppercase tracking-wider block mb-2">
          Tài sản đang chọn
        </label>
        <select
          id="select-building-sidebar"
          value={selectedBuildingId}
          disabled={propertiesLoading || propertiesError || properties.length === 0}
          onChange={(e) => onSelectBuilding(e.target.value)}
          className="w-full bg-brand-900 border border-brand-700 rounded-xl px-3 py-2.5 text-sm text-white focus:border-brand-400 font-medium cursor-pointer disabled:opacity-60"
        >
          <option value="all">{propertiesLoading ? 'Đang tải tài sản...' : propertiesError ? 'Không thể tải tài sản' : `Tất cả tài sản (${properties.length})`}</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* Navigation Links */}
      <nav aria-label="Quản lý tòa nhà" className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {canManage && counters.loading && <p role="status" className="px-3 py-2 text-xs text-slate-400">Đang tải số đếm…</p>}
        {canManage && counters.error && <div role="alert" className="px-3 py-2 text-xs text-amber-200">Chưa tải được số đếm.<button type="button" title={counters.error} className="block underline mt-1" onClick={counters.reload}>Thử lại số đếm</button></div>}
        {/* Admin Menu */}
        {canManage && <div className="px-3 pt-3 pb-2 text-xs font-bold uppercase tracking-wider text-brand-300">
          Vận Hành Quản Lý
        </div>}

        {adminMenuItems.filter(item => canManage && (item.id !== 'rental_requests' || accountRole === 'OWNER')).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              aria-current={isActive ? 'page' : undefined}
              title={item.title}
              onClick={() => {
                onSelectTab(item.id);
              }}
              className={`w-full flex items-center justify-between gap-1 px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-colors group ${
                isActive
                  ? 'bg-brand-600 text-white font-bold ring-1 ring-brand-400'
                  : 'text-brand-100 hover:bg-brand-800 hover:text-white'
              }`}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <Icon
                  className={`w-[18px] h-[18px] shrink-0 transition-colors ${
                    isActive ? 'text-white' : 'text-brand-300 group-hover:text-white'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {(item.badge || item.secondaryBadge) && (
                <span className="flex flex-col items-end gap-1 shrink-0 ml-1">
                  {item.badge && <span className={`text-[10px] px-1.5 rounded-full ${item.badgeColor}`}>{item.badge}</span>}
                  {item.secondaryBadge && <span className="text-[10px] px-1.5 rounded-full bg-rose-600 text-white">{item.secondaryBadge}</span>}
                </span>
              )}
            </button>
          );
        })}
      </nav>

    </aside>
  );
};
