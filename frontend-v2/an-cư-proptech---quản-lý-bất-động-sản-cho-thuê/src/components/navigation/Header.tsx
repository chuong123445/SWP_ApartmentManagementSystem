import React, { useState } from 'react';
import { Link } from 'react-router';
import {
  Search,
  Bell,
  Plus,
  Zap,
  CreditCard,
} from 'lucide-react';
import { UserRole } from '@/types';
import type { AuthUser } from '@/types/auth';
import { AccountMenu } from '@/components/navigation/AccountMenu';

interface HeaderProps {
  account: AuthUser;
  onLogout: () => Promise<void>;
  isLoggingOut: boolean;
  authError: string;
  userRole: UserRole;
  onQuickAction: (action: 'add-room' | 'add-tenant' | 'add-invoice' | 'record-meter' | 'collect-rent') => void;
  searchQuery: string;
  onSearchChange: (val: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  account,
  onLogout,
  isLoggingOut,
  authError,
  userRole,
  onQuickAction,
  searchQuery,
  onSearchChange,
}) => {
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const notifications = [
    { id: 1, text: 'Hóa đơn phòng P.104 quá hạn thanh toán 17 ngày', time: '10 phút trước', type: 'urgent' },
    { id: 2, text: 'Căn hộ P.101 vừa được bảo chứng cọc An Cư Escrow MBBank', time: '1 giờ trước', type: 'success' },
    { id: 3, text: 'Sự cố máy lạnh P.104 đang chờ kỹ thuật viên tiếp nhận', time: '2 giờ trước', type: 'warning' },
  ];

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-xs">
      {/* Search Box */}
      <div className="flex-1 max-w-md relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          id="input-global-search"
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Tìm phòng (P.101, P.202...), CCCD, tên khách thuê..."
          className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all"
        />
      </div>

      {/* Center/Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Action Buttons for Admin */}
        {userRole === 'admin' && (
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => onQuickAction('add-invoice')}
              id="btn-header-quick-invoice"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo Hóa Đơn</span>
            </button>

            <button
              onClick={() => onQuickAction('collect-rent')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
              <span>Thu Tiền Phòng</span>
            </button>

            <button
              onClick={() => onQuickAction('record-meter')}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-semibold transition-colors"
            >
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span>Ghi Điện Nước</span>
            </button>
          </div>
        )}

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors relative"
            title="Thông báo vận hành"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
              3
            </span>
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 text-xs animate-in fade-in zoom-in-95">
              <div className="px-3 py-2 border-b border-slate-100 font-bold text-slate-900 flex items-center justify-between">
                <span>Thông Báo Vận Hành & Pháp Lý</span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                  3 mới
                </span>
              </div>
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {notifications.map((n) => (
                  <div key={n.id} className="p-3 hover:bg-slate-50 cursor-pointer transition-colors">
                    <p className="text-slate-800 font-medium">{n.text}</p>
                    <span className="text-[10px] text-slate-400 mt-1 block">{n.time}</span>
                  </div>
                ))}
              </div>
              <div className="px-3 py-1.5 border-t border-slate-100 text-center">
                <button
                  onClick={() => setIsNotifOpen(false)}
                  className="text-[11px] text-slate-500 hover:text-slate-800 font-semibold"
                >
                  Đóng thông báo
                </button>
              </div>
            </div>
          )}
        </div>

        <AccountMenu account={account} onLogout={onLogout} isLoggingOut={isLoggingOut} authError={authError} />
      </div>
    </header>
  );
};
