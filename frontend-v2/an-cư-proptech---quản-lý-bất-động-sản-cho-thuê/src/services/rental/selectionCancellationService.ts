import {apiFetch,readApiError} from '@/services/http/client';
export type CancellationAction='START'|'ACCEPT'|'REJECT'|'WITHDRAW';
export interface SelectionCancellation {
 requestId:string;contractId:string|null;apartmentTitle:string;requestStatus:string;contractStatus:string|null;
 signingState:'NO_CONTRACT'|'UNSIGNED'|'OWNER_SIGNED'|'CUSTOMER_SIGNED'|'BOTH_SIGNED';state:'NONE'|'PENDING'|'CANCELLED'|'REJECTED'|'WITHDRAWN';
 proposerId:string|null;reason:string|null;responderId:string|null;responseReason:string|null;sourceVersion:string;canStart:boolean;canRespond:boolean;canWithdraw:boolean;
 history:{id:string;actorId:string;actorName:string;action:string;reason:string|null;createdAt:string;before:Record<string,unknown>;after:Record<string,unknown>}[];
}
export async function getSelectionCancellation(id:string,signal?:AbortSignal):Promise<SelectionCancellation>{const response=await apiFetch(`/api/v1/rental-requests/${encodeURIComponent(id)}/cancellation`,{signal,cache:'no-store'});if(!response.ok)throw await readApiError(response);return response.json();}
export async function actOnSelectionCancellation(id:string,action:CancellationAction,sourceVersion:string,reason:string):Promise<SelectionCancellation>{const response=await apiFetch(`/api/v1/rental-requests/${encodeURIComponent(id)}/cancellation/actions`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,sourceVersion,reason}),cache:'no-store'});if(!response.ok)throw await readApiError(response);return response.json();}
