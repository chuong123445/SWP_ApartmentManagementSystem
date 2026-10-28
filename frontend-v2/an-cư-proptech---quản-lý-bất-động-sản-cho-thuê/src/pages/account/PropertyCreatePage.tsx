import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { AccountLayout } from '@/layouts/AccountLayout';
import { useAuth } from '@/hooks/useAuth';
import { useAccountVerification } from '@/hooks/useAccountVerification';
import { PropertyCreateForm } from '@/components/property/PropertyCreateForm';
import { VneidAssetImportForm } from '@/components/property/VneidAssetImportForm';
import { createPropertyApplication } from '@/services/property/propertyApplicationService';

const choices=[['ownership','Chính chủ','Chọn tài sản thuộc sở hữu từ VNeID và bổ sung thông tin cho thuê.'],['authorization','Người được ủy quyền','Nhập tài sản, nộp giấy tờ sở hữu và giấy ủy quyền để Admin duyệt.'],['sublease','Người thuê lại','Nhập tài sản, nộp hợp đồng thuê gốc và văn bản cho phép cho thuê lại.']] as const;
export function PropertyCreatePage(){
  const {relationship}=useParams();const navigate=useNavigate();const {user}=useAuth();const verification=useAccountVerification();
  if(relationship&&!choices.some(([key])=>key===relationship))return <Navigate to="/account/properties/new" replace/>;
  const back=()=>navigate('/account/properties/new');
  return <AccountLayout><h1 className="text-2xl font-bold mb-3">Thêm tài sản cho thuê</h1>
    {!relationship?<><p className="text-slate-600 mb-5">Bạn là ai đối với bất động sản này?</p><div className="grid md:grid-cols-3 gap-4">{choices.map(([key,label,description])=><Link key={key} to={`/account/properties/new/${key}`} className="border bg-white hover:border-emerald-600 rounded-2xl p-6 space-y-3"><h2 className="font-bold text-lg text-emerald-800">{label}</h2><p className="text-sm text-slate-600">{description}</p><span className="block text-sm font-semibold">Tiếp tục →</span></Link>)}</div></>:
      verification.loading?<p role="status">Đang kiểm tra xác thực căn cước...</p>:verification.error?<p role="alert">{verification.error}<button onClick={verification.reload} className="ml-2 underline">Thử lại</button></p>:verification.data?.vneid.status!=='VERIFIED'?<section className="border rounded-xl bg-amber-50 p-5"><p>Cần xác thực CCCD qua VNeID trước khi tạo tài sản. Email đã xác thực không thay thế căn cước.</p><Link to="/account/verification" className="underline text-emerald-700">Xác thực căn cước VNeID</Link></section>:
      relationship==='ownership'?(user?.roles.includes('OWNER')?<VneidAssetImportForm onClose={back} onBack={back} onImported={()=>navigate('/app')}/>:<section className="border rounded-xl p-5 space-y-3"><p>Hoàn tất cấp quyền đọc tài sản VNeID để mở chức năng chủ cho thuê, sau đó quay lại tạo tài sản.</p><Link to="/account/owner-upgrade" className="text-emerald-700 underline">Kiểm tra tài sản và nâng cấp</Link></section>):
      <><p className="text-slate-600 mb-4">{relationship==='authorization'?'Người được ủy quyền':'Người thuê lại'} · Tạo tài sản nháp, sau đó gửi giấy tờ và thời hạn để Admin duyệt.</p><PropertyCreateForm key={relationship} onClose={back} onCreate={async input=>{
        const result=await createPropertyApplication(input,relationship==='authorization'?'AUTHORIZATION':'SUBLEASE');
        navigate('/account/rental-properties',{state:{openPropertyId:result.property.id}});
      }}/></>}
  </AccountLayout>;
}
