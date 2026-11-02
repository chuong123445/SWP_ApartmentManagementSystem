import {apiFetch,readApiError} from '@/services/http/client';
import type {OwnerProperty} from '@/types/property';
export interface ManagedUnit {id:string;title:string;roomNumber:string;thumbnail:string;areaM2:string;advertisedMonthlyRent:string;availability:string;publicationStatus:string;version:number}
export interface ManagedProperty {property:OwnerProperty;apartments:ManagedUnit[]}
export async function getManagedProperties(signal?:AbortSignal):Promise<ManagedProperty[]>{const response=await apiFetch('/api/v1/me/properties',{signal,cache:'no-store'});if(!response.ok)throw await readApiError(response);return response.json();}
export async function saveAssetCommand(path:string,method:string,body:unknown){const response=await apiFetch(`/api/v1${path}`,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!response.ok)throw await readApiError(response);}
export interface SourceConsent {consented:boolean;assetServiceAvailable:boolean;version:number}
export async function getSourceConsent(signal?:AbortSignal):Promise<SourceConsent>{const response=await apiFetch('/api/v1/me/property-source-consent',{signal,cache:'no-store'});if(!response.ok)throw await readApiError(response);return response.json();}
export async function allowPropertySource(version:number):Promise<SourceConsent>{
  const csrfResponse=await fetch('/api/v1/auth/csrf',{credentials:'same-origin',cache:'no-store'});if(!csrfResponse.ok)throw await readApiError(csrfResponse);const csrf=await csrfResponse.json();
  const response=await apiFetch('/api/v1/me/property-source-consent',{method:'POST',headers:{'Content-Type':'application/json',[csrf.headerName]:csrf.token},body:JSON.stringify({consent:true,version})});if(!response.ok)throw await readApiError(response);return response.json();
}
