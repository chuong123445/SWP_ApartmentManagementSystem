export type RoomStatus = 'rented' | 'available' | 'overdue' | 'maintenance' | 'expiring' | 'contract_in_progress';


export interface Building {
  rentalMode?: import('@/types/property').RentalMode | null;
  id: string;
  name: string;
  address: string;
  totalRooms: number;
  pcccCertified: boolean;
  legalStatus: string;
}

export interface Room {
  version?: number;
  title?: string;
  propertyName?: string;
  publicationStatus?: string;
  propertyApprovalStatus?: string;
  meterBaselineKnown?: boolean;
  id: string;
  roomNumber: string;
  buildingId: string;
  floor: number;
  area: number; // m2
  price: number; // VND/month
  status: RoomStatus;
  currentTenantId?: string;
  deposit?: number;
  electricityIndex: number;
  waterIndex: number;
  amenities: string[];
  maxOccupants: number;
  image?: string;
  trustGuardVerified?: boolean;
  legalDocType?: 'Sổ hồng lâu dài' | 'HĐMB Chủ đầu tư' | 'Sổ hồng sở hữu có thời hạn';
  legalDocNumber?: string;
  depositEscrowLocked?: boolean;
}

export type NewRoom = Omit<Room, 'id' | 'electricityIndex' | 'waterIndex'> & { electricityIndex: number | null; waterIndex: number | null };

export interface Tenant {
  id: string;
  name: string;
  phone: string;
  idCard: string; // CCCD gắn chip
  roomId: string;
  roomNumber: string;
  buildingName: string;
  startDate: string;
  deposit: number;
  hometown: string;
  status: 'active' | 'departed';
  vehiclePlate?: string;
  ekycVerified?: boolean;
  ekycDate?: string;
  smartCaRegistered?: boolean;
  email?: string;
}

export interface Contract {
  id: string;
  contractNumber: string;
  tenantId: string;
  tenantName: string;
  roomId: string;
  roomNumber: string;
  buildingName: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  deposit: number;
  paymentCycle: number; // months
  status: 'draft' | 'active' | 'expiring' | 'terminated';
  note?: string;
  signingMethod?: 'VNPT SmartCA' | 'Ký OTP SMS' | 'Chữ ký số Viettel-CA';
  signedDate?: string;
  escrowCertified?: boolean;
  escrowCode?: string;
  trustGuardAuditCode?: string;
}

export interface InvoiceItem {
  name: string;
  unit: string;
  oldIndex?: number;
  newIndex?: number;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Invoice {
  apiInvoice?: import('./billing').BillingInvoice;
  id: string;
  invoiceCode: string;
  monthYear: string; // e.g. "09/2026"
  roomId: string;
  roomNumber: string;
  tenantName: string;
  tenantPhone: string;
  createdAt: string;
  dueDate: string;
  status: 'paid' | 'unpaid' | 'overdue';
  items: InvoiceItem[];
  totalAmount: number;
  paidAmount: number;
  paymentMethod?: 'vietqr' | 'cash' | 'transfer';
  paidAt?: string;
}

export interface UtilityReading {
  roomId: string;
  roomNumber: string;
  prevElectric: number;
  newElectric: number;
  prevWater: number;
  newWater: number;
  electricUsage: number;
  waterUsage: number;
  electricAmount: number;
  waterAmount: number;
  isRecorded: boolean;
}

export interface MaintenanceTicket {
  id: string;
  title: string;
  roomNumber: string;
  tenantName: string;
  category: 'electric' | 'water' | 'aircon' | 'furniture' | 'other';
  priority: 'urgent' | 'high' | 'normal';
  status: 'pending' | 'in_progress' | 'resolved';
  cost?: number;
  createdAt: string;
  resolvedAt?: string;
  description: string;
  image?: string;
}

export interface Transaction {
  id: string;
  code: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  roomNumber?: string;
  description: string;
  paymentMethod: string;
}

export interface SystemConfig {
  electricPrice: number; // VND per kWh
  waterPrice: number; // VND per m3
  internetPrice: number; // VND per room
  garbagePrice: number; // VND per room
  bankName: string;
  bankAccount: string;
  accountHolder: string;
  trustGuardEscrowAccount: string;
  trustGuardFeePercent: number;
}

// TrustGuard Legal Verification Dossier
export interface TrustGuardAudit {
  id: string;
  dossierCode: string;
  roomNumber: string;
  buildingName: string;
  ownerName: string;
  ownerPhone: string;
  legalDocType: 'Sổ hồng cá nhân' | 'HĐMB Chủ đầu tư' | 'Quyền sử dụng đất & tài sản gắn liền';
  legalDocNumber: string;
  issuePlace: string;
  issueDate: string;
  pcccApprovalNumber: string;
  pcccStatus: 'Đạt chuẩn PCCC Quốc Gia' | 'Đang gia hạn thẩm duyệt';
  ekycChipMatchRate: number; // e.g. 99.8%
  auditStatus: 'verified' | 'pending' | 'rejected';
  trustScore: number; // 98/100
  escrowDeposit: number;
  auditor: string;
  auditedAt: string;
  docScanUrl: string;
  notes: string;
}

// TrustGuard Escrow Deposit
export interface EscrowDeposit {
  id: string;
  code: string;
  roomNumber: string;
  tenantName: string;
  landlordName: string;
  amount: number;
  createdAt: string;
  releaseConditions: string;
  status: 'locked' | 'released' | 'refunded';
  bankHoldReference: string;
}
