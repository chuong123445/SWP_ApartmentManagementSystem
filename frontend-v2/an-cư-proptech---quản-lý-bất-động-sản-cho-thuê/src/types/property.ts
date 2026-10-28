export type RentalMode = 'SINGLE_UNIT' | 'MULTI_UNIT';
export interface OwnerProperty {
  id: string; name: string; address: string; city: string; district: string; ward: string | null;
  approvalStatus: 'DRAFT' | 'PENDING_APPROVAL' | 'NEEDS_INFORMATION' | 'APPROVED' | 'REJECTED';
  rentalMode: RentalMode | null; version: number;
  verificationSource?: string | null;
  onboardingApplication?: boolean; rightType?: 'OWNERSHIP' | 'AUTHORIZATION' | 'SUBLEASE' | null; rightsValidFrom?: string | null; rightsValidUntil?: string | null;
}
export interface PropertyUnitInput {
  roomNumber: string; title: string; description: string; floor: number; areaM2: string; advertisedMonthlyRent: string;
  electricityUnitPrice?: string | null; waterUnitPrice?: string | null; deposit: string | null; bedrooms: number | null; bathrooms: number | null; maxOccupants: number | null;
  electricityIndex: number | null; waterIndex: number | null; amenities: string[];
}
export interface PropertyCreateInput {
  name: string; address: string; city: string; district: string; ward: string | null;
  imageIds: string[]; rentalMode: RentalMode; apartments: PropertyUnitInput[];
}
