export type RentalRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
export interface RentalRequest {
  id: string; apartmentId: string; apartmentTitle: string; address: string;
  advertisedMonthlyRent: string; customerId: string; customerName: string; customerEmail: string;
  decisionReason?: string | null; message: string; status: RentalRequestStatus; createdAt: string; version: number;
}
