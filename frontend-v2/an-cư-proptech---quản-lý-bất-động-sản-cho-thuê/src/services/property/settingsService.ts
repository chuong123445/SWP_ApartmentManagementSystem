import { apiFetch, readApiError } from '@/services/http/client';
export interface PropertySettings {
 waterBillingMode:'METERED'|'PER_PERSON';propertyId:string;propertyName:string;configured:boolean;version:number;
 electricityUnitPrice:string|null;waterUnitPrice:string|null;internetFee:string|null;garbageFee:string|null;updatedAt:string|null;
 receivingAccount:{bank:string;accountNumber:string;accountHolderName:string}|null;
}
export type SettingsInput=Pick<PropertySettings,'version'|'waterBillingMode'> & Record<'electricityUnitPrice'|'waterUnitPrice'|'internetFee'|'garbageFee',string>;
export async function getPropertySettings(id:string):Promise<PropertySettings>{const r=await apiFetch('/api/v1/owner/properties/'+encodeURIComponent(id)+'/settings');if(!r.ok)throw await readApiError(r);return r.json();}
export async function savePropertySettings(id:string,input:SettingsInput):Promise<PropertySettings>{const r=await apiFetch('/api/v1/owner/properties/'+encodeURIComponent(id)+'/settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});if(!r.ok)throw await readApiError(r);return r.json();}
