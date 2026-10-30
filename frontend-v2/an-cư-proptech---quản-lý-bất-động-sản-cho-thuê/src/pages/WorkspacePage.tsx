import { useAuth } from '@/hooks/useAuth';
import { useRentalWorkspace } from '@/hooks/useRentalWorkspace';
import { useWorkspaceNavigation } from '@/hooks/useWorkspaceNavigation';
import { hasManagementRole } from '@/utils/auth';
import { ManagementLayout } from '@/layouts/ManagementLayout';
import { WorkspaceRoutes } from '@/routes/WorkspaceRoutes';
import { WorkspaceModals } from '@/components/workspace/WorkspaceModals';
import { Link } from 'react-router';
import { useEffect } from 'react';

// Owner navigation retains shared workspace data while switching management tabs.
export function WorkspacePage() {
  const { user, logout, isLoggingOut, error } = useAuth();
  const canManage = hasManagementRole(user!);
  const navigation = useWorkspaceNavigation(canManage);
  const workspace = useRentalWorkspace(canManage, navigation.resetToDashboard, navigation.selectedBuildingId);
  const reloadInventory = workspace.reloadInventory;
  useEffect(() => {
    if (canManage && (navigation.activeTab === 'tenants' || navigation.activeTab === 'invoices' || navigation.isCreateInvoiceOpen))
      reloadInventory();
  }, [canManage, navigation.activeTab, navigation.isCreateInvoiceOpen, reloadInventory]);
  const propertyId = navigation.selectedBuildingId;
  const rooms = propertyId === 'all' ? workspace.rooms : workspace.rooms.filter(r => r.buildingId === propertyId);
  const roomIds = new Set(rooms.map(r => r.id));
  const scoped = { ...workspace, rooms,
    tenants: workspace.tenants.filter(t => roomIds.has(t.roomId)),
    contracts: workspace.contracts.filter(c => roomIds.has(c.roomId)),
    tenancies: workspace.tenancies.filter(c => roomIds.has(c.apartmentId)),
    invoices: workspace.invoices.filter(i => roomIds.has(i.roomId)),
  };
  const empty = !workspace.inventoryLoading && !workspace.inventoryError && workspace.buildings.length === 0;
  useEffect(() => {
    workspace.setSelectedRoom(null);workspace.setSelectedInvoice(null);
    navigation.setIsAddRoomOpen(false);navigation.setIsCreateInvoiceOpen(false);
  }, [propertyId]);
  useEffect(() => {
    if (!workspace.inventoryLoading && !workspace.inventoryError && propertyId !== 'all' && !workspace.buildings.some(p => p.id === propertyId))
      navigation.setSelectedBuildingId('all');
  }, [workspace.inventoryLoading, workspace.inventoryError, workspace.buildings, propertyId]);
  return (
    <ManagementLayout
      account={user!}
      canManage={canManage}
      properties={workspace.buildings}
      propertiesLoading={workspace.inventoryLoading}
      propertiesError={!!workspace.inventoryError}
      navigation={navigation}
      counters={{ unpaidCount: scoped.invoices.filter(i => i.apiInvoice?.status === 'SENT').length,
        maintenanceCount: workspace.maintenanceCount, expiringCount: scoped.contracts.filter(c => c.status === 'expiring').length }}
      onLogout={logout}
      isLoggingOut={isLoggingOut}
      authError={error}
      overlays={<WorkspaceModals workspace={scoped} navigation={navigation} />}
    >
      {workspace.inventoryLoading && <p role="status" className="p-3 text-sm text-slate-500">Đang tải căn hộ...</p>}
      {workspace.inventoryError && <div role="alert" className="p-3 mb-4 bg-rose-50 text-rose-700 rounded-lg">{workspace.inventoryError}
        <button onClick={workspace.reloadInventory} className="ml-3 underline">Thử lại</button></div>}
      {empty && navigation.activeTab !== 'home' ? <section className="bg-white border rounded-2xl p-6 md:p-10 space-y-4">
        <h1 className="text-2xl font-bold">Thêm tài sản cho thuê</h1>
        <p className="text-slate-600">Bạn chưa có tài sản. Bắt đầu với một căn/nhà cho thuê nguyên căn hoặc tài sản gồm nhiều căn/phòng.</p>
        <p className="text-sm text-slate-500">Tài sản mới được lưu nháp và cần kiểm duyệt trước khi công khai.</p>
        <Link to="/account/properties" className="inline-block bg-emerald-600 text-white px-4 py-3 rounded-lg font-semibold">Mở quản lý tài sản</Link>
      </section> : <>
        {navigation.activeTab !== 'home' && propertyId !== 'all' && <p className="mb-4 text-sm text-slate-600">Tài sản đang chọn: <strong>{workspace.buildings.find(p => p.id === propertyId)?.name}</strong></p>}
        <WorkspaceRoutes workspace={scoped} navigation={navigation} />
      </>}
    </ManagementLayout>
  );
}
