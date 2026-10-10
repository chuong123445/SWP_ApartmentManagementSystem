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
import { TrustGuardPage } from '@/pages/owner/TrustGuardPage';
import { FinancePage } from '@/pages/owner/finance/FinancePage';
import { ReportsPage } from '@/pages/owner/finance/ReportsPage';
import { SettingsPage } from '@/pages/owner/SettingsPage';

export function WorkspaceRoutes({ workspace, navigation }: { workspace: RentalWorkspace; navigation: WorkspaceNavigation }) {
  const { activeTab, selectTab: setActiveTab, setIsAddRoomOpen, setIsCreateInvoiceOpen } = navigation;
  const { rooms, tenants, contracts, invoices, tickets, transactions, config, audits, escrows,
    buildings: initialBuildings, setSelectedRoom, setSelectedInvoice, currentResidentRoom, currentResidentTenant,
    currentResidentContract, residentInvoices, residentTickets, handleMarkPaid, handleAddTenant, handleAddContract,
    handleUpdateIndices, handleUpdateTicketStatus, handleApproveAudit, handleReleaseEscrow, handleCreateEscrow,
    handleReserveEscrow, handleResetData, handleSaveConfig: setConfig, handleAddTicket, handleSendResidentTicket,
    handleAddTransaction } = workspace;
  return <>
          {activeTab === 'resident_portal' && (
            <ResidentPortalPage
              currentRoom={currentResidentRoom}
              currentTenant={currentResidentTenant}
              contract={currentResidentContract}
              invoice={residentInvoices[0] || invoices[0]}
              tickets={residentTickets}
              config={config}
              onSendTicket={handleSendResidentTicket}
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
              tenants={tenants}
              rooms={rooms}
              onAddTenant={handleAddTenant}
            />
          )}

          {activeTab === 'contracts' && (
            <ContractsPage
              contracts={contracts}
              rooms={rooms}
              tenants={tenants}
              onAddContract={handleAddContract}
            />
          )}

          {activeTab === 'invoices' && (
            <InvoicesPage
              invoices={invoices}
              onOpenInvoiceModal={(inv) => setSelectedInvoice(inv)}
              onOpenCreateInvoiceModal={() => setIsCreateInvoiceOpen(true)}
              onMarkPaid={handleMarkPaid}
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
              tickets={tickets}
              rooms={rooms}
              onUpdateTicketStatus={handleUpdateTicketStatus}
              onAddTicket={handleAddTicket}
            />
          )}

          {activeTab === 'trustguard' && (
            <TrustGuardPage
              audits={audits}
              escrows={escrows}
              onApproveAudit={handleApproveAudit}
              onReleaseEscrow={handleReleaseEscrow}
              onCreateEscrow={handleCreateEscrow}
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
            <SettingsPage
              config={config}
              onSaveConfig={setConfig}
              onResetData={handleResetData}
            />
          )}
        </>;
}
