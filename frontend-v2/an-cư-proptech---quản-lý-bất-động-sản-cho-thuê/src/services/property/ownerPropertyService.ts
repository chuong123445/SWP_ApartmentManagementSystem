import { apiFetch, readApiError } from '@/services/http/client';
import { fromOwnerApartment } from '@/services/apartments/ownerApartmentService';
import type { OwnerProperty, PropertyCreateInput } from '@/types/property';
import type { Room } from '@/types';

export async function createOwnerProperty(input: PropertyCreateInput): Promise<{ property: OwnerProperty; apartments: Room[] }> {
  const response = await apiFetch('/api/v1/owner/properties', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  });
  if (!response.ok) throw await readApiError(response);
  const data = await response.json();
  return { property: data.property, apartments: data.apartments.map(fromOwnerApartment) };
}

export async function withdrawProperty(id:string,version:number):Promise<void>{
  const response=await apiFetch(`/api/v1/me/rental-properties/${encodeURIComponent(id)}/withdraw`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version})});
  if(!response.ok)throw await readApiError(response);
}
