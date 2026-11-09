import { apiFetch,readApiError } from '@/services/http/client';
import type { DossierSubmit } from '@/types/dossier';
export interface PrecheckPropertyFields {name:string;address:string;city:string;district:string;ward:string|null}
export interface PrecheckFile {id:string;filename:string;purpose:string;}
export interface PrecheckView {sourceHash:string;propertyVersion:number;checklist:string[];files:PrecheckFile[];runId:string|null;model:string|null;promptVersion:string;finishedAt:string|null;review:{fileId:string;readable:boolean;documentType:string;findings:{type:string;field:string;message:string;declaredValue:string;observedValue:string}[];extractedFields:{field:string;value:string;page?:number|null}[]}|null;}
export async function precheckDossier(propertyId:string,draft:DossierSubmit,options:{fileId?:string;sourceHash?:string;consent?:boolean;propertyFields?:PrecheckPropertyFields}={},signal?:AbortSignal,selfService=false):Promise<PrecheckView>{
 const response=await apiFetch(`${selfService?'/api/v1/me/rental-properties':'/api/v1/owner/properties'}/${encodeURIComponent(propertyId)}/ai-precheck`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({draft,...options}),signal,cache:'no-store'});
 if(!response.ok)throw await readApiError(response);return response.json();
}
export async function acknowledgePrecheck(propertyId:string,runId:string,draft:DossierSubmit,sourceHash:string,selfService=false,propertyFields?:PrecheckPropertyFields){
 const response=await apiFetch(`${selfService?'/api/v1/me/rental-properties':'/api/v1/owner/properties'}/${encodeURIComponent(propertyId)}/ai-precheck/${encodeURIComponent(runId)}/acknowledge`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({draft,sourceHash,propertyFields}),cache:'no-store'});
 if(!response.ok)throw await readApiError(response);
}
export function precheckConflicts(reviews:PrecheckView[]):string[]{
 const labels={certificateNumber:'Số giấy chứng nhận',accountNumber:'Số tài khoản',applicantDocumentNumber:'Số căn cước người nộp',principalDocumentNumber:'Số căn cước chủ sở hữu gốc'};
 return Object.entries(labels).filter(([key])=>new Set(reviews.flatMap(r=>r.review?.extractedFields??[]).filter(x=>x.field===key&&x.value.trim()).map(x=>x.value.replace(/[^\p{L}\p{N}]/gu,'').toUpperCase())).size>1).map(([,label])=>`${label} đọc được khác nhau giữa các tệp. Hãy đối chiếu bản gốc.`);
}
