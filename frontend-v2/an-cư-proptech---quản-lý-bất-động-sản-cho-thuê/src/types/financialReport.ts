export interface FinancialAmounts {
  invoiceCount:number; paidInvoiceCount:number; onTimePaidInvoiceCount:number;
  billedAmount:string; paidInvoiceAmount:string; unpaidInvoiceAmount:string;
  rentAmount:string; electricityAmount:string; waterAmount:string; serviceAmount:string;
}
export interface FinancialReceipts { monthlyInvoiceAmount:string; additionalAmount:string; totalAmount:string }
export interface FinancialInventory { units:number; occupied:number; vacant:number }
export interface FinancialMonth { period:string; invoices:FinancialAmounts; receipts:FinancialReceipts }
export interface OwnerFinancialSummary {
  propertyId:string|null; year:number; asOf:string; totals:FinancialAmounts; receipts:FinancialReceipts;
  arrears:{monthlyInvoiceCount:number;monthlyInvoiceAmount:string;overdueInvoiceCount:number;overdueInvoiceAmount:string;additionalCount:number;additionalAmount:string};
  inventory:FinancialInventory; months:FinancialMonth[];
  properties:{id:string;name:string;inventory:FinancialInventory;invoices:FinancialAmounts;receipts:FinancialReceipts}[];
}
