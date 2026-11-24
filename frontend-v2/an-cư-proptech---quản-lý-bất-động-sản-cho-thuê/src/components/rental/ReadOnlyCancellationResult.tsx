import {useEffect,useState} from 'react';
import {getSelectionCancellation,type SelectionCancellation} from '@/services/rental/selectionCancellationService';
import {LeaseRequestResultCard} from './LeaseRequestResultCard';
import {cancellationResult,resultActorRole} from '@/utils/leaseRequestResults';
export function ReadOnlyCancellationResult({requestId}:{requestId:string}){
 const [data,setData]=useState<SelectionCancellation|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{const controller=new AbortController();let inFlight=false;setData(null);setError('');const load=async()=>{if(inFlight||controller.signal.aborted)return;inFlight=true;try{const value=await getSelectionCancellation(requestId,controller.signal);if(!controller.signal.aborted){setData(value);setError('');}}catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Không tải được kết quả dừng làm hợp đồng.');}finally{inFlight=false;}};void load();const refresh=()=>{if(document.visibilityState==='visible')void load();};const timer=window.setInterval(refresh,10000);window.addEventListener('ancu:tenancy-changed',refresh);window.addEventListener('focus',refresh);return()=>{controller.abort();window.clearInterval(timer);window.removeEventListener('ancu:tenancy-changed',refresh);window.removeEventListener('focus',refresh);};},[requestId,retry]);
 const result=cancellationResult(data);
 return <>{error&&<p role="alert" className="text-xs text-rose-700">Chưa tải được kết quả dừng làm hợp đồng. {error} <button className="underline" onClick={()=>setRetry(v=>v+1)}>Thử lại</button></p>}{result&&<LeaseRequestResultCard result={result} history={data!.history.map(event=>({...event,actorRole:resultActorRole(event)}))}/>}</>;
}
