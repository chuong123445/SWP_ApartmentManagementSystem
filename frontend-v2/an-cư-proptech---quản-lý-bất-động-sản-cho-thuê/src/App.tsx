import React, { useState, useEffect } from 'react';
import {
  ActiveTab,
  UserRole,
  Room,
  NewRoom,
  Tenant,
  Contract,
  Invoice,
  MaintenanceTicket,
  Transaction,
  SystemConfig,
  TrustGuardAudit,
  EscrowDeposit,
} from './types';
import {
  initialRooms,
  initialTenants,
  initialContracts,
  initialInvoices,
  initialMaintenance,
  initialTransactions,
  initialConfig,
  initialTrustAudits,
  initialEscrows,
  initialBuildings,
} from './mockData';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { RoomsView } from './components/RoomsView';
import { TenantsView } from './components/TenantsView';
import { ContractsView } from './components/ContractsView';
import { InvoicesView } from './components/InvoicesView';
import { UtilitiesView } from './components/UtilitiesView';
import { MaintenanceView } from './components/MaintenanceView';
import { FinanceView } from './components/FinanceView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { TrustGuardView } from './components/TrustGuardView';
import { ResidentPortalView } from './components/ResidentPortalView';
import { ApartmentListingView } from './components/ApartmentListingView';
import { RoomDetailModal } from './components/RoomDetailModal';
import { InvoiceDetailModal } from './components/InvoiceDetailModal';
import { CreateInvoiceModal } from './components/CreateInvoiceModal';
import { AddRoomModal } from './components/AddRoomModal';
import { createRoom, getRooms } from './api/rooms';

