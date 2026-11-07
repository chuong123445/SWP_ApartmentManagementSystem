export interface Tenancy {
  contractDeposit?: string | null;
  customerEmailVerified?: boolean;
  customerIdentityStatus?: 'VERIFIED' | 'NOT_VERIFIED';
  customerIdentitySource?: string | null;
  inAppSigningStatus?: 'NO_DATA' | 'UNSIGNED' | 'OWNER_SIGNED' | 'CUSTOMER_SIGNED' | 'BOTH_SIGNED';
  localFixture?: boolean;
  id: string; apartmentId: string; roomNumber: string; apartmentTitle: string; propertyName: string;
  customerId: string; customerName: string; customerEmail: string; status: 'DRAFT' | 'ACTIVE' | 'ENDED';
  startDate: string; endDate: string; monthlyRent: string; version: number;
}
export interface BillingTariff { electricityUnitPrice:string;waterUnitPrice:string;waterBillingMode:'METERED'|'PER_PERSON';internetFee:string;garbageFee:string;version:number; }
export interface MeterReadingInput {period:string;baselineVersion:number;electricityEndReading:string;waterEndReading:string;applyPropertyRates:boolean;keepSavedTariff?:boolean;settingsVersion?:number;}
export interface BillingContext {
  savedReading?:{electricityEndReading:string;waterEndReading:string;propertyRates:boolean;savedAt:string}|null;
  propertyTariff?:BillingTariff|null;contractTariff?:BillingTariff;
  waterBillingMode?:'METERED'|'PER_PERSON';occupantCount?:number;internetFee?:string;garbageFee?:string;
  contractId: string; apartmentId: string; roomNumber: string; tenantName: string; period: string;
  monthlyRent: string; electricityStartReading: string; electricityUnitPrice: string;
  waterStartReading: string; waterUnitPrice: string; baselineVersion: number;
}
export interface BillingInvoice {
  waterBillingMode?:'METERED'|'PER_PERSON';occupantCount?:number;internetFee?:string;garbageFee?:string;
  id: string; contractId: string; apartmentId: string; customerId: string; roomNumber: string; apartmentTitle: string;
  tenantName: string; period: string; dueDate: string; monthlyRent: string;
  electricityStartReading: string; electricityEndReading: string; electricityQuantity: string; electricityUnitPrice: string; electricityAmount: string;
  waterStartReading: string; waterEndReading: string; waterQuantity: string; waterUnitPrice: string; waterAmount: string;
  paymentStatus?: 'UNPAID'|'PAID'; paidAt?: string|null;
  totalAmount: string; status: 'DRAFT' | 'SENT'; createdAt: string; sentAt: string | null; version: number;
}
export interface InvoiceCreate {
  period: string; dueDate: string; electricityEndReading?: string; waterEndReading?: string; baselineVersion: number; useSavedReadings?:boolean;
}
