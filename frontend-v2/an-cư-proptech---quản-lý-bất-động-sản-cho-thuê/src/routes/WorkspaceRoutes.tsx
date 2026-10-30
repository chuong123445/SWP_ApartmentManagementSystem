import type { RentalWorkspace } from '@/hooks/useRentalWorkspace';
import type { WorkspaceNavigation } from '@/hooks/useWorkspaceNavigation';
import { ResidentPortalPage } from '@/pages/resident/ResidentPortalPage';
import { ApartmentListingPage } from '@/pages/customer/ApartmentListingPage';
import { DashboardPage } from '@/pages/owner/DashboardPage';
import { RoomsPage } from '@/pages/owner/RoomsPage';
import { TenantsPage } from '@/pages/owner/TenantsPage';
import { ContractsPage } from '@/pages/owner/ContractsPage';
import { InvoicesPage } from '@/pages/owner/billing/InvoicesPage';
import { UtilitiesPage } from '@/pages/owner/billing/UtilitiesPage';
import { MaintenancePage } from '@/pages/owner/MaintenancePage';
import { FinancePage } from '@/pages/owner/finance/FinancePage';
import { ReportsPage } from '@/pages/owner/finance/ReportsPage';
import { SettingsPage } from '@/pages/owner/SettingsPage';
import { RentalRequestsPage } from '@/pages/owner/RentalRequestsPage';
import { PropertiesPage } from '@/pages/owner/PropertiesPage';
import { HomePage } from '@/pages/customer/HomePage';

export function WorkspaceRoutes({ workspace, navigation }: { workspace: RentalWorkspace; navigation: WorkspaceNavigation }) {
  const { activeTab, selectTab: setActiveTab, setIsAddRoomOpen, setIsCreateInvoiceOpen } = navigation;
  const { rooms, tenants, contracts, invoices, tickets, transactions, config,
    buildings: initialBuildings, setSelectedRoom, setSelectedInvoice, currentResidentRoom, currentResidentTenant,
    currentResidentContract, residentInvoices, residentTickets, handleMarkPaid, handleAddTenant, handleAddContract,
    handleUpdateIndices,
    handleReserveEscrow, 
    handleAddTransaction } = workspace;
  return <>
          {activeTab === 'home' && <HomePage embedded />}
          {activeTab === 'properties' && <PropertiesPage properties={initialBuildings} onReload={workspace.reloadInventory} onDossier={navigation.setPropertyForDossierId} onAdd={() => navigation.setIsAddPropertyOpen(true)} onSelect={id => { navigation.setSelectedBuildingId(id);setActiveTab('rooms'); }} />}
          {activeTab === 'rental_requests' && <RentalRequestsPage key={navigation.selectedBuildingId} propertyId={navigation.selectedBuildingId === 'all' ? undefined : navigation.selectedBuildingId} onDecision={workspace.reloadInventory} />}
          {activeTab === 'resident_portal' && (!currentResidentRoom || !currentResidentTenant || !currentResidentContract || !residentInvoices[0]) && <section className="bg-white p-6 rounded-xl border"><h1 className="text-xl font-bold">Cổng cư dân</h1><p className="mt-3 text-slate-500">Chưa có đủ quan hệ thuê và hóa đơn đã gửi để xem màn hình này.</p></section>}
          {activeTab === 'resident_portal' && currentResidentRoom && currentResidentTenant && currentResidentContract && residentInvoices[0] && (
            <ResidentPortalPage
              currentRoom={currentResidentRoom}
              currentTenant={currentResidentTenant}
              contract={currentResidentContract}
              invoice={residentInvoices[0]}
              tickets={residentTickets}
              config={config}
              onSendTicket={() => window.location.assign('/my/maintenance')}
              onPayInvoice={handleMarkPaid}
              onOpenApartmentMarket={() => setActiveTab('market')}
            />
          )}

          {activeTab === 'market' && (
            <ApartmentListingPage
              rooms={rooms}
              buildings={initialBuildings}
              config={config}
              onSelectRoom={(rm) => setSelectedRoom(rm)}
              onReserveRoom={handleReserveEscrow}
            />
          )}

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

          {activeTab === 'rooms' && (
            <RoomsPage
              rooms={rooms}
              tenants={tenants}
              onOpenRoomModal={(rm) => setSelectedRoom(rm)}
              onOpenAddRoomModal={() => setIsAddRoomOpen(true)}
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

          {activeTab === 'reports' && <ReportsPage />}

          {activeTab === 'settings' && (
            <SettingsPage key={navigation.selectedBuildingId} propertyId={navigation.selectedBuildingId} onDossier={navigation.setPropertyForDossierId} />
          )}
        </>;
}
