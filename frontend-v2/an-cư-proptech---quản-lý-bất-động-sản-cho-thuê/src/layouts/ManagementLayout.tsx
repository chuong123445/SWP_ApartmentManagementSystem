import type { ReactNode } from 'react';
import type { AuthUser } from '@/types/auth';
import type { WorkspaceNavigation } from '@/hooks/useWorkspaceNavigation';
import { Header } from '@/components/navigation/Header';
import { Sidebar } from '@/components/navigation/Sidebar';

interface ManagementLayoutProps {
  account: AuthUser;
  canManage: boolean;
  navigation: WorkspaceNavigation;
  counters: { unpaidCount: number; maintenanceCount: number; expiringCount: number };
  onLogout: () => Promise<void>;
  isLoggingOut: boolean;
  authError: string;
  children: ReactNode;
  overlays?: ReactNode;
}

export function ManagementLayout({ account, canManage, navigation, counters, onLogout,
  isLoggingOut, authError, children, overlays }: ManagementLayoutProps) {
  return (
    <div className="flex h-screen bg-[#f3f4f6] font-sans antialiased text-slate-800 overflow-hidden">
      <Sidebar
        canManage={canManage}
        accountRole={account.roles[0]}
        activeTab={navigation.activeTab}
        onSelectTab={navigation.selectTab}
        selectedBuildingId={navigation.selectedBuildingId}
        onSelectBuilding={navigation.setSelectedBuildingId}
        unpaidCount={counters.unpaidCount}
        maintenanceCount={counters.maintenanceCount}
        expiringCount={counters.expiringCount}
        userRole={navigation.userRole}
        onSelectRole={navigation.handleSelectRole}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header
          account={account}
          onLogout={onLogout}
          isLoggingOut={isLoggingOut}
          authError={authError}
          userRole={navigation.userRole}
          onSelectRole={navigation.handleSelectRole}
          onQuickAction={navigation.handleQuickAction}
          onNavigateTab={navigation.selectTab}
          searchQuery={navigation.searchQuery}
          onSearchChange={navigation.setSearchQuery}
        />
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">{children}</main>
      </div>
      {overlays}
    </div>
  );
}
