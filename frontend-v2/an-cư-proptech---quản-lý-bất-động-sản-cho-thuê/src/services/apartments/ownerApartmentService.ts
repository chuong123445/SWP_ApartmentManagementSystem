import type { NewRoom, Room, RoomStatus } from '@/types';
import { apiFetch, readApiError } from '@/services/http/client';

import type { OwnerProperty } from '@/types/property';
export type { OwnerProperty } from '@/types/property';
interface OwnerApartment {
  version: number;
  id: string; propertyId: string; propertyName: string; ownerId: string;
  roomNumber: string; title: string; description?: string; floor: number | null; areaM2: string;
  advertisedMonthlyRent: string; deposit: string | null;
  electricityIndex: number | null; waterIndex: number | null; maxOccupants: number | null;
  bedrooms?: number | null; bathrooms?: number | null;
  amenities: string[]; publicationStatus: string; availability: string; propertyApprovalStatus: string;
  thumbnail?: string;
  editApprovalStatus?: 'NONE' | 'PENDING';
  pendingEdit?: {
    advertisedMonthlyRent: string | null;
    deposit: string | null;
    electricityIndex: number | null;
    waterIndex: number | null;
    areaM2: string | null;
    requestedAt: string;
  } | null;
}
const statuses: Record<string, RoomStatus> = {
  VACANT: 'available', OCCUPIED: 'rented', CONTRACT_IN_PROGRESS: 'contract_in_progress', MAINTENANCE: 'maintenance',
};
export function fromOwnerApartment(data: OwnerApartment): Room {
  if (!data.id || !data.propertyId || !statuses[data.availability]) throw new Error('Dữ liệu căn hộ không hợp lệ.');
  return {
    id: data.id, version: data.version, buildingId: data.propertyId, propertyName: data.propertyName, title: data.title,
    description: data.description,
    bedrooms: data.bedrooms ?? undefined,
    bathrooms: data.bathrooms ?? undefined,
    image: data.thumbnail || '/images/apartment-placeholder.svg',
    roomNumber: data.roomNumber, floor: data.floor ?? 0, area: Number(data.areaM2), price: Number(data.advertisedMonthlyRent),
    deposit: data.deposit === null ? undefined : Number(data.deposit), status: statuses[data.availability],
    electricityIndex: data.electricityIndex ?? 0, waterIndex: data.waterIndex ?? 0,
    meterBaselineKnown: data.electricityIndex != null && data.waterIndex != null,
    maxOccupants: data.maxOccupants ?? 2, amenities: data.amenities ?? [],
    publicationStatus: data.publicationStatus, propertyApprovalStatus: data.propertyApprovalStatus,
    editApprovalStatus: data.editApprovalStatus,
    pendingEdit: data.pendingEdit,
  };
}
export function toOwnerApartmentCreate(room: NewRoom) {
  return {
    propertyId: room.buildingId, roomNumber: room.roomNumber.trim(), title: room.title?.trim() || `Căn hộ ${room.roomNumber.trim()}`,
    description: '', floor: room.floor, areaM2: String(room.area), advertisedMonthlyRent: String(room.price),
    deposit: room.deposit === undefined ? null : String(room.deposit), electricityIndex: room.electricityIndex,
    waterIndex: room.waterIndex, maxOccupants: room.maxOccupants, amenities: room.amenities,
    publicationStatus: room.publicationStatus ?? 'DRAFT',
  };
}
async function ownerRequest(url: string, options?: RequestInit) {
  let response: Response;
  try { response = await apiFetch(url, options); }
  catch { throw new Error('Không thể kết nối máy chủ. Vui lòng kiểm tra backend và thử lại.'); }
  if (!response.ok) throw await readApiError(response);
  return response.json();
}
export async function getOwnerApartments(): Promise<Room[]> {
  return (await ownerRequest('/api/v1/owner/apartments')).map(fromOwnerApartment);
}
export async function getOwnerProperties(): Promise<OwnerProperty[]> {
  return ownerRequest('/api/v1/owner/properties');
}
export async function createOwnerApartment(room: NewRoom): Promise<Room> {
  return fromOwnerApartment(await ownerRequest('/api/v1/owner/apartments', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(toOwnerApartmentCreate(room)),
  }));
}
export async function setApartmentPublication(id: string, publicationStatus: 'PUBLISHED' | 'HIDDEN', version: number): Promise<Room> {
  return fromOwnerApartment(await ownerRequest(`/api/v1/owner/apartments/${id}/publication`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ publicationStatus, version }),
  }));
}

export interface ApartmentBasicUpdatePayload {
  title: string;
  description: string;
  floor: number;
  maxOccupants: number;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  version: number;
}

export interface ApartmentSensitiveUpdatePayload {
  advertisedMonthlyRent: string;
  deposit?: string | null;
  electricityIndex?: number | null;
  waterIndex?: number | null;
  areaM2: string;
  version: number;
}

export async function updateApartmentBasic(id: string, payload: ApartmentBasicUpdatePayload): Promise<Room> {
  return fromOwnerApartment(await ownerRequest(`/api/v1/owner/apartments/${id}/basic`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }));
}

export async function updateApartmentSensitive(id: string, payload: ApartmentSensitiveUpdatePayload): Promise<Room> {
  return fromOwnerApartment(await ownerRequest(`/api/v1/owner/apartments/${id}/sensitive`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }));
}

export async function getPendingApartmentEdits(): Promise<Room[]> {
  return (await ownerRequest('/api/v1/admin/apartments/pending-edits')).map(fromOwnerApartment);
}

export async function approvePendingApartmentEdit(id: string): Promise<Room> {
  return fromOwnerApartment(await ownerRequest(`/api/v1/admin/apartments/${id}/pending-edit/approve`, {
    method: 'POST',
  }));
}

export async function rejectPendingApartmentEdit(id: string): Promise<Room> {
  return fromOwnerApartment(await ownerRequest(`/api/v1/admin/apartments/${id}/pending-edit/reject`, {
    method: 'POST',
  }));
}
