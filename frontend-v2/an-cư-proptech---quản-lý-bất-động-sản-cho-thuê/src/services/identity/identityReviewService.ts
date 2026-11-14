import {apiFetch,readApiError} from '@/services/http/client';
import type {IdentityProfile} from '@/types/identity';
export interface IdentitySubmission {id:string;accountId:string;profile:IdentityProfile;status:'PENDING'|'APPROVED'|'REJECTED';submittedAt:string;reviewerId:string|null;reviewedAt:string|null;reason:string|null;version:number}
export interface IdentityQueue {items:IdentitySubmission[];page:number;totalPages:number;totalElements:number}
async function request<T>(url:string,body?:unknown):Promise<T>{const r=await apiFetch(url,{cache:'no-store',...(body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})});if(!r.ok)throw await readApiError(r);return r.status===204?null as T:r.json();}
export const myIdentitySubmission=()=>request<IdentitySubmission|null>('/api/v1/me/identity-submissions');
export const submitIdentity=(profileVersion:number)=>request<IdentitySubmission>('/api/v1/me/identity-submissions',{profileVersion,consent:true});
export const identityQueue=(status:IdentitySubmission['status'],page:number)=>request<IdentityQueue>(`/api/v1/admin/identity-submissions?status=${status}&page=${page}`);
export const identitySubmission=(id:string)=>request<IdentitySubmission>(`/api/v1/admin/identity-submissions/${encodeURIComponent(id)}`);
export const decideIdentity=(s:IdentitySubmission,action:'APPROVE'|'REJECT',reason:string)=>request<IdentitySubmission>(`/api/v1/admin/identity-submissions/${s.id}/decision`,{version:s.version,action,reason});
export async function reviewIdentityImage(id:string,side:'front'|'back',signal:AbortSignal){const r=await apiFetch(`/api/v1/admin/identity-submissions/${encodeURIComponent(id)}/documents/${side}`,{cache:'no-store',signal});if(!r.ok)throw await readApiError(r);return r.blob();}
