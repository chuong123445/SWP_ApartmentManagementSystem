import { useAuth } from '@/hooks/useAuth';
import { useRentalWorkspace } from '@/hooks/useRentalWorkspace';
import { useWorkspaceNavigation } from '@/hooks/useWorkspaceNavigation';
import { hasManagementRole } from '@/utils/auth';
import { ManagementLayout } from '@/layouts/ManagementLayout';
import { WorkspaceRoutes } from '@/routes/WorkspaceRoutes';
import { WorkspaceModals } from '@/components/workspace/WorkspaceModals';

// One workspace preserves the Owner's existing role-preview/navigation behavior.
// Pages are grouped by role; shared data stays mounted while switching tabs.
export function WorkspacePage() {
  const { user, logout, isLoggingOut, error } = useAuth();
  const canManage = hasManagementRole(user!);
  const navigation = useWorkspaceNavigation(canManage);
  const workspace = useRentalWorkspace(canManage, navigation.resetToDashboard);
  return (
    <ManagementLayout
      account={user!}
      canManage={canManage}
      navigation={navigation}
      counters={workspace}
      onLogout={logout}
      isLoggingOut={isLoggingOut}
      authError={error}
      overlays={<WorkspaceModals workspace={workspace} navigation={navigation} />}
    >
      <WorkspaceRoutes workspace={workspace} navigation={navigation} />
    </ManagementLayout>
  );
}
