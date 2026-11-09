import { apiFetch, readApiError } from '@/services/http/client';
import type { OwnerProperty } from '@/types/property';

export interface VneidAssetUnit { externalUnitId: string; code: string; areaM2: number; bedrooms: number | null; bathrooms: number | null }
export interface VneidAssetCandidate {
  asset: { externalAssetId: string; name: string; address: string; rentalMode: 'SINGLE_UNIT' | 'MULTI_UNIT'; units: VneidAssetUnit[] };
  sourceVersion: string; imported: boolean;
  propertyId?: string | null; propertyVersion?: number | null;
  unitStates?: {externalUnitId: string; apartmentId: string; publicationStatus: string}[];
  appendBlockedReason?: string | null;
}
export interface VneidAppendInput {version:number;sourceVersion:string;units:ImportUnitTerms[]}
export async function appendVneidUnits(propertyId:string,input:VneidAppendInput):Promise<{property:OwnerProperty}>{
  const response=await apiFetch(`/api/v1/owner/properties/${encodeURIComponent(propertyId)}/vneid-units`,{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input),
  });
  if(!response.ok)throw await readApiError(response);return response.json();
}
export function availableSourceUnits(item:VneidAssetCandidate):VneidAssetUnit[]{
  if(item.appendBlockedReason || (item.imported && (!item.propertyId || item.propertyVersion == null || !item.unitStates)))return [];
  const imported=new Set(item.unitStates?.map(unit=>unit.externalUnitId) ?? []);
  return item.asset.units.filter(unit=>!imported.has(unit.externalUnitId));
}
export function sourceAppendMessage(item:VneidAssetCandidate):string{
  if(item.appendBlockedReason==='SOURCE_UNIT_RECONCILIATION_REQUIRED')return 'Cần đối chiếu các phòng đã nhập trước đây trước khi bổ sung.';
  if(item.appendBlockedReason==='ASSET_LEGAL_SOURCE_CHANGED')return 'Thông tin pháp lý nguồn đã thay đổi. Cần đối chiếu lại trước khi bổ sung phòng.';
  if(item.appendBlockedReason || (item.imported && !item.propertyId))return 'Tài sản hiện không thể bổ sung phòng từ tài khoản này.';
  return '';
}
export interface ImportUnitTerms {
  imageIds?: string[]; externalUnitId: string; monthlyRent: string; deposit: string; electricityUnitPrice: string; waterUnitPrice: string;
  electricityIndex: number|null; waterIndex: number|null; floor: number; maxOccupants: number; description: string;
}
export interface VneidImportInput { imageIds: string[]; externalAssetId: string; sourceVersion: string; city: string; district: string; ward: string | null; units: ImportUnitTerms[] }
export async function getVneidAssets(signal?: AbortSignal): Promise<VneidAssetCandidate[]> {
  const response = await apiFetch('/api/v1/owner/properties/vneid-assets', { signal, cache: 'no-store' });
  if (!response.ok) throw await readApiError(response);
  return response.json();
}
export async function importVneidProperty(input: VneidImportInput): Promise<{ property: OwnerProperty }> {
  const response = await apiFetch('/api/v1/owner/properties/vneid-imports', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  });
  if (!response.ok) throw await readApiError(response);
  return response.json();
}
