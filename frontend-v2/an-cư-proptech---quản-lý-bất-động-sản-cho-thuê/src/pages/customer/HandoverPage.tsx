import {useEffect,useState} from 'react';
import {Link,useParams} from 'react-router';
import {CustomerLayout} from '@/layouts/CustomerLayout';
import {ContractExitPanel} from '@/components/contract/ContractExitPanel';
import {getContract} from '@/services/contract/contractService';
import type {ContractDraft} from '@/types/contract';
import {useAuth} from '@/hooks/useAuth';

export function HandoverPage(){
 const {id}=useParams();const {user}=useAuth();
 const [draft,setDraft]=useState<ContractDraft|null>(null);
 const [error,setError]=useState('');const [revision,setRevision]=useState(0);
 useEffect(()=>{
  let active=true;setDraft(null);setError('');
  getContract(id!).then(value=>{if(active)setDraft(value);})
   .catch(e=>{if(active)setError(e instanceof Error?e.message:'Không tải được hồ sơ bàn giao.');});
  return()=>{active=false;};
 },[id,revision]);
 const owner=draft?.snapshot.owner.id===user?.id;
 return <CustomerLayout><main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-5">
  <nav aria-label="Điều hướng bàn giao" className="flex flex-wrap gap-4 text-sm text-brand-800">
   <Link to={owner?'/app?tab=contracts':'/my/contracts'}>← Danh sách hợp đồng</Link>
   <Link to={`/contracts/${id}`}>Xem hợp đồng thuê</Link>
  </nav>
  <header><h1 className="app-page-title">Biên bản bàn giao · HD-{id}</h1><p className="text-sm text-slate-600 mt-2">Xem PDF, ký biên bản và theo dõi xác nhận của hai bên.</p></header>
  {error&&<div role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-700"><p>{error}</p><button type="button" className="underline mt-2" onClick={()=>setRevision(value=>value+1)}>Tải lại hồ sơ bàn giao</button></div>}
  {!draft&&!error&&<p role="status">Đang tải hồ sơ bàn giao…</p>}
  {draft&&!['ACTIVE','ENDED'].includes(draft.status)&&<p>Hợp đồng chưa đến bước bàn giao.</p>}
  {draft&&<ContractExitPanel key={draft.id} draft={draft} documentPage initialOpen onChanged={async()=>setDraft(await getContract(draft.id))}/>}
 </main></CustomerLayout>;
}
