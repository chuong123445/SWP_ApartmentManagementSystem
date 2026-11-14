import { apiFetch, readApiError } from '@/services/http/client';
import type { Dossier, DossierSubmit, EvidenceFile } from '@/types/dossier';
import type { PropertyCreateInput } from '@/types/property';
import type { PrecheckView } from './ownerPrecheckService';
export interface ListingDraft { propertyId:string;version:number;propertyVersion:number;rightType:Dossier['rightType'];completed:boolean;payload:unknown;files:EvidenceFile[];acceptedFileIds?:string[] }
async function request<T>(path:string,method='GET',body?:unknown):Promise<T>{
 const response=await apiFetch(`/api/v1/me/listing-drafts${path}`,{method,cache:'no-store',...(body===undefined?{}:{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})});
 if(!response.ok)throw await readApiError(response);return response.json();
}
export const listListingDrafts=()=>request<ListingDraft[]>('');
export const getListingDraft=(id:string)=>request<ListingDraft>(`/${encodeURIComponent(id)}`);
export const startListingDraft=(requestKey:string,rightType:Dossier['rightType'])=>request<ListingDraft>('','POST',{requestKey,rightType});
export const saveListingDraft=(draft:ListingDraft,payload:unknown)=>request<ListingDraft>(`/${draft.propertyId}`,'PUT',{version:draft.version,payload});
export const finishListingDraft=(draft:ListingDraft,property:PropertyCreateInput,dossier:DossierSubmit)=>request<ListingDraft>(`/${draft.propertyId}/complete`,'POST',{version:draft.version,property,dossier,submit:true});
export async function extractListingDocument(id:string,draft:DossierSubmit,fileId:string,sourceHash:string):Promise<PrecheckView>{
 const response=await apiFetch(`/api/v1/me/rental-properties/${id}/ai-extract`,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({draft,fileId,sourceHash,consent:true})});
 if(!response.ok)throw await readApiError(response);return response.json();
}
