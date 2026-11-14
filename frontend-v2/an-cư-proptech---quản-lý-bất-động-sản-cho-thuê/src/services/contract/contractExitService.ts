import type {ContractDraft} from '@/types/contract';
import {apiFetch,readApiError} from '@/services/http/client';
export type ExitAction='PROPOSE_TERMINATION'|'ACCEPT_TERMINATION'|'REJECT_TERMINATION'|'WITHDRAW_TERMINATION'|'PROPOSE_HANDOVER'|'CONFIRM_HANDOVER'|'DISPUTE_HANDOVER'|'CANCEL_HANDOVER';
export interface ExitEvidence{id:string;filename:string;uploaderId:string;createdAt:string}
export interface TermProposal{returnDate:string;reason:string;clauseReference:string;penaltyAmount:string;penaltyPayer:'NONE'|'OWNER'|'CUSTOMER'}
export interface HandProposal{returnDate:string;electricityReading?:number;waterReading?:number;electricityStartReading?:number;waterStartReading?:number;keysReturned:boolean;conditionNotes:string;evidenceIds:string[];details:{location:string;inventory:string;keyCount:number;notes:string}}
export interface ContractExit{
 contractId:string;contractStatus:string;ownerId:string;customerId:string;today:string;startDate:string;endDate:string;sourceVersion:string;
 terminationState:'NONE'|'PENDING'|'AGREED'|'REJECTED'|'WITHDRAWN';termination:(TermProposal&{proposerId:string;responderId:string|null;responseReason:string|null})|null;
 handoverState:'NONE'|'PENDING'|'DISPUTED'|'CANCELLED'|'CONFIRMED';handover:({returnDate:string;electricityStartReading:string;waterStartReading:string;electricityReading:string;waterReading:string;utilityAmount:string;conditionNotes:string;keysReturned:boolean;evidenceIds:string[];disputeReason:string|null;disputedBy:string|null;disputeEvidenceIds:string[]})|null;
 document:{number:string;returnDate:string;details:{location:string;inventory:string;keyCount:number;notes:string};conditionNotes:string;snapshot:ContractDraft['snapshot']}|null;
 signing:{contentHash:string;state:string;ownerSignedAt:string|null;customerSignedAt:string|null;ownerSignature:string|null;customerSignature:string|null}|null;canSign:boolean;
 canProposeTermination:boolean;canRespondTermination:boolean;canWithdrawTermination:boolean;canProposeHandover:boolean;canConfirmHandover:boolean;canDisputeHandover:boolean;canCancelHandover:boolean;
 evidence:ExitEvidence[];history:{id:string;actorId:string;actorName:string;action:string;reason:string;createdAt:string;before:unknown;after:unknown}[];
}
const path=(id:string)=>`/api/v1/contracts/${encodeURIComponent(id)}/exit`;
async function request<T>(url:string,options?:RequestInit):Promise<T>{const r=await apiFetch(url,{...options,cache:'no-store'});if(!r.ok)throw await readApiError(r);return r.json();}
export const getContractExit=(id:string,signal?:AbortSignal)=>request<ContractExit>(path(id),{signal});
export function actOnContractExit(id:string,action:ExitAction,sourceVersion:string,input:{reason?:string;termination?:TermProposal;handover?:HandProposal;evidenceIds?:string[]}){
 return request<ContractExit>(`${path(id)}/actions`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...input,action,sourceVersion,consent:true})});
}
export function uploadExitEvidence(id:string,file:File){const body=new FormData();body.append('file',file);return request<ExitEvidence>(`${path(id)}/evidence`,{method:'POST',body});}
export async function downloadExitEvidence(id:string,evidence:ExitEvidence){const r=await apiFetch(`${path(id)}/evidence/${encodeURIComponent(evidence.id)}`,{cache:'no-store'});if(!r.ok)throw await readApiError(r);const blob=await r.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');try{a.href=url;a.download=evidence.filename;document.body.appendChild(a);a.click();}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}}

export function requestHandoverSignatureOtp(id:string,sourceVersion:string,contentHash:string,signature:string){
 return request<import('@/services/auth/authService').OtpChallenge>(`${path(id)}/signature-otp`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sourceVersion,contentHash,signature,consent:true})});
}
export function signHandover(id:string,sourceVersion:string,contentHash:string,signature:string,otp:import('@/services/auth/authService').SignatureOtp){
 return request<ContractExit>(`${path(id)}/sign`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sourceVersion,contentHash,signature,consent:true,...otp})});
}
export async function getHandoverPdf(id:string,signal?:AbortSignal){
 const response=await apiFetch(`${path(id)}/pdf`,{cache:'no-store',signal});if(!response.ok)throw await readApiError(response);return response.blob();
}
