import { readApiError } from '@/services/http/client';
import type { ApartmentFilters } from '@/types/apartment';
export type AiFilters = Record<'q'|'city'|'district'|'ward'|'minRent'|'maxRent'|'minArea'|'maxArea', string|null> & { bedrooms: number|null; occupants: number|null };
export interface AiSearchResult { runId:string;sourceHash:string;model:string;promptVersion:string;createdAt:string;filters:AiFilters;notes:string[];canApply:boolean; }
async function post<T>(path:string,body:unknown,signal?:AbortSignal):Promise<T>{
 const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',cache:'no-store',body:JSON.stringify(body),signal});
 if(!response.ok)throw await readApiError(response);return response.json();
}
export const suggestSearch=(text:string,signal?:AbortSignal)=>post<AiSearchResult>('/api/v1/apartments/ai-search',{text,consent:true},signal);
export const applyAiSearch=(id:string,filters:AiFilters,signal?:AbortSignal)=>post<AiFilters>(`/api/v1/apartments/ai-search/${encodeURIComponent(id)}/apply`,{filters},signal);
export function hasAiFilters(filters:AiFilters|null):boolean{
  return filters!==null&&Object.values(filters).some(value=>value!==null&&String(value).trim()!=='');
}
export function toApartmentFilters(filters:AiFilters):ApartmentFilters{
 return Object.fromEntries(Object.entries(filters).filter(([,v])=>v!==null&&v!=='').map(([key,value])=>[key,String(value)]));
}

export interface ChatMessage { role:'user'|'assistant'; text:string; }
export interface AiChatResult { reply:string; search:AiSearchResult; }
export const chatWithAi=(text:string,history:ChatMessage[],signal?:AbortSignal)=>post<AiChatResult>('/api/v1/apartments/ai-chat',{text,history,consent:true},signal);
