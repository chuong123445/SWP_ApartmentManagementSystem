import {NotificationBell} from '@/components/navigation/NotificationBell';
import React from 'react';
import { Link } from 'react-router';
import {
  Search,
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
        <NotificationBell key={account.id} accountId={account.id} />

        <AccountMenu account={account} onLogout={onLogout} isLoggingOut={isLoggingOut} authError={authError} />
      </div>
    </header>
  );
};
