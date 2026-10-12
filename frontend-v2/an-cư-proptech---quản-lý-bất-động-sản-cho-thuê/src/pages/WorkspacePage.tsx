import { useAuth } from '@/hooks/useAuth';
import { useRentalWorkspace } from '@/hooks/useRentalWorkspace';
import { useWorkspaceNavigation } from '@/hooks/useWorkspaceNavigation';
import { hasManagementRole } from '@/utils/auth';
import { ManagementLayout } from '@/layouts/ManagementLayout';
import { WorkspaceRoutes } from '@/routes/WorkspaceRoutes';
import { WorkspaceModals } from '@/components/workspace/WorkspaceModals';

// Owner navigation retains shared workspace data while switching management tabs.
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
      {workspace.inventoryLoading && <p role="status" className="p-3 text-sm text-slate-500">Đang tải căn hộ...</p>}
      {workspace.inventoryError && <div role="alert" className="p-3 mb-4 bg-rose-50 text-rose-700 rounded-lg">{workspace.inventoryError}
        <button onClick={workspace.reloadInventory} className="ml-3 underline">Thử lại</button></div>}
      <WorkspaceRoutes workspace={workspace} navigation={navigation} />
    </ManagementLayout>
  );
}
