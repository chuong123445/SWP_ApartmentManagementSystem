import {Navigate} from 'react-router';
import type { RentalWorkspace } from '@/hooks/useRentalWorkspace';
import type { WorkspaceNavigation } from '@/hooks/useWorkspaceNavigation';
import { DashboardPage } from '@/pages/owner/DashboardPage';
import { TenantsPage } from '@/pages/owner/TenantsPage';
import { ContractsPage } from '@/pages/owner/ContractsPage';
import { InvoicesPage } from '@/pages/owner/billing/InvoicesPage';
import { UtilitiesPage } from '@/pages/owner/billing/UtilitiesPage';
import { MaintenancePage } from '@/pages/owner/MaintenancePage';
import { FinancePage } from '@/pages/owner/finance/FinancePage';
import { ReportsPage } from '@/pages/owner/finance/ReportsPage';
import { RentalRequestsPage } from '@/pages/owner/RentalRequestsPage';

export function WorkspaceRoutes({ workspace, navigation }: { workspace: RentalWorkspace; navigation: WorkspaceNavigation }) {
  const { activeTab, selectTab: setActiveTab, setIsCreateInvoiceOpen } = navigation;
  const { rooms, tenants, contracts, invoices, tickets, transactions, config, buildings: initialBuildings,
    setSelectedRoom, setSelectedInvoice, handleMarkPaid, handleAddTenant, handleUpdateIndices,
    handleAddTransaction } = workspace;
  return <>
          {activeTab === 'home' && <Navigate to="/"/>}
          {['properties','rooms','settings'].includes(activeTab)&&<Navigate to="/account/properties"/>}
          {activeTab === 'rental_requests' && <RentalRequestsPage key={navigation.selectedBuildingId} propertyId={navigation.selectedBuildingId === 'all' ? undefined : navigation.selectedBuildingId} onDecision={workspace.reloadInventory} />}
          {['market','resident_portal'].includes(activeTab)&&<Navigate to="/"/>}

          {activeTab === 'dashboard' && (
            <DashboardPage
              propertyName={navigation.selectedBuildingId === 'all' ? 'Tất cả tài sản' : initialBuildings.find(p => p.id === navigation.selectedBuildingId)?.name ?? 'Tài sản'}
              rooms={rooms}
              invoices={invoices}
              tickets={tickets}
              contracts={contracts}
              onNavigateTab={setActiveTab}
              onOpenInvoiceModal={(inv) => setSelectedInvoice(inv)}
              onOpenRoomModal={(rm) => setSelectedRoom(rm)}
            />
          )}

          {activeTab === 'tenants' && (
            <TenantsPage
              readOnly
              tenants={tenants}
              rooms={rooms}
              onAddTenant={handleAddTenant}
            />
          )}

          {activeTab === 'contracts' && (
            <ContractsPage
              contracts={contracts}
              propertyId={navigation.selectedBuildingId === 'all' ? undefined : navigation.selectedBuildingId}
              onChooseRequest={() => setActiveTab('rental_requests')}
            />
          )}

          {activeTab === 'invoices' && (
            <InvoicesPage
              invoices={invoices}
              onOpenInvoiceModal={(inv) => setSelectedInvoice(inv)}
              onOpenCreateInvoiceModal={() => setIsCreateInvoiceOpen(true)}
              onSendInvoice={workspace.handleSendInvoice}
              error={workspace.billingError} loading={workspace.billingLoading} onReload={workspace.reloadBilling}
              page={workspace.invoicePage} totalPages={workspace.invoiceTotalPages} onPageChange={workspace.setInvoicePage}
            />
          )}

          {activeTab === 'utilities' && (
            <UtilitiesPage
              rooms={rooms}
              tenants={tenants}
              config={config}
              onUpdateIndices={handleUpdateIndices}
            />
          )}

          {activeTab === 'maintenance' && (
            <MaintenancePage
              key={navigation.selectedBuildingId}
              tickets={tickets}
              loading={workspace.maintenanceLoading}
              places={[...initialBuildings.filter(p=>navigation.selectedBuildingId==='all'||p.id===navigation.selectedBuildingId).map(p=>({value:`property-${p.id}`,label:`${p.name} — Toàn tòa`,propertyId:p.id})),...rooms.map(r=>({value:`room-${r.id}`,label:r.roomNumber,propertyId:r.buildingId,apartmentId:r.id}))]}
              error={workspace.maintenanceError}
              onReload={workspace.reloadInventory}
            />
          )}

          {activeTab === 'finance' && (
            <FinancePage
              transactions={transactions}
              onAddTransaction={handleAddTransaction}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsPage />
          )}


        </>;
}
