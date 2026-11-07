import { SiteHeader } from '@/components/navigation/SiteHeader';
import { useState, type ReactNode } from 'react';
import { Menu } from 'lucide-react';
import { managementRole } from '@/utils/auth';
import type { AuthUser } from '@/types/auth';
import type { Building } from '@/types';
import type { WorkspaceNavigation } from '@/hooks/useWorkspaceNavigation';
import type { OwnerWorkspaceCounters } from '@/types/owner';

import { Sidebar } from '@/components/navigation/Sidebar';

interface ManagementLayoutProps {
  properties: Building[];
  propertiesLoading: boolean;
  propertiesError: boolean;
  account: AuthUser;
  canManage: boolean;
  navigation: WorkspaceNavigation;
  counters: OwnerWorkspaceCounters;
  onLogout: () => Promise<void>;
  isLoggingOut: boolean;
  authError: string;
  children: ReactNode;
  overlays?: ReactNode;
}

export function ManagementLayout({ account, canManage, navigation, counters, onLogout,
  isLoggingOut, authError, children, overlays, properties, propertiesLoading, propertiesError }: ManagementLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="management-shell flex flex-col h-screen bg-[#f6f8fa] font-sans antialiased text-slate-800 overflow-hidden">
      <SiteHeader account={account} onLogout={onLogout} isLoggingOut={isLoggingOut} authError={authError} />
      <div className="flex flex-1 min-h-0">
      {menuOpen && <button aria-label="Đóng menu quản lý" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-30 bg-slate-900/50 md:hidden" />}
      <div id="management-menu" className={`${menuOpen ? 'flex fixed inset-y-0 left-0 z-40 overflow-y-auto' : 'hidden'} md:flex md:static md:z-auto`}>
      <Sidebar
        properties={properties}
        propertiesLoading={propertiesLoading}
        propertiesError={propertiesError}
        canManage={canManage}
        accountRole={managementRole(account) ?? ''}
        activeTab={navigation.activeTab}
        onSelectTab={tab => { navigation.selectTab(tab); setMenuOpen(false); }}
        selectedBuildingId={navigation.selectedBuildingId}
        onSelectBuilding={id => { navigation.setSelectedBuildingId(id);setMenuOpen(false); }}
        counters={counters}
        userRole={navigation.userRole}
      />
      </div>
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <button type="button" aria-expanded={menuOpen} aria-controls="management-menu" onClick={() => setMenuOpen(value => !value)} className="md:hidden self-start inline-flex items-center gap-2 text-sm font-semibold m-3 mb-0 px-3 py-2 bg-white border border-slate-200 rounded-lg"><Menu className="w-4 h-4" />Menu quản lý</button>

        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">{children}</main>
      </div>
      </div>
      {overlays}
    </div>
  );
}
