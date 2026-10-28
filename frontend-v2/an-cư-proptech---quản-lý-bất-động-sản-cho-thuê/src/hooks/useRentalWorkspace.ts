import { updateApartmentPrices } from '@/services/apartments/ownerApartmentService';
import type { PriceInput } from '@/components/rooms/ApartmentPriceForm';
import { useEffect, useState } from 'react';
import type { Building, Room, NewRoom, Tenant, Contract, Invoice, MaintenanceTicket, Transaction, SystemConfig, EscrowDeposit } from '@/types';
import { initialMaintenance, initialTransactions, initialConfig, initialEscrows } from '@/data/mockData';
import { createOwnerApartment, getOwnerApartments, getOwnerProperties, setApartmentPublication } from '@/services/apartments/ownerApartmentService';
import { ownerTenancies, ownerInvoices, tenancyViews, invoiceView, sendInvoice } from '@/services/billing/billingService';
import type { Tenancy } from '@/types/billing';
import { createOwnerProperty } from '@/services/property/ownerPropertyService';
import type { PropertyCreateInput } from '@/types/property';

export function useRentalWorkspace(canManage: boolean, onReset: () => void, selectedPropertyId = 'all') {
  // Global Data States
  const [rooms, setRooms] = useState<Room[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [inventoryError, setInventoryError] = useState('');
  const [inventoryLoading, setInventoryLoading] = useState(canManage);
  const [inventoryRevision, setInventoryRevision] = useState(0);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [billingError, setBillingError] = useState('');
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingRevision, setBillingRevision] = useState(0);
  const [invoicePage, setInvoicePage] = useState(0);
  const [invoiceTotalPages, setInvoiceTotalPages] = useState(0);
  const [tickets, setTickets] = useState<MaintenanceTicket[]>(initialMaintenance);
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [config, setConfig] = useState<SystemConfig>(initialConfig);
  const [escrows, setEscrows] = useState<EscrowDeposit[]>(initialEscrows);

  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  useEffect(() => {
    if (!canManage) return;
    let active = true;
    setInventoryLoading(true); setInventoryError('');
    Promise.all([getOwnerApartments(), getOwnerProperties(), ownerTenancies()]).then(([apartments, properties, leases]) => {
      if (!active) return;
      setTenancies(leases);
      const views = tenancyViews(leases);setTenants(views.tenants);setContracts(views.contracts);
      const inventory = apartments.map(a => ({ ...a, currentTenantId: leases.find(c => c.apartmentId === a.id && c.status === 'ACTIVE')?.customerId }));
      setRooms(inventory);setSelectedRoom(prev => prev ? inventory.find(a => a.id === prev.id) ?? null : null);
      setBuildings(properties.map(p => ({ id: p.id, name: p.name, address: p.address,
        rentalMode: p.rentalMode, verificationSource: p.verificationSource, rightType:p.rightType,rightsValidFrom:p.rightsValidFrom,rightsValidUntil:p.rightsValidUntil,totalRooms: apartments.filter(a => a.buildingId === p.id).length, pcccCertified: false, legalStatus: p.approvalStatus })));
    }).catch(error => { if (active) { setRooms([]); setBuildings([]); setInventoryError(error instanceof Error ? error.message : 'Không thể tải căn hộ.'); } })
      .finally(() => { if (active) setInventoryLoading(false); });
    return () => { active = false; };
  }, [canManage, inventoryRevision]);
  useEffect(() => {
    setInvoicePage(0);
  }, [selectedPropertyId]);
  useEffect(() => {
    if (!canManage) return;
    let active = true;setBillingLoading(true);setBillingError('');
    ownerInvoices(invoicePage, 20, selectedPropertyId === 'all' ? undefined : selectedPropertyId).then(data => { if (active) { setInvoices(data.items.map(invoiceView));setInvoiceTotalPages(data.totalPages); } })
      .catch(e => { if (active) { setInvoices([]);setBillingError(e.message); } }).finally(() => { if (active) setBillingLoading(false); });
    return () => { active = false; };
  }, [canManage, invoicePage, billingRevision, selectedPropertyId]);
  // ==========================================

  // Payment/provider integration is not implemented; do not mark real invoices paid locally.
  const handleMarkPaid = (_invoiceId: string) => setBillingError('Thanh toán chưa được tích hợp. Hóa đơn chưa được xác nhận đã thanh toán.');

  // Tenancy assignment and contract lifecycle require server workflows, not local rows.
  const handleAddTenant = (_input: Omit<Tenant, 'id'>) => setInventoryError('Chưa hỗ trợ tạo quan hệ thuê qua màn hình này.');
  const handleAddContract = (_input: Omit<Contract, 'id'>) => setInventoryError('Luồng tạo và ký hợp đồng chưa được triển khai.');

  // ==========================================
  // ĐOẠN MÃ MỚI: LƯU PHÒNG VÀO SQL QUA JAVA
  // ==========================================
  const handleAddRoom = async (newRoom: NewRoom) => {
    const savedRoom = await createOwnerApartment(newRoom);
    setRooms((prev) => [savedRoom, ...prev]);
    setBuildings(prev => prev.map(p => p.id === savedRoom.buildingId ? { ...p, totalRooms: p.totalRooms + 1 } : p));
  };
  const handleAddProperty = async (input: PropertyCreateInput) => {
    const saved = await createOwnerProperty(input);
    setBuildings(prev => [...prev, { id: saved.property.id, name: saved.property.name, address: saved.property.address,
      rentalMode: saved.property.rentalMode, legalStatus: saved.property.approvalStatus, pcccCertified: false, totalRooms: saved.apartments.length }]);
    setRooms(prev => [...saved.apartments, ...prev]);
    return saved.property.id;
  };
  const handlePrices = async (room: Room,input: PriceInput) => {
    if(room.version===undefined)throw new Error('Tải lại căn hộ trước khi cập nhật giá.');
    try{const saved=await updateApartmentPrices(room.id,room.version,input);setRooms(prev=>prev.map(r=>r.id===saved.id?{...r,...saved}:r));setSelectedRoom(prev=>prev?.id===saved.id?{...prev,...saved}:prev);}
    catch(error){setInventoryRevision(v=>v+1);throw error;}
  };
  const handlePublication = async (room: Room, status: 'PUBLISHED' | 'HIDDEN') => {
    if (room.version === undefined) throw new Error('Cần tải lại căn hộ trước khi thay đổi đăng tin.');
    try {
      const saved = await setApartmentPublication(room.id, status, room.version);
      setRooms(prev => prev.map(r => r.id === saved.id ? { ...r, ...saved } : r));
      setSelectedRoom(prev => prev?.id === saved.id ? { ...prev, ...saved } : prev);
    } catch (error) { setInventoryRevision(n => n + 1);throw error; }
  };
  // ==========================================

  // Do not release a real Apartment through a preview action.
  const handleCheckOut = (_roomId: string) => setInventoryError('Chưa hỗ trợ kết thúc hợp đồng và bàn giao qua màn hình này.');

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
    setInventoryRevision(value => value + 1);
    setBillingRevision(value => value + 1);
    setTickets(initialMaintenance);
    setTransactions(initialTransactions);
    setConfig(initialConfig);
    setEscrows(initialEscrows);
    onReset();
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
  const residentInvoices = invoices.filter((i) => i.roomId === currentResidentRoom?.id && i.apiInvoice?.status === 'SENT');
  const residentTickets = tickets.filter((t) => t.roomNumber === currentResidentRoom?.roomNumber);

  // Counters for sidebar badges
  const unpaidCount = invoices.filter((i) => i.apiInvoice?.status === 'SENT').length;
  const maintenanceCount = tickets.filter((t) => t.status !== 'resolved').length;
  const expiringCount = contracts.filter((c) => c.status === 'expiring').length;


  const handleAddTicket = (ticket: Omit<MaintenanceTicket, 'id' | 'createdAt'>) =>
    setTickets(prev => [{ ...ticket, id: `sc-${Date.now()}`, createdAt: `${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN')}` }, ...prev]);
  const handleSendResidentTicket = (ticket: Omit<MaintenanceTicket, 'id' | 'createdAt'>) =>
    setTickets(prev => [{ ...ticket, id: `tk-${Date.now()}`, createdAt: `${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN')}` }, ...prev]);
  const handleCreateInvoice = (_invoice: Invoice) => setBillingRevision(value => value + 1);
  const handleSendInvoice = async (id: string) => {
    const source = invoices.find(i => i.id === id)?.apiInvoice;
    if (!source) throw new Error('Không tìm thấy hóa đơn để gửi.');
    const sent = invoiceView(await sendInvoice(id, source.version));
    setInvoices(prev => prev.map(i => i.id === id ? sent : i));
    setSelectedInvoice(prev => prev?.id === id ? sent : prev);
    setBillingRevision(value => value + 1);
  };
  const handleAddTransaction = (tx: Omit<Transaction, 'id' | 'code'>) => setTransactions(prev => [{
    ...tx, id: `tx-${Date.now()}`, code: `${tx.type === 'income' ? 'THU' : 'CHI'}-0926-${Math.floor(100 + Math.random() * 900)}`,
  }, ...prev]);
  return {
    rooms, tenants, contracts, invoices, tickets, transactions, config, escrows,
    tenancies, billingError, billingLoading, invoicePage, setInvoicePage, invoiceTotalPages,
    reloadBilling: () => setBillingRevision(value => value + 1), handleSendInvoice,
    buildings, inventoryError, inventoryLoading, reloadInventory: () => setInventoryRevision(value => value + 1),
    selectedRoom, setSelectedRoom, selectedInvoice, setSelectedInvoice,
    handleMarkPaid, handleAddTenant, handleAddContract, handleAddRoom, handleAddProperty, handlePrices, handlePublication, handleCheckOut,
    handleUpdateIndices, handleUpdateTicketStatus, handleResetData,
    handleReserveEscrow, handleAddTicket,
    handleSendResidentTicket, handleCreateInvoice, handleAddTransaction, handleSaveConfig: setConfig,
    currentResidentTenant, currentResidentRoom, currentResidentContract, residentInvoices, residentTickets,
    unpaidCount, maintenanceCount, expiringCount,
  };
}

export type RentalWorkspace = ReturnType<typeof useRentalWorkspace>;
