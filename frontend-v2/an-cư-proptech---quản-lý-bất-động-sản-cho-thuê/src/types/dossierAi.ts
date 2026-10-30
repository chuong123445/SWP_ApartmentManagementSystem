export interface AiFinding {type:'MISSING_INFORMATION'|'MISSING_IMAGE'|'MISMATCH'|'UNREADABLE'|'INCONCLUSIVE';field:string;message:string;declaredValue:string;observedValue:string}
export interface AiFileReview {fileId:string;readable:boolean;documentType:string;extractedFields:{field:string;value:string}[];findings:AiFinding[]}
export interface DossierAiReview {
  status:'NOT_REQUESTED'|'WAITING_CONFIGURATION'|'QUEUED'|'RUNNING'|'COMPLETED'|'FAILED';
  sourceHash:string|null;model:string|null;promptVersion:string;attempts:number;version:number;
  createdAt:string|null;startedAt:string|null;finishedAt:string|null;errorCode:string|null;
  result:{verdict:'CONSISTENT'|'ISSUES_FOUND'|'INCONCLUSIVE';summary:string;files:AiFileReview[];overallFindings:AiFinding[]}|null;
}
