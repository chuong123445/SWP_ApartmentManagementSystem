import { useEffect, useState } from 'react';
import type { Building, Room, NewRoom, Tenant, Contract, Invoice, MaintenanceTicket, Transaction, SystemConfig, TrustGuardAudit, EscrowDeposit } from '@/types';
import { initialMaintenance, initialTransactions, initialConfig, initialTrustAudits, initialEscrows } from '@/data/mockData';
import { createOwnerApartment, getOwnerApartments, getOwnerProperties, setApartmentPublication, updateApartmentBasic, updateApartmentSensitive, type ApartmentBasicUpdatePayload, type ApartmentSensitiveUpdatePayload } from '@/services/apartments/ownerApartmentService';
import { ownerTenancies, ownerInvoices, tenancyViews, invoiceView, sendInvoice } from '@/services/billing/billingService';
import type { Tenancy } from '@/types/billing';
import { createOwnerProperty } from '@/services/property/ownerPropertyService';
import type { PropertyCreateInput } from '@/types/property';

function getStoredRoomBaselines(): Record<string, { electricityIndex: number; waterIndex: number }> {
  try {
    const raw = localStorage.getItem('ancu_room_baselines');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function getStoredPaidInvoices(): Record<string, { paidAt: string }> {
  try {
    const raw = localStorage.getItem('ancu_paid_invoices');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

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
  const [audits, setAudits] = useState<TrustGuardAudit[]>(initialTrustAudits);
  const [escrows, setEscrows] = useState<EscrowDeposit[]>(initialEscrows);

  // Meter readings state connected between Utilities page and CreateInvoiceModal
  const [utilityReadings, setUtilityReadings] = useState<Record<string, { newElectric: string; newWater: string }>>(() => {
    try {
      const raw = localStorage.getItem('ancu_utility_readings');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

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
      const savedBaselines = getStoredRoomBaselines();
      const inventory = apartments.map(a => {
        const base = savedBaselines[a.id];
        return {
          ...a,
          electricityIndex: base?.electricityIndex ?? a.electricityIndex,
          waterIndex: base?.waterIndex ?? a.waterIndex,
          currentTenantId: leases.find(c => c.apartmentId === a.id && c.status === 'ACTIVE')?.customerId,
        };
      });
      setRooms(inventory);setSelectedRoom(prev => prev ? inventory.find(a => a.id === prev.id) ?? null : null);
      setBuildings(properties.map(p => ({ id: p.id, name: p.name, address: p.address,
        rentalMode: p.rentalMode, totalRooms: apartments.filter(a => a.buildingId === p.id).length, pcccCertified: false, legalStatus: p.approvalStatus })));

      // Initialize any missing utilityReadings
      setUtilityReadings(prev => {
        let changed = false;
        const next = { ...prev };
        inventory.forEach(r => {
          if (!next[r.id]) {
            next[r.id] = {
              newElectric: r.meterBaselineKnown === false ? '' : r.electricityIndex.toString(),
              newWater: r.meterBaselineKnown === false ? '' : r.waterIndex.toString(),
            };
            changed = true;
          }
        });
        if (changed) {
          try { localStorage.setItem('ancu_utility_readings', JSON.stringify(next)); } catch { /* ignore */ }
        }
        return next;
      });
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
    ownerInvoices(invoicePage, 20, selectedPropertyId === 'all' ? undefined : selectedPropertyId).then(data => {
      if (active) {
        const paidMap = getStoredPaidInvoices();
        const mapped = data.items.map(item => {
          const inv = invoiceView(item);
          if (paidMap[inv.id]) {
            inv.status = 'paid';
            inv.paidAmount = inv.totalAmount;
            inv.paidAt = paidMap[inv.id].paidAt;
          }
          return inv;
        });
        setInvoices(mapped);
        setInvoiceTotalPages(data.totalPages);
      }
    })
      .catch(e => { if (active) { setInvoices([]);setBillingError(e.message); } }).finally(() => { if (active) setBillingLoading(false); });
    return () => { active = false; };
  }, [canManage, invoicePage, billingRevision, selectedPropertyId]);
  // ==========================================

  // Confirm payment for utility/invoice: shifts "Điện mới" to "Điện cũ", "Nước mới" to "Nước cũ"
  const handleConfirmPayment = (roomId: string, invoiceId?: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    const currentRecord = utilityReadings[roomId];
    const newElectric = Number(currentRecord?.newElectric) || room.electricityIndex;
    const newWater = Number(currentRecord?.newWater) || room.waterIndex;

    // 1. Shift new readings into old readings for this room
    setRooms(prev => prev.map(r => r.id === roomId ? {
      ...r,
      electricityIndex: newElectric,
      waterIndex: newWater,
    } : r));

    try {
      const baselines = getStoredRoomBaselines();
      baselines[roomId] = { electricityIndex: newElectric, waterIndex: newWater };
      localStorage.setItem('ancu_room_baselines', JSON.stringify(baselines));
    } catch { /* ignore */ }

    // 2. Reset utilityReadings for this room so the new inputs equal the new old readings
    setUtilityReadings(prev => {
      const next = {
        ...prev,
        [roomId]: {
          newElectric: newElectric.toString(),
          newWater: newWater.toString(),
        },
      };
      try { localStorage.setItem('ancu_utility_readings', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });

    // 3. Mark invoice paid if exists
    const nowStr = new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const targetInv = invoices.find(i => (invoiceId ? i.id === invoiceId : i.roomId === roomId) && i.status !== 'paid');

    if (targetInv) {
      try {
        const paidMap = getStoredPaidInvoices();
        paidMap[targetInv.id] = { paidAt: nowStr };
        localStorage.setItem('ancu_paid_invoices', JSON.stringify(paidMap));
      } catch { /* ignore */ }

      setInvoices(prev => prev.map(i => i.id === targetInv.id ? {
        ...i,
        status: 'paid',
        paidAmount: i.totalAmount,
        paidAt: nowStr,
      } : i));

      if (selectedInvoice?.id === targetInv.id) {
        setSelectedInvoice(prev => prev ? { ...prev, status: 'paid', paidAmount: prev.totalAmount, paidAt: nowStr } : null);
      }
    }

    // 4. Record income transaction
    const eUsage = Math.max(0, newElectric - room.electricityIndex);
    const wUsage = Math.max(0, newWater - room.waterIndex);
    const utilityTotal = (eUsage * config.electricPrice) + (wUsage * config.waterPrice);
    const amount = targetInv ? targetInv.totalAmount : (utilityTotal > 0 ? utilityTotal : 500000);

    setTransactions(prev => [{
      id: `tx-${Date.now()}`,
      code: `THU-0926-${Math.floor(100 + Math.random() * 900)}`,
      date: new Date().toLocaleDateString('vi-VN'),
      type: 'income',
      category: 'Tiền điện nước & Tiền phòng',
      amount,
      roomNumber: room.roomNumber,
      description: `Thu phí điện (${newElectric} kWh), nước (${newWater} m³) căn hộ ${room.roomNumber}`,
      paymentMethod: 'Chuyển khoản MBBank / VietQR',
    }, ...prev]);

    return { newElectric, newWater };
  };

  const handleMarkPaid = (invoiceId: string) => {
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv) return;
    const nowStr = new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    try {
      const paidMap = getStoredPaidInvoices();
      paidMap[invoiceId] = { paidAt: nowStr };
      localStorage.setItem('ancu_paid_invoices', JSON.stringify(paidMap));
    } catch { /* ignore */ }

    setInvoices(prev => prev.map(i => i.id === invoiceId ? {
      ...i,
      status: 'paid',
      paidAmount: i.totalAmount,
      paidAt: nowStr,
    } : i));

    if (selectedInvoice?.id === invoiceId) {
      setSelectedInvoice(prev => prev ? { ...prev, status: 'paid', paidAmount: prev.totalAmount, paidAt: nowStr } : null);
    }

    // Shift readings for the room!
    const room = rooms.find(r => r.id === inv.roomId);
    const eEnd = inv.apiInvoice ? Number(inv.apiInvoice.electricityEndReading) : (inv.items.find(x => x.name.toLowerCase().includes('điện'))?.newIndex ?? (room ? room.electricityIndex : 0));
    const wEnd = inv.apiInvoice ? Number(inv.apiInvoice.waterEndReading) : (inv.items.find(x => x.name.toLowerCase().includes('nước'))?.newIndex ?? (room ? room.waterIndex : 0));

    if (room && (eEnd > 0 || wEnd > 0)) {
      setRooms(prev => prev.map(r => r.id === room.id ? {
        ...r,
        electricityIndex: eEnd,
        waterIndex: wEnd,
      } : r));

      try {
        const baselines = getStoredRoomBaselines();
        baselines[room.id] = { electricityIndex: eEnd, waterIndex: wEnd };
        localStorage.setItem('ancu_room_baselines', JSON.stringify(baselines));
      } catch { /* ignore */ }

      setUtilityReadings(prev => {
        const next = {
          ...prev,
          [room.id]: {
            newElectric: eEnd.toString(),
            newWater: wEnd.toString(),
          },
        };
        try { localStorage.setItem('ancu_utility_readings', JSON.stringify(next)); } catch { /* ignore */ }
        return next;
      });
    }

    setTransactions(prev => [{
      id: `tx-${Date.now()}`,
      code: `THU-0926-${Math.floor(100 + Math.random() * 900)}`,
      date: new Date().toLocaleDateString('vi-VN'),
      type: 'income',
      category: 'Tiền điện nước & Tiền phòng',
      amount: inv.totalAmount,
      roomNumber: inv.roomNumber,
      description: `Thu tiền hóa đơn ${inv.monthYear} căn hộ ${inv.roomNumber} (${inv.tenantName})`,
      paymentMethod: 'Chuyển khoản MBBank / VietQR',
    }, ...prev]);
  };

  const handleUpdateSingleReading = (roomId: string, field: 'newElectric' | 'newWater', value: string) => {
    setUtilityReadings(prev => {
      const next = {
        ...prev,
        [roomId]: {
          ...(prev[roomId] ?? { newElectric: '', newWater: '' }),
          [field]: value,
        },
      };
      try { localStorage.setItem('ancu_utility_readings', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

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
  const handlePublication = async (room: Room, status: 'PUBLISHED' | 'HIDDEN') => {
    if (room.version === undefined) throw new Error('Cần tải lại căn hộ trước khi thay đổi đăng tin.');
    try {
      const saved = await setApartmentPublication(room.id, status, room.version);
      setRooms(prev => prev.map(r => r.id === saved.id ? { ...r, ...saved } : r));
      setSelectedRoom(prev => prev?.id === saved.id ? { ...prev, ...saved } : prev);
    } catch (error) { setInventoryRevision(n => n + 1);throw error; }
  };
  const handleUpdateBasic = async (roomId: string, payload: ApartmentBasicUpdatePayload) => {
    try {
      const saved = await updateApartmentBasic(roomId, payload);
      setRooms(prev => prev.map(r => r.id === saved.id ? { ...r, ...saved } : r));
      setSelectedRoom(prev => prev?.id === saved.id ? { ...prev, ...saved } : prev);
      return saved;
    } catch (error) { setInventoryRevision(n => n + 1); throw error; }
  };
  const handleUpdateSensitive = async (roomId: string, payload: ApartmentSensitiveUpdatePayload) => {
    try {
      const saved = await updateApartmentSensitive(roomId, payload);
      setRooms(prev => prev.map(r => r.id === saved.id ? { ...r, ...saved } : r));
      setSelectedRoom(prev => prev?.id === saved.id ? { ...prev, ...saved } : prev);
      return saved;
    } catch (error) { setInventoryRevision(n => n + 1); throw error; }
  };
  // ==========================================

  // Do not release a real Apartment through a preview action.
  const handleCheckOut = (_roomId: string) => setInventoryError('Chưa hỗ trợ kết thúc hợp đồng và bàn giao qua màn hình này.');

  // Update meter indices: CHỈ lưu và đồng bộ vào utilityReadings cho Lập Hóa Đơn, KHÔNG đổi điện cũ thành điện mới!
  const handleUpdateIndices = (updates: { roomId: string; electric: number; water: number }[]) => {
    setUtilityReadings((prev) => {
      const next = { ...prev };
      updates.forEach((u) => {
        next[u.roomId] = {
          newElectric: u.electric.toString(),
          newWater: u.water.toString(),
        };
      });
      try {
        localStorage.setItem('ancu_utility_readings', JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
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
    try {
      localStorage.removeItem('ancu_room_baselines');
      localStorage.removeItem('ancu_utility_readings');
      localStorage.removeItem('ancu_paid_invoices');
    } catch { /* ignore */ }
    setInventoryRevision(value => value + 1);
    setBillingRevision(value => value + 1);
    setTickets(initialMaintenance);
    setTransactions(initialTransactions);
    setConfig(initialConfig);
    setAudits(initialTrustAudits);
    setEscrows(initialEscrows);
    onReset();
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
    rooms, tenants, contracts, invoices, tickets, transactions, config, audits, escrows,
    tenancies, billingError, billingLoading, invoicePage, setInvoicePage, invoiceTotalPages,
    reloadBilling: () => setBillingRevision(value => value + 1), handleSendInvoice,
    buildings, inventoryError, inventoryLoading, reloadInventory: () => setInventoryRevision(value => value + 1),
    selectedRoom, setSelectedRoom, selectedInvoice, setSelectedInvoice,
    utilityReadings, handleConfirmPayment, handleUpdateSingleReading,
    handleMarkPaid, handleAddTenant, handleAddContract, handleAddRoom, handleAddProperty, handlePublication, handleCheckOut,
    handleUpdateBasic, handleUpdateSensitive,
    handleUpdateIndices, handleUpdateTicketStatus, handleResetData, handleApproveAudit,
    handleReleaseEscrow, handleCreateEscrow, handleReserveEscrow, handleAddTicket,
    handleSendResidentTicket, handleCreateInvoice, handleAddTransaction, handleSaveConfig: setConfig,
    currentResidentTenant, currentResidentRoom, currentResidentContract, residentInvoices, residentTickets,
    unpaidCount, maintenanceCount, expiringCount,
  };
}

export type RentalWorkspace = ReturnType<typeof useRentalWorkspace>;
