import {useEffect,useState} from 'react';
import {getContractTerminationResults,type ContractTerminationResult} from '@/services/contract/contractTerminationResults';
export function useContractTerminationResults(ids:string[],revision:number){
 const key=[...new Set(ids)].sort().join(',');const [results,setResults]=useState<Record<string,ContractTerminationResult>>({}),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{const controller=new AbortController();let inFlight=false;setResults({});setError('');
  const load=async()=>{if(inFlight||controller.signal.aborted||!key)return;inFlight=true;try{const selected=key.split(','),batches=[];for(let i=0;i<selected.length;i+=100)batches.push(selected.slice(i,i+100));const data=(await Promise.all(batches.map(batch=>getContractTerminationResults(batch,controller.signal)))).flat();if(!controller.signal.aborted){setResults(Object.fromEntries(data.map(item=>[item.contractId,item])));setError('');}}catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Không tải được kết quả kết thúc thuê.');}finally{inFlight=false;}};
  void load();const refresh=()=>{if(document.visibilityState==='visible')void load();};const timer=window.setInterval(refresh,10000);window.addEventListener('ancu:tenancy-changed',refresh);window.addEventListener('focus',refresh);
  return()=>{controller.abort();window.clearInterval(timer);window.removeEventListener('ancu:tenancy-changed',refresh);window.removeEventListener('focus',refresh);};
 },[key,revision,retry]);
 return {results,error,reload:()=>setRetry(v=>v+1)};
}
