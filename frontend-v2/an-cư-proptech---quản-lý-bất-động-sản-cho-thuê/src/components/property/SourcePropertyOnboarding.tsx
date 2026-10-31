import {useEffect,useState} from 'react';
import {getSourceConsent,allowPropertySource,type SourceConsent} from '@/services/property/assetManagementService';
import {VneidAssetImportForm} from '@/components/property/VneidAssetImportForm';
export function SourcePropertyOnboarding(props:{onClose:()=>void;onBack:()=>void;onImported:(id:string)=>void}){
  const [state,setState]=useState<SourceConsent|null>(null);const [checked,setChecked]=useState(false);const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [revision,setRevision]=useState(0);
  useEffect(()=>{const abort=new AbortController();setState(null);setError('');getSourceConsent(abort.signal).then(s=>{if(!abort.signal.aborted)setState(s);}).catch(e=>{if(!abort.signal.aborted)setError(e instanceof Error?e.message:'Chưa tải được quyền đọc tài sản.');});return()=>abort.abort();},[revision]);
  if(state?.consented)return <VneidAssetImportForm {...props}/>;
  return <section className="border bg-white rounded-2xl p-6 space-y-5"><h2 className="text-xl font-bold">Chính chủ — Kết nối dữ liệu tài sản</h2><p>Chỉ sau khi bạn đồng ý, hệ thống mới đọc danh sách tài sản từ VNeID mô phỏng để bạn chọn. Đồng ý đọc dữ liệu chưa nâng quyền chủ cho thuê.</p>
    {!state&&!error&&<p role="status">Đang tải trạng thái kết nối...</p>}{state&&!state.assetServiceAvailable&&<p className="text-amber-800">Nguồn dữ liệu tài sản chưa sẵn sàng. Bạn có thể thử lại sau.</p>}
    {state&&<><label className="flex gap-3 items-start"><input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)} className="mt-1"/><span>Tôi đồng ý cho An Cư đọc danh sách tài sản và thông tin sở hữu từ Auth0 để chọn tài sản cho thuê.</span></label><button disabled={!checked||busy||!state.assetServiceAvailable} className="bg-emerald-600 text-white rounded-lg px-5 py-3 disabled:opacity-50" onClick={async()=>{setBusy(true);setError('');try{setState(await allowPropertySource(state.version));}catch(e){setError(e instanceof Error?e.message:'Không thể ghi nhận đồng ý.');}finally{setBusy(false);}}}>{busy?'Đang kết nối...':'Đồng ý và chọn tài sản'}</button></>}
    {error&&<p role="alert" className="text-rose-700">{error}</p>}<div className="flex gap-5"><button onClick={props.onBack} className="underline">Quay lại chọn hình thức</button><button onClick={()=>setRevision(n=>n+1)} className="underline">Thử lại kết nối</button></div>
  </section>;
}
