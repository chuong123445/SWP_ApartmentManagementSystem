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
  unpaidCount: number;
  maintenanceCount: number;
  expiringCount: number;
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
  unpaidCount,
  maintenanceCount,
  expiringCount,
  userRole,
}) => {
  const adminMenuItems = [
    { id: 'dashboard' as ActiveTab, label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'properties' as ActiveTab, label: 'Tài sản cho thuê', icon: Building2 },
    { id: 'rooms' as ActiveTab, label: 'Quản lý căn hộ', icon: Home },
    { id: 'rental_requests' as ActiveTab, label: 'Yêu cầu thuê', icon: MessageSquare },
    { id: 'tenants' as ActiveTab, label: 'Khách thuê & eKYC', icon: Users },
    {
      id: 'contracts' as ActiveTab,
      label: 'Hợp đồng & Ký số',
      icon: FileCheck2,
      badge: expiringCount > 0 ? `${expiringCount} sắp hết` : undefined,
      badgeColor: 'bg-amber-500 text-slate-950 font-bold',
    },
    {
      id: 'invoices' as ActiveTab,
      label: 'Hóa đơn & Thu',
      icon: ReceiptText,
      badge: unpaidCount > 0 ? `${unpaidCount} nợ` : undefined,
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
    <aside className="w-64 bg-[#111827] text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none min-h-screen">
      {/* Brand Logo */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-emerald-950/60">
          <Building2 className="w-5 h-5" />
        </div>
        <div className="overflow-hidden">
          <div className="font-bold text-white text-sm tracking-tight flex items-center gap-1.5">
            <span>An Cư PropTech</span>
          </div>
          <p className="text-[11px] text-slate-400 truncate">Bất Động Sản Minh Bạch Pháp Lý</p>
        </div>
      </div>

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
        <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>{userRole === 'admin' ? 'Menu Quản Lý Tòa Nhà' : 'Cổng Dịch Vụ Cư Dân'}</span>
          <span className="text-[10px] text-emerald-400 font-mono">
            {userRole === 'admin' ? accountRole : 'USER'}
          </span>
        </div>

        {canManage ? <button type="button" id="nav-home" onClick={() => onSelectTab('home')}
          aria-current={activeTab === 'home' ? 'page' : undefined}
          className={`w-full flex items-center gap-2.5 px-3 py-2 mb-2 text-xs rounded-lg transition-colors ${activeTab === 'home' ? 'bg-[#065f46] text-white font-bold ring-1 ring-emerald-500' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
          <Home className="w-4 h-4" />Trang chủ
        </button> : <Link to="/" className="flex items-center gap-2.5 px-3 py-2 mb-2 text-xs text-slate-300 rounded-lg hover:bg-slate-800 hover:text-white"><Home className="w-4 h-4" />Trang chủ</Link>}
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
              {item.badge && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Profile Status */}
      <div className="p-3 border-t border-slate-800 flex items-center justify-between text-xs bg-slate-950/40">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-[11px] text-slate-400 font-medium">Hệ thống: Trực tuyến</span>
        </div>
        <span className="text-[10px] font-mono text-emerald-400 font-bold">v3.8-PRO</span>
      </div>
    </aside>
  );
};
