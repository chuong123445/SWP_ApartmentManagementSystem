export type RentalMode = 'SINGLE_UNIT' | 'MULTI_UNIT';
export interface OwnerProperty {
  id: string; name: string; address: string; city: string; district: string; ward: string | null;
  approvalStatus: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  rentalMode: RentalMode | null; version: number;
}
export interface PropertyUnitInput {
  roomNumber: string; title: string; description: string; floor: number; areaM2: string; advertisedMonthlyRent: string;
  deposit: string | null; bedrooms: number | null; bathrooms: number | null; maxOccupants: number | null;
  electricityIndex: number | null; waterIndex: number | null; amenities: string[];
}
export interface PropertyCreateInput {
  name: string; address: string; city: string; district: string; ward: string | null;
  rentalMode: RentalMode; apartments: PropertyUnitInput[];
}
