import { apiFetch, readApiError } from '@/services/http/client';
import type { PageResult } from '@/types/apartment';
import type { CashCreate, CashEntry, CashFilters, CashSummary } from '@/types/finance';

const base = '/api/v1/owner/cash-entries';
async function request<T>(url: string, body?: unknown): Promise<T> {
  const response = await apiFetch(url, body === undefined ? {cache:'no-store'} : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!response.ok) throw await readApiError(response);
  return response.json();
}
function query(filters: CashFilters, includeStatus: boolean) {
  const params = new URLSearchParams({ month: filters.month });
  if (filters.propertyId && filters.propertyId !== 'all') params.set('propertyId', filters.propertyId);
  if (filters.direction) params.set('direction', filters.direction);
  if (includeStatus && filters.status) params.set('status', filters.status);
  return params;
}
export function listCashEntries(filters: CashFilters, page = 0) {
  const params = query(filters, true);params.set('page', String(page));params.set('size', '20');
  return request<PageResult<CashEntry>>(`${base}?${params}`);
}
export const cashSummary = (filters: CashFilters) => request<CashSummary>(`${base}/summary?${query(filters, false)}`);
export const getCashEntry = (id: number) => request<CashEntry>(`${base}/${id}`);
export const createCashEntry = (input: CashCreate) => request<CashEntry>(base, input);
export const postCashEntry = (id: number, version: number) => request<CashEntry>(`${base}/${id}/post`, { version });
export const cancelCashEntry = (id: number, version: number, reason: string) => request<CashEntry>(`${base}/${id}/cancel`, { version, reason });

// Retain the same intent after a lost response, including when its form is remounted.
// A changed payload is a new intent; successful requests are removed from the retry cache.
export function cashCreateIntent() {
  let pending: { payload: string; input: CashCreate } | null = null;
  return async (input: Omit<CashCreate, 'requestKey'>) => {
    const payload = JSON.stringify(input);
    if (pending?.payload !== payload) pending = { payload, input: { ...input, requestKey: crypto.randomUUID() } };
    const result = await createCashEntry(pending.input);
    pending = null;
    return result;
  };
}

export type { CashEntry, CashSummary, CashStatus, CashDirection } from '@/types/finance';
export interface CashInput extends Omit<CashCreate,'propertyId'> { propertyId:string }
export interface CashQuery extends CashFilters { propertyId:string; page:number }
export const cashEntries=(query:CashQuery)=>listCashEntries(query,query.page);
export const createCash=(input:CashInput)=>createCashEntry({...input,propertyId:Number(input.propertyId)});
export const postCash=(entry:CashEntry)=>postCashEntry(entry.id,entry.version);
export const cancelCash=(entry:CashEntry,reason:string)=>cancelCashEntry(entry.id,entry.version,reason);
export function vnToday(){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());return ['year','month','day'].map(k=>parts.find(p=>p.type===k)!.value).join('-');}

export interface CashSource{type:'INVOICE'|'MAINTENANCE';id:number;propertyId:number;propertyName:string;title:string;amount:string;suggestedDate:string;}
export function cashSources(propertyId:string,month:string,page:number){const p=new URLSearchParams({month,page:String(page),size:'10'});if(propertyId!=='all')p.set('propertyId',propertyId);return request<PageResult<CashSource>>(base+'/sources?'+p);}
export function cashFromSource(source:CashSource,transactionDate:string,paymentMethod:'CASH'|'BANK_TRANSFER'){return request<CashEntry>(base+'/from-source',{type:source.type,id:source.id,transactionDate,paymentMethod});}
