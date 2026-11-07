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
    <aside className="w-64 bg-[#111827] text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none min-h-0 h-full overflow-y-auto">
      {/* Building Selector */}
      <div className="p-3 border-b border-slate-800 bg-slate-900/50">
        <label htmlFor="select-building-sidebar" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
          Tài sản đang chọn
        </label>
        <select
          id="select-building-sidebar"
          value={selectedBuildingId}
          disabled={propertiesLoading || propertiesError || properties.length === 0}
          onChange={(e) => onSelectBuilding(e.target.value)}
          className="w-full bg-[#1e293b] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium cursor-pointer"
        >
          <option value="all">{propertiesLoading ? 'Đang tải tài sản...' : propertiesError ? 'Không thể tải tài sản' : `Tất cả tài sản (${properties.length})`}</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button type="button" onClick={() => onSelectTab('properties')} className="mt-2 text-xs text-emerald-300 underline">Quản lý / thêm tài sản</button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {canManage && counters.loading && <p role="status" className="px-3 py-2 text-xs text-slate-400">Đang tải số đếm…</p>}
        {canManage && counters.error && <div role="alert" className="px-3 py-2 text-xs text-amber-200">Chưa tải được số đếm.<button type="button" title={counters.error} className="block underline mt-1" onClick={counters.reload}>Thử lại số đếm</button></div>}
        <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>{userRole === 'admin' ? 'Menu Quản Lý Tòa Nhà' : 'Cổng Dịch Vụ Cư Dân'}</span>
          <span className="text-[10px] text-emerald-400 font-mono">
            {userRole === 'admin' ? accountRole : 'USER'}
          </span>
        </div>

        {/* Admin Menu */}
        {canManage && <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Vận Hành Quản Lý
        </div>}

        {adminMenuItems.filter(item => canManage && (item.id !== 'rental_requests' || accountRole === 'OWNER')).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              title={item.title}
              onClick={() => {
                onSelectTab(item.id);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group ${
                isActive
                  ? 'bg-[#065f46] text-white shadow-xs font-bold ring-1 ring-emerald-500'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-400'
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