export default function App() {
  // Địa chỉ Backend Java của bạn
  const API_BASE_URL = "http://localhost:8080/api";

  // Global Data States
  const [rooms, setRooms] = useState<Room[]>(initialRooms);
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants);
  const [contracts, setContracts] = useState<Contract[]>(initialContracts);
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [tickets, setTickets] = useState<MaintenanceTicket[]>(initialMaintenance);
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [config, setConfig] = useState<SystemConfig>(initialConfig);
  const [audits, setAudits] = useState<TrustGuardAudit[]>(initialTrustAudits);
  const [escrows, setEscrows] = useState<EscrowDeposit[]>(initialEscrows);

  // User & RBAC State
  const [userRole, setUserRole] = useState<UserRole>('admin');

  // Navigation & UI States
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);

  // ==========================================
  // ĐOẠN MÃ MỚI: TỰ ĐỘNG LẤY DỮ LIỆU TỪ JAVA
  // ==========================================
  useEffect(() => {
    const fetchRoomsFromBackend = async () => {
      try {
        setRooms(await getRooms(API_BASE_URL));
      } catch (error) {
        console.warn("Chưa gọi được Backend, đang dùng tạm dữ liệu giả trên trình duyệt", error);
      }
    };
    fetchRoomsFromBackend();
  }, []);
  // ==========================================

  // Switch role handler
  const handleSelectRole = (newRole: UserRole) => {
    setUserRole(newRole);
    if (newRole === 'user' || newRole === 'resident') {
      setActiveTab('resident_portal');
    } else if (newRole === 'seeker') {
      setActiveTab('market');
    } else {
      setActiveTab('dashboard');
    }
  };

  // Quick Action Handler from Header
  const handleQuickAction = (
    action: 'add-room' | 'add-tenant' | 'add-invoice' | 'record-meter' | 'collect-rent'
  ) => {
    switch (action) {
      case 'add-room':
        setIsAddRoomOpen(true);
        break;
      case 'add-tenant':
        setActiveTab('tenants');
        break;
      case 'add-invoice':
        setIsCreateInvoiceOpen(true);
        break;
      case 'record-meter':
        setActiveTab('utilities');
        break;
      case 'collect-rent':
        setActiveTab('invoices');
        break;
    }
  };

  // Mark invoice as paid
  const handleMarkPaid = (invoiceId: string) => {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoiceId
          ? {
              ...inv,
              status: 'paid',
              paidAmount: inv.totalAmount,
              paidAt: `${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN')}`,
            }
          : inv
      )
    );

    const paidInv = invoices.find((i) => i.id === invoiceId);
    if (paidInv) {
      setTransactions((prev) => [
        {
          id: `tx-${Date.now()}`,
          code: `THU-0926-${Math.floor(100 + Math.random() * 900)}`,
          date: new Date().toLocaleDateString('vi-VN'),
          type: 'income',
          category: 'Tiền thuê phòng',
          amount: paidInv.totalAmount,
          roomNumber: paidInv.roomNumber,
          description: `Thu tiền phòng ${paidInv.roomNumber} (${paidInv.tenantName}) qua VietQR Napas247`,
          paymentMethod: 'VietQR / MBBank',
        },
        ...prev,
      ]);
    }

    if (selectedInvoice && selectedInvoice.id === invoiceId) {
      setSelectedInvoice((prev) =>
        prev
          ? {
              ...prev,
              status: 'paid',
              paidAmount: prev.totalAmount,
              paidAt: new Date().toLocaleDateString('vi-VN'),
            }
          : null
      );
    }
  };

  // Add new tenant
  const handleAddTenant = (newTenantData: Omit<Tenant, 'id'>) => {
    const newId = `ten-${Date.now()}`;
    const newTenant: Tenant = { ...newTenantData, id: newId };
    setTenants((prev) => [newTenant, ...prev]);

    // Update room status
    setRooms((prev) =>
      prev.map((r) =>
        r.id === newTenantData.roomId
          ? { ...r, status: 'rented', currentTenantId: newId, deposit: newTenantData.deposit }
          : r
      )
    );
  };

  // Add new contract
  const handleAddContract = (newContractData: Omit<Contract, 'id'>) => {
    const newContract: Contract = {
      ...newContractData,
      id: `hd-${Date.now()}`,
    };
    setContracts((prev) => [newContract, ...prev]);
  };

  // ==========================================
  // ĐOẠN MÃ MỚI: LƯU PHÒNG VÀO SQL QUA JAVA
  // ==========================================
  const handleAddRoom = async (newRoom: NewRoom) => {
    const savedRoom = await createRoom(API_BASE_URL, newRoom);
    setRooms((prev) => [savedRoom, ...prev]);
  };
  // ==========================================

  // Checkout / Terminate room
  const handleCheckOut = (roomId: string) => {
    setRooms((prev) =>
      prev.map((r) =>
        r.id === roomId ? { ...r, status: 'available', currentTenantId: undefined } : r
      )
    );
  };

  // Update meter indices
  const handleUpdateIndices = (updates: { roomId: string; electric: number; water: number }[]) => {
    setRooms((prev) =>
      prev.map((r) => {
        const u = updates.find((item) => item.roomId === r.id);
        if (u) {
          return {
            ...r,
            electricityIndex: u.electric,
            waterIndex: u.water,
          };
        }
        return r;
      })
    );
  };

  // Update ticket status
  const handleUpdateTicketStatus = (
    ticketId: string,
    status: 'pending' | 'in_progress' | 'resolved',
    cost?: number
  ) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              status,
              cost: cost !== undefined ? cost : t.cost,
              resolvedAt: status === 'resolved' ? new Date().toLocaleDateString('vi-VN') : undefined,
            }
          : t
      )
    );

    if (status === 'resolved' && cost && cost > 0) {
      const ticket = tickets.find((t) => t.id === ticketId);
      setTransactions((prev) => [
        {
          id: `tx-${Date.now()}`,
          code: `CHI-0926-${Math.floor(100 + Math.random() * 900)}`,
          date: new Date().toLocaleDateString('vi-VN'),
          type: 'expense',
          category: 'Sửa chữa & Bảo trì',
          amount: cost,
          roomNumber: ticket?.roomNumber,
          description: `Chi trả thợ sửa chữa sự cố: ${ticket?.title || ''} (${ticket?.roomNumber || ''})`,
          paymentMethod: 'Chuyển khoản MBBank',
        },
        ...prev,
      ]);
    }
  };

  // Reset all data
  const handleResetData = () => {
    setRooms(initialRooms);
    setTenants(initialTenants);
    setContracts(initialContracts);
    setInvoices(initialInvoices);
    setTickets(initialMaintenance);
    setTransactions(initialTransactions);
    setConfig(initialConfig);
    setAudits(initialTrustAudits);
    setEscrows(initialEscrows);
    setActiveTab('dashboard');
  };

  // TrustGuard Audit Handlers
  const handleApproveAudit = (auditId: string) => {
    setAudits((prev) =>
      prev.map((a) =>
        a.id === auditId
          ? {
              ...a,
              auditStatus: 'verified',
              trustScore: 99,
              auditedAt: new Date().toLocaleDateString('vi-VN'),
              notes: `${a.notes} [Đã phê duyệt đạt chuẩn An Cư TrustGuard™]`,
            }
          : a
      )
    );
  };

  const handleReleaseEscrow = (escrowId: string) => {
    setEscrows((prev) =>
      prev.map((e) =>
        e.id === escrowId
          ? {
              ...e,
              status: 'released',
              releasedAt: new Date().toLocaleDateString('vi-VN'),
            }
          : e
      )
    );
  };

  const handleCreateEscrow = (newEscrow: Omit<EscrowDeposit, 'id'>) => {
    const item: EscrowDeposit = {
      ...newEscrow,
      id: `esc-${Date.now()}`,
    };
    setEscrows((prev) => [item, ...prev]);
  };

  // Reserve room with escrow deposit
  const handleReserveEscrow = (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;

    const newEscrow: EscrowDeposit = {
      id: `esc-${Date.now()}`,
      code: `ESC-2026-${room.roomNumber.replace('.', '')}-HOLD`,
      roomNumber: room.roomNumber,
      tenantName: 'Khách Đặt Giữ Chỗ Online',
      landlordName: 'Lê Văn Tuấn (Chủ sở hữu)',
      amount: room.deposit || room.price,
      createdAt: new Date().toLocaleDateString('vi-VN'),
      releaseConditions: 'Bảo chứng giữ chỗ 48h. Tự động chuyển thành tiền cọc hợp đồng khi ký số.',
      status: 'locked',
      bankHoldReference: `MB-ESCROW-HOLD-${Math.floor(100000 + Math.random() * 900000)}`,
    };

    setEscrows((prev) => [newEscrow, ...prev]);
    alert(`Đã tạo hồ sơ Ký Quỹ Giữ Chỗ Escrow cho căn hộ ${room.roomNumber} thành công!`);
  };

  // Resident Portal specific data
  const currentResidentTenant = tenants.find((t) => t.roomNumber === 'P.101') || tenants[0];
  const currentResidentRoom = rooms.find((r) => r.id === currentResidentTenant?.roomId) || rooms[0];
  const currentResidentContract = contracts.find((c) => c.tenantId === currentResidentTenant?.id) || contracts[0];
  const residentInvoices = invoices.filter((i) => i.roomNumber === currentResidentRoom?.roomNumber);
  const residentTickets = tickets.filter((t) => t.roomNumber === currentResidentRoom?.roomNumber);

  // Counters for sidebar badges
  const unpaidCount = invoices.filter((i) => i.status !== 'paid').length;
  const maintenanceCount = tickets.filter((t) => t.status !== 'resolved').length;
  const expiringCount = contracts.filter((c) => c.status === 'expiring').length;

  return (
    <div className="flex h-screen bg-[#f3f4f6] font-sans antialiased text-slate-800 overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        selectedBuildingId={selectedBuildingId}
        onSelectBuilding={setSelectedBuildingId}
        unpaidCount={unpaidCount}
        maintenanceCount={maintenanceCount}
        expiringCount={expiringCount}
        userRole={userRole}
        onSelectRole={handleSelectRole}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header
          userRole={userRole}
          onSelectRole={handleSelectRole}
          onQuickAction={handleQuickAction}
          onNavigateTab={setActiveTab}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {activeTab === 'resident_portal' && (
            <ResidentPortalView
              currentRoom={currentResidentRoom}
              currentTenant={currentResidentTenant}
              contract={currentResidentContract}
              invoice={residentInvoices[0] || invoices[0]}
              tickets={residentTickets}
              config={config}
              onSendTicket={(newTicket: Omit<MaintenanceTicket, 'id' | 'createdAt'>) =>
                setTickets((prev) => [
                  {
                    ...newTicket,
                    id: `tk-${Date.now()}`,
                    createdAt: `${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN')}`,
                  },
                  ...prev,
                ])
              }
              onPayInvoice={handleMarkPaid}
              onOpenApartmentMarket={() => setActiveTab('market')}
            />
          )}

          {activeTab === 'market' && (
            <ApartmentListingView
              rooms={rooms}
              buildings={initialBuildings}
              config={config}
              onSelectRoom={(rm) => setSelectedRoom(rm)}
              onReserveRoom={handleReserveEscrow}
            />
          )}

          {activeTab === 'dashboard' && (
            <DashboardView
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
            <RoomsView
              rooms={rooms}
              tenants={tenants}
              onOpenRoomModal={(rm) => setSelectedRoom(rm)}
              onOpenAddRoomModal={() => setIsAddRoomOpen(true)}
            />
          )}

          {activeTab === 'tenants' && (
            <TenantsView
              tenants={tenants}
              rooms={rooms}
              onAddTenant={handleAddTenant}
            />
          )}

          {activeTab === 'contracts' && (
            <ContractsView
              contracts={contracts}
              rooms={rooms}
              tenants={tenants}
              onAddContract={handleAddContract}
            />
          )}

          {activeTab === 'invoices' && (
            <InvoicesView
              invoices={invoices}
              onOpenInvoiceModal={(inv) => setSelectedInvoice(inv)}
              onOpenCreateInvoiceModal={() => setIsCreateInvoiceOpen(true)}
              onMarkPaid={handleMarkPaid}
            />
          )}

          {activeTab === 'utilities' && (
            <UtilitiesView
              rooms={rooms}
              tenants={tenants}
              config={config}
              onUpdateIndices={handleUpdateIndices}
            />
          )}

          {activeTab === 'maintenance' && (
            <MaintenanceView
              tickets={tickets}
              rooms={rooms}
              onUpdateTicketStatus={handleUpdateTicketStatus}
              onAddTicket={(ticket) =>
                setTickets((prev) => [
                  {
                    ...ticket,
                    id: `sc-${Date.now()}`,
                    createdAt: `${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN')}`,
                  },
                  ...prev,
                ])
              }
            />
          )}

          {activeTab === 'trustguard' && (
            <TrustGuardView
              audits={audits}
              escrows={escrows}
              onApproveAudit={handleApproveAudit}
              onReleaseEscrow={handleReleaseEscrow}
              onCreateEscrow={handleCreateEscrow}
            />
          )}

          {activeTab === 'finance' && (
            <FinanceView
              transactions={transactions}
              onAddTransaction={(tx) =>
                setTransactions((prev) => [
                  {
                    ...tx,
                    id: `tx-${Date.now()}`,
                    code: `${tx.type === 'income' ? 'THU' : 'CHI'}-0926-${Math.floor(
                      100 + Math.random() * 900
                    )}`,
                  },
                  ...prev,
                ])
              }
            />
          )}

          {activeTab === 'reports' && <ReportsView />}

          {activeTab === 'settings' && (
            <SettingsView
              config={config}
              onSaveConfig={setConfig}
              onResetData={handleResetData}
            />
          )}
        </main>
      </div>

      {selectedRoom && (
        <RoomDetailModal
          room={selectedRoom}
          tenant={tenants.find((t) => t.id === selectedRoom.currentTenantId)}
          contract={contracts.find((c) => c.roomId === selectedRoom.id)}
          latestInvoice={invoices.find((i) => i.roomId === selectedRoom.id)}
          onClose={() => setSelectedRoom(null)}
          onOpenInvoiceModal={(inv) => {
            setSelectedRoom(null);
            setSelectedInvoice(inv);
          }}
          onCheckOut={handleCheckOut}
          onReserveEscrow={handleReserveEscrow}
        />
      )}

      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          config={config}
          onClose={() => setSelectedInvoice(null)}
          onMarkPaid={handleMarkPaid}
        />
      )}

      {isCreateInvoiceOpen && (
        <CreateInvoiceModal
          rooms={rooms}
          tenants={tenants}
          config={config}
          onClose={() => setIsCreateInvoiceOpen(false)}
          onCreateInvoice={(newInv) => setInvoices((prev) => [newInv, ...prev])}
        />
      )}

      {isAddRoomOpen && (
        <AddRoomModal onClose={() => setIsAddRoomOpen(false)} onAddRoom={handleAddRoom} />
      )}
    </div>
  );
}
