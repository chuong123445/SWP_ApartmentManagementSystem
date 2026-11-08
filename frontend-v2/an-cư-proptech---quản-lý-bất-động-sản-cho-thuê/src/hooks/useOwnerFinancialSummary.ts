import {useCallback,useEffect,useState} from 'react';
import {getOwnerFinancialSummary} from '@/services/owner/financialService';
import type {OwnerFinancialSummary} from '@/types/financialReport';
export function useOwnerFinancialSummary(enabled:boolean,propertyId:string,externalRevision:string){
  const [year,setYear]=useState(()=>Number(new Intl.DateTimeFormat('en',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric'}).format(new Date())));
  const [month,setMonth]=useState(()=>Number(new Intl.DateTimeFormat('en',{timeZone:'Asia/Ho_Chi_Minh',month:'numeric'}).format(new Date())));
  const [revision,setRevision]=useState(0);const reload=useCallback(()=>setRevision(value=>value+1),[]);
  const key=JSON.stringify([propertyId,year,revision,externalRevision]);
  const [snapshot,setSnapshot]=useState<{key:string;data:OwnerFinancialSummary|null;error:string}|null>(null);
  useEffect(()=>{
    if(!enabled)return;let active=true,running=false;
    const load=async()=>{if(!active||running)return;running=true;try{const data=await getOwnerFinancialSummary(year,propertyId);if(active)setSnapshot({key,data,error:''});}catch(e){if(active)setSnapshot({key,data:null,error:e instanceof Error?e.message:'Không tải được báo cáo.'});}finally{running=false;}};
    const refresh=()=>{if(document.visibilityState==='visible')void load();};void load();const timer=window.setInterval(refresh,30000);
    window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
    return()=>{active=false;window.clearInterval(timer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
  },[enabled,propertyId,year,key]);
  const current=enabled&&snapshot?.key===key?snapshot:null;
  return {year,setYear,month,setMonth,reload,data:current?.data??null,error:current?.error??'',loading:enabled&&!current};
}
export type OwnerFinancialReport=ReturnType<typeof useOwnerFinancialSummary>;
