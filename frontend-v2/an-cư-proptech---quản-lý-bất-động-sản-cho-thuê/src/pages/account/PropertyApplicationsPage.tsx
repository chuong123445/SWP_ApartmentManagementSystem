import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { CustomerLayout } from '@/layouts/CustomerLayout';
import { useAccountVerification } from '@/hooks/useAccountVerification';
import { useAuth } from '@/hooks/useAuth';
import { PropertyDossierModal } from '@/components/property/PropertyDossierModal';
import { getPropertyApplications } from '@/services/property/propertyApplicationService';
import type { OwnerProperty } from '@/types/property';
import { rightLabels } from '@/types/dossier';

export function PropertyApplicationsPage() {
  const verification = useAccountVerification();const { user, reloadUser } = useAuth();const location = useLocation();
  const [items,setItems] = useState<OwnerProperty[]>([]);const [loading,setLoading] = useState(true);const [error,setError] = useState('');const [revision,setRevision] = useState(0);
  const [kind,setKind] = useState<'AUTHORIZATION'|'SUBLEASE'>(location.state?.rightType === 'SUBLEASE' ? 'SUBLEASE' : 'AUTHORIZATION');const [selected,setSelected] = useState<string|null>(location.state?.openPropertyId??null);
  const verified = verification.data?.vneid.status === 'VERIFIED';
  useEffect(()=>{if(!verified){setItems([]);setLoading(false);return;}const controller=new AbortController();setLoading(true);setError('');
    getPropertyApplications(controller.signal).then(data=>{if(!controller.signal.aborted)setItems(data);}).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Chưa tải được hồ sơ.');}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();
  },[verified,user?.id,revision]);
  const labels:Record<string,string>={DRAFT:'Nháp',PENDING_APPROVAL:'Chờ Admin duyệt',NEEDS_INFORMATION:'Cần bổ sung',REJECTED:'Bị từ chối',APPROVED:'Đã duyệt'};
  return <CustomerLayout><main className="home-wrap asset-page space-y-5"><Link to="/account/properties" className="text-emerald-700 underline">Quay lại quản lý tài sản</Link><h1 className="text-2xl font-bold mb-4">Hồ sơ quyền cho thuê</h1>
    <p className="text-slate-600 mb-5">Dành cho người được ủy quyền hoặc thuê lại để cho thuê tiếp. Admin duyệt hồ sơ đầu tiên sẽ mở chức năng chủ cho thuê; bạn vẫn giữ chức năng thuê nhà.</p>
    {verification.loading ? <p role="status">Đang kiểm tra căn cước VNeID...</p> : verification.error ? <p role="alert">{verification.error}<button onClick={verification.reload} className="ml-2 underline">Thử lại xác thực</button></p> : !verified ? <section className="bg-amber-50 border rounded-xl p-5"><p>Cần xác thực CCCD qua VNeID trước khi tạo hoặc gửi hồ sơ. Email đã xác thực không thay thế điều kiện này.</p><Link to="/account/verification" className="inline-block mt-3 text-emerald-700 underline">Xác thực căn cước VNeID</Link></section> : <>
      <fieldset className="grid sm:grid-cols-2 gap-3 mb-4"><legend className="font-semibold mb-2">Bạn là ai đối với bất động sản này?</legend>{(['AUTHORIZATION','SUBLEASE'] as const).map(type=><label key={type} className="border rounded-xl p-4 flex gap-2"><input type="radio" name="application-right" value={type} checked={kind===type} onChange={()=>setKind(type)} />{rightLabels[type]}</label>)}</fieldset>
      <p className="text-sm text-slate-600 mb-4">{kind==='AUTHORIZATION'?'Cần giấy tờ sở hữu của chủ gốc và giấy ủy quyền.':'Cần giấy tờ sở hữu của chủ gốc, hợp đồng thuê gốc và văn bản cho phép cho thuê lại riêng.'} Nhập ngày bắt đầu/kết thúc theo giấy tờ để Admin đối chiếu; không tự suy ra một năm.</p>
      <div className="flex flex-wrap gap-4 mb-5"><Link to={`/account/properties/new/${kind==='SUBLEASE'?'sublease':'authorization'}`} className="bg-emerald-600 text-white rounded-lg px-4 py-2">Tạo hồ sơ tài sản</Link><button onClick={async()=>{try{await reloadUser();setRevision(v=>v+1);}catch(e){setError(e instanceof Error?e.message:'Chưa tải lại được quyền tài khoản.');}}} className="text-emerald-700 underline">Tải lại hồ sơ và quyền tài khoản</button><Link to="/account/property-notices" className="text-emerald-700 underline">Thông báo thời hạn</Link></div>
      {loading&&<p role="status">Đang tải hồ sơ tài sản...</p>}{error&&<p role="alert" className="text-rose-700">{error}<button onClick={()=>setRevision(v=>v+1)} className="ml-2 underline">Thử lại</button></p>}
      {!loading&&!error&&!items.length&&<p>Chưa có hồ sơ quyền cho thuê.</p>}
      <div className="space-y-4">{items.map(p=><article key={p.id} data-testid="application-card" className="border rounded-xl p-5 min-w-0 space-y-2"><h2 className="font-bold break-words">{p.name}</h2><p className="text-sm break-words">{p.address}</p><p>{p.rightType?rightLabels[p.rightType]:'Hồ sơ'} · {labels[p.approvalStatus]}</p>{p.rightsValidUntil&&<p className="text-sm">Quyền cho thuê: {p.rightsValidFrom} đến hết {p.rightsValidUntil}</p>}<button onClick={()=>setSelected(p.id)} className="text-emerald-700 underline">Mở hồ sơ và giấy tờ</button>{p.approvalStatus==='APPROVED'&&user?.roles.includes('OWNER')&&<Link to="/account/properties" className="block text-emerald-700 underline">Mở tài sản để công khai căn hộ</Link>}</article>)}</div>
    </>}
    {selected&&verified&&<PropertyDossierModal selfService propertyId={selected} onClose={()=>setSelected(null)} onSaved={()=>setRevision(v=>v+1)} />}
  </main></CustomerLayout>;
}
