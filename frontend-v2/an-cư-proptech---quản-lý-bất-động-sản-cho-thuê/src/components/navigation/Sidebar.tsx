import React from 'react';
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
  ChevronDown,
  MessageSquare,
} from 'lucide-react';
import { ActiveTab, UserRole, Building } from '@/types';
import type { OwnerWorkspaceCounters } from '@/types/owner';
import '@/styles/management-sidebar.css';

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


  const groups = [
    { label: 'Tổng quan & tài sản', tabs: ['dashboard', 'properties', 'rooms'] },
    { label: 'Khách thuê & hợp đồng', tabs: ['rental_requests', 'tenants', 'contracts'] },
    { label: 'Tài chính', tabs: ['invoices', 'utilities', 'finance', 'reports'] },
    { label: 'Vận hành', tabs: ['maintenance', 'settings'] },
  ];

  return <aside className="management-sidebar" aria-label="Thanh quản lý">
    <div className="ms-property-wrap">
      <div className="ms-property-label"><span className="ms-property-icon"><Building2 size={17} strokeWidth={1.7} aria-hidden="true" /></span><label htmlFor="select-building-sidebar">Tài sản đang chọn</label></div>
      <div className="ms-property-select">
        <select id="select-building-sidebar" value={selectedBuildingId}
          disabled={propertiesLoading || propertiesError || properties.length === 0}
          onChange={event => onSelectBuilding(event.target.value)}>
          <option value="all">{propertiesLoading ? 'Đang tải tài sản...' : propertiesError ? 'Không thể tải tài sản' : `Tất cả tài sản (${properties.length})`}</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <ChevronDown size={15} aria-hidden="true" />
      </div>
    </div>
    <nav aria-label="Quản lý tòa nhà" className="ms-navigation">
      {canManage && counters.loading && <p role="status" className="ms-counter-status">Đang tải số đếm…</p>}
      {canManage && counters.error && <div role="alert" className="ms-counter-error">Chưa tải được số đếm.<button type="button" title={counters.error} onClick={counters.reload}>Thử lại số đếm</button></div>}
      {groups.map(group => {
        const items = adminMenuItems.filter(item => canManage && group.tabs.includes(item.id) && (item.id !== 'rental_requests' || accountRole === 'OWNER'));
        if (!items.length) return null;
        return <div key={group.label} className="ms-group">
          <h2 className="ms-group-label">{group.label}</h2>
          <div className="ms-group-items">{items.map(item => {
            const Icon = item.icon;
            const selected = activeTab === item.id;
            return <button key={item.id} type="button" id={`nav-${item.id}`} title={item.title}
              aria-current={selected ? 'page' : undefined}
              className={`ms-link${selected ? ' ms-link-active' : ''}`}
              onClick={() => onSelectTab(item.id)}>
              <span className="ms-link-icon"><Icon size={18} strokeWidth={1.65} aria-hidden="true" /></span>
              <span className="ms-link-label">{item.label}</span>
              {(item.badge || item.secondaryBadge) && <span className="ms-badges">
                {item.badge && <span className={`ms-badge ${item.id === 'invoices' ? 'ms-badge-rose' : 'ms-badge-amber'}`}>{item.badge}</span>}
                {item.secondaryBadge && <span className="ms-badge ms-badge-rose">{item.secondaryBadge}</span>}
              </span>}
            </button>;
          })}</div>
        </div>;
      })}
    </nav>
  </aside>;
};
