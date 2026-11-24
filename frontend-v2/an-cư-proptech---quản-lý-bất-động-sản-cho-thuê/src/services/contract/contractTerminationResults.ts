import {apiFetch,readApiError} from '@/services/http/client';
export interface ResultEvent {id:string;action:string;actorId:string;actorName:string;actorRole:'OWNER'|'CUSTOMER'|'SYSTEM';createdAt:string;reason:string|null}
export interface LeaseRequestResult {id:string;kind:'CANCELLATION'|'TERMINATION';state:string;event:ResultEvent;proposalReason:string|null;returnDate?:string|null}
export interface ContractTerminationResult {contractId:string;state:string;action:string;actorId:string;actorName:string;actorRole:ResultEvent['actorRole'];updatedAt:string;reason:string|null;proposalReason:string|null;returnDate:string|null}
export async function getContractTerminationResults(ids:string[],signal?:AbortSignal):Promise<ContractTerminationResult[]>{
 const query=new URLSearchParams();ids.forEach(id=>query.append('ids',id));const response=await apiFetch(`/api/v1/me/contract-termination-results?${query}`,{signal,cache:'no-store'});if(!response.ok)throw await readApiError(response);return response.json();
}
export function contractTerminationResult(value:ContractTerminationResult):LeaseRequestResult{return {id:value.contractId,kind:'TERMINATION',state:value.state,event:{id:`${value.contractId}:${value.updatedAt}`,action:value.action,actorId:value.actorId,actorName:value.actorName,actorRole:value.actorRole,createdAt:value.updatedAt,reason:value.reason},proposalReason:value.proposalReason,returnDate:value.returnDate};}
