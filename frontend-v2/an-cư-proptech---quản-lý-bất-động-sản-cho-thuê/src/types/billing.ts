export interface Tenancy {
  id: string; apartmentId: string; roomNumber: string; apartmentTitle: string; propertyName: string;
  customerId: string; customerName: string; customerEmail: string; status: 'DRAFT' | 'ACTIVE' | 'ENDED';
  startDate: string; endDate: string; monthlyRent: string; version: number;
}
export interface BillingContext {
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
  totalAmount: string; status: 'DRAFT' | 'SENT'; createdAt: string; sentAt: string | null; version: number;
}
export interface InvoiceCreate {
  period: string; dueDate: string; electricityEndReading: string; waterEndReading: string; baselineVersion: number;
}
