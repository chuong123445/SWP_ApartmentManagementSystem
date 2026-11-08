import {apiFetch,readApiError} from '@/services/http/client';
import type {PageResult} from '@/types/apartment';
export type CashStatus='DRAFT'|'POSTED'|'CANCELLED';
export type CashDirection='INCOME'|'EXPENSE';
export interface CashEntry{id:number;code:string;propertyId:number;propertyName:string;direction:CashDirection;status:CashStatus;paymentMethod:'CASH'|'BANK_TRANSFER';amount:string;transactionDate:string;category:string;counterparty:string;description:string;reference:string|null;createdAt:string;postedAt:string|null;cancelledAt:string|null;cancellationReason:string|null;version:number;sourceType?:'INVOICE'|'MAINTENANCE'|null;sourceId?:number|null;}
export interface CashSummary{income:string;expense:string;netCashflow:string;postedCount:number;}
export interface CashInput{propertyId:string;requestKey:string;direction:CashDirection;paymentMethod:'CASH'|'BANK_TRANSFER';amount:string;transactionDate:string;category:string;counterparty:string;description:string;reference:string;}
export interface CashQuery{propertyId:string;month:string;direction:string;status:string;page:number;}
async function request<T>(url:string,body?:unknown):Promise<T>{const r=await apiFetch(url,body===undefined?{cache:'no-store'}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw await readApiError(r);return r.json();}
const base='/api/v1/owner/cash-entries';
function query(q:CashQuery){const p=new URLSearchParams({month:q.month});if(q.propertyId!=='all')p.set('propertyId',q.propertyId);if(q.direction)p.set('direction',q.direction);return p;}
export function cashEntries(q:CashQuery){const p=query(q);if(q.status)p.set('status',q.status);p.set('page',String(q.page));p.set('size','20');return request<PageResult<CashEntry>>(base+'?'+p);}
export function cashSummary(q:CashQuery){return request<CashSummary>(base+'/summary?'+query(q));}
export function createCash(input:CashInput){return request<CashEntry>(base,input);}
export function postCash(e:CashEntry){return request<CashEntry>(base+'/'+e.id+'/post',{version:e.version});}
export function cancelCash(e:CashEntry,reason:string){return request<CashEntry>(base+'/'+e.id+'/cancel',{version:e.version,reason});}
export function vnToday(){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());return ['year','month','day'].map(k=>parts.find(p=>p.type===k)!.value).join('-');}

export interface CashSource{type:'INVOICE'|'MAINTENANCE';id:number;propertyId:number;propertyName:string;title:string;amount:string;suggestedDate:string;}
export function cashSources(propertyId:string,month:string,page:number){const p=new URLSearchParams({month,page:String(page),size:'10'});if(propertyId!=='all')p.set('propertyId',propertyId);return request<PageResult<CashSource>>(base+'/sources?'+p);}
export function cashFromSource(source:CashSource,transactionDate:string,paymentMethod:'CASH'|'BANK_TRANSFER'){return request<CashEntry>(base+'/from-source',{type:source.type,id:source.id,transactionDate,paymentMethod});}
