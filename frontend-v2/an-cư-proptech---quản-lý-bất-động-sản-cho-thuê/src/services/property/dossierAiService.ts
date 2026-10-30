import {apiFetch,readApiError} from '@/services/http/client';
import type {DossierAiReview} from '@/types/dossierAi';
const path=(id:string)=>`/api/v1/admin/property-dossiers/${encodeURIComponent(id)}/ai-review`;
export async function adminAiReview(id:string):Promise<DossierAiReview>{
  const response=await apiFetch(path(id));if(!response.ok)throw await readApiError(response);return response.json();
}
export async function retryAiReview(id:string,version:number):Promise<DossierAiReview>{
  const response=await apiFetch(`${path(id)}/retry`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version})});
  if(!response.ok)throw await readApiError(response);return response.json();
}
