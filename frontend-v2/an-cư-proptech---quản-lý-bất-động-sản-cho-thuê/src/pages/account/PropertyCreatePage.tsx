import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router';
import { CustomerLayout } from '@/layouts/CustomerLayout';
import { useAuth } from '@/hooks/useAuth';
import { useAccountVerification } from '@/hooks/useAccountVerification';
import { PropertyListingWizard } from '@/components/property/PropertyListingWizard';
import { SourcePropertyOnboarding } from '@/components/property/SourcePropertyOnboarding';


const choices=[['ownership','Chính chủ','Chọn tài sản thuộc sở hữu từ VNeID và bổ sung thông tin cho thuê.'],['authorization','Người được ủy quyền','Nhập tài sản, nộp giấy tờ sở hữu và giấy ủy quyền để Admin duyệt.'],['sublease','Người thuê lại','Nhập tài sản, nộp hợp đồng thuê gốc và văn bản cho phép cho thuê lại.']] as const;
export function PropertyCreatePage(){
  const {relationship}=useParams();const navigate=useNavigate();const {reloadUser}=useAuth();const verification=useAccountVerification();
  const [query]=useSearchParams();const requestedPropertyId=query.get('propertyId');
  const propertyId=relationship==='ownership'&&requestedPropertyId&&/^[1-9]\d*$/.test(requestedPropertyId)?requestedPropertyId:undefined;
  if(relationship&&!choices.some(([key])=>key===relationship))return <Navigate to="/account/properties/new" replace/>;
  const back=()=>navigate(propertyId?'/account/properties':'/account/properties/new');
  return <CustomerLayout><main className="home-wrap asset-page space-y-5"><Link to="/account/properties" className="inline-block text-emerald-700 underline">Quay lại quản lý tài sản</Link><h1 className="text-2xl font-bold mb-3">{propertyId?'Bổ sung phòng cho thuê':'Thêm tài sản cho thuê'}</h1>
    {!relationship?<><p className="text-slate-600 mb-5">Bạn là ai đối với bất động sản này?</p><div className="grid md:grid-cols-3 gap-4">{choices.map(([key,label,description])=><Link key={key} to={`/account/properties/new/${key}`} className="border bg-white hover:border-emerald-600 rounded-2xl p-6 space-y-3"><h2 className="font-bold text-lg text-emerald-800">{label}</h2><p className="text-sm text-slate-600">{description}</p><span className="block text-sm font-semibold">Tiếp tục →</span></Link>)}</div></>:
      verification.loading?<p role="status">Đang kiểm tra xác thực căn cước...</p>:verification.error?<p role="alert">{verification.error}<button onClick={verification.reload} className="ml-2 underline">Thử lại</button></p>:verification.data?.vneid.status!=='VERIFIED'?<section className="border rounded-xl bg-amber-50 p-5"><p>Cần xác thực CCCD qua VNeID trước khi tạo tài sản. Email đã xác thực không thay thế căn cước.</p><Link to="/account/verification" state={{returnTo:`/account/properties/new/${relationship}`}} className="underline text-emerald-700">Xác thực căn cước VNeID</Link></section>:
      relationship==='ownership'&&query.get('mode')!=='manual'?<>
        {!propertyId&&<div className="border rounded-xl bg-white p-4 space-y-2"><p>Chọn dữ liệu nguồn hoặc nộp giấy tờ để Admin xét duyệt.</p><Link to="/account/properties/new/ownership?mode=manual" className="underline text-emerald-700">Nộp giấy tờ chính chủ thủ công</Link></div>}
        <SourcePropertyOnboarding propertyId={propertyId} onClose={back} onBack={back} onImported={async()=>{await reloadUser();navigate('/account/properties');}}/>
      </>:<PropertyListingWizard key={`${relationship}:${query.get('draft')??'new'}`} rightType={relationship==='ownership'?'OWNERSHIP':relationship==='authorization'?'AUTHORIZATION':'SUBLEASE'}/>}
  </main></CustomerLayout>;
}
