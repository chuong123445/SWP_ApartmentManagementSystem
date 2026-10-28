import { apiFetch, readApiError } from '@/services/http/client';
import type { OwnerProperty } from '@/types/property';

export interface VneidAssetUnit { externalUnitId: string; code: string; areaM2: number; bedrooms: number | null; bathrooms: number | null }
export interface VneidAssetCandidate {
  asset: { externalAssetId: string; name: string; address: string; rentalMode: 'SINGLE_UNIT' | 'MULTI_UNIT'; units: VneidAssetUnit[] };
  sourceVersion: string; imported: boolean;
}
export interface ImportUnitTerms {
  externalUnitId: string; monthlyRent: string; deposit: string; electricityUnitPrice: string; waterUnitPrice: string;
  electricityIndex: number; waterIndex: number; floor: number; maxOccupants: number; description: string;
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
