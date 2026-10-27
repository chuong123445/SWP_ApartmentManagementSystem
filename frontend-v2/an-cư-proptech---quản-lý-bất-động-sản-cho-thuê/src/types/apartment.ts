export interface PageResult<T> { items: T[]; page: number; size: number; totalElements: number; totalPages: number }
export type ApartmentAvailability = 'VACANT' | 'CONTRACT_IN_PROGRESS' | 'OCCUPIED' | 'MAINTENANCE';
export interface ApartmentSummary {
  lessorRelationship?: 'OWNERSHIP'|'AUTHORIZATION'|'SUBLEASE'|'UNSPECIFIED';
  id: string; title: string; address: string; city: string; district: string;
  areaM2: string; advertisedMonthlyRent: string; thumbnail: string;
  availability: ApartmentAvailability; bedrooms: number; bathrooms: number;
}
export interface ApartmentDetail extends Omit<ApartmentSummary, 'thumbnail'> {
  description: string; propertyName: string; images: string[]; amenities: string[];
  publicationStatus: string; version: number;
  electricityUnitPrice?: string | null; waterUnitPrice?: string | null;
  rightsValidFrom?: string | null; rightsValidUntil?: string | null; rentalRightsAvailable?: boolean;
  publicOwner: { id: string; displayName: string; contactVerified: boolean };
}
export interface ApartmentFilters { q?: string; city?: string; district?: string; ward?: string; minRent?: string; maxRent?: string; bedrooms?: string; page?: number; size?: number }
export interface AddressOption { city: string; district: string; ward: string | null }
