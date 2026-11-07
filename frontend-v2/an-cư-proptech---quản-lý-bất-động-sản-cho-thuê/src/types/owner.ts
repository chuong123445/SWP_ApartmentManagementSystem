export interface OwnerWorkspaceSummary {
  propertyId: string | null; asOf: string; expiringThrough: string;
  unpaidMonthlyInvoiceCount: number; unpaidAdditionalReceiptCount: number; unpaidCount: number;
  expiringContractCount: number; expiredContractCount: number;
}
export interface OwnerWorkspaceCounters {
  data: OwnerWorkspaceSummary | null; loading: boolean; error: string; reload: () => void;
  maintenanceCount: number;
}
