export type CashDirection = 'INCOME' | 'EXPENSE';
export type CashStatus = 'DRAFT' | 'POSTED' | 'CANCELLED';
export type CashMethod = 'CASH' | 'BANK_TRANSFER';
export interface CashEntry {
  sourceType?:'INVOICE'|'MAINTENANCE'|null; sourceId?:number|null;
  id: number; code: string; propertyId: number; propertyName: string;
  direction: CashDirection; status: CashStatus; paymentMethod: CashMethod;
  amount: string; transactionDate: string; category: string; counterparty: string;
  description: string; reference: string | null; version: number;
  createdAt: string; postedAt: string | null; cancelledAt: string | null;
  createdBy: number; postedBy: number | null; cancelledBy: number | null; cancellationReason: string | null;
}
export interface CashCreate {
  propertyId: number; requestKey: string; direction: CashDirection; paymentMethod: CashMethod;
  amount: string; transactionDate: string; category: string; counterparty: string; description: string; reference: string;
}
export interface CashSummary { income: string; expense: string; netCashflow: string; postedCount: number }
export interface CashFilters { month: string; propertyId?: string; direction?: CashDirection; status?: CashStatus }
