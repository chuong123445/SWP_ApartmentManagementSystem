import { Link, Navigate, useParams, useSearchParams } from 'react-router';
import { CustomerLayout } from '@/layouts/CustomerLayout';
import { useAccountVerification } from '@/hooks/useAccountVerification';
import { PropertyListingWizard } from '@/components/property/PropertyListingWizard';

const choices=[['ownership','Chính chủ','Nhập tài sản và nộp giấy tờ sở hữu để Admin xét duyệt.'],['authorization','Người được ủy quyền','Nhập tài sản, nộp giấy tờ sở hữu và giấy ủy quyền để Admin duyệt.'],['sublease','Người thuê lại','Nhập tài sản, nộp hợp đồng thuê gốc và văn bản cho phép cho thuê lại.']] as const;
export function PropertyCreatePage(){
  const {relationship}=useParams();const verification=useAccountVerification();const [query]=useSearchParams();
  if(relationship&&!choices.some(([key])=>key===relationship))return <Navigate to="/account/properties/new" replace/>;
  return <CustomerLayout><main className="home-wrap asset-page space-y-5"><Link to="/account/properties" className="inline-block text-brand-700 underline">Quay lại quản lý tài sản</Link><h1 className="app-page-title mb-3">Thêm tài sản cho thuê</h1>
    {!relationship?<><p className="text-slate-600 mb-5">Bạn là ai đối với bất động sản này?</p><div className="grid md:grid-cols-3 gap-4">{choices.map(([key,label,description])=><Link key={key} to={`/account/properties/new/${key}`} className="app-panel flex flex-col gap-3 p-6 hover:border-brand-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"><h2 className="font-bold text-lg text-brand-800">{label}</h2><p className="text-sm text-slate-600">{description}</p><span className="mt-auto pt-2 text-sm font-semibold text-brand-700">Tiếp tục →</span></Link>)}</div></>:
      verification.loading?<p role="status">Đang kiểm tra xác thực căn cước...</p>:verification.error?<p role="alert">{verification.error}<button onClick={verification.reload} className="ml-2 underline">Thử lại</button></p>:verification.data?.vneid.status!=='VERIFIED'?<section className="border rounded-xl bg-amber-50 p-5"><p>Cần hoàn tất xác thực căn cước trước khi tạo tài sản.</p><Link to="/account/verification" state={{returnTo:`/account/properties/new/${relationship}`}} className="underline text-brand-700">Xác thực căn cước</Link></section>:
      <PropertyListingWizard key={`${relationship}:${query.get('draft')??'new'}`} rightType={relationship==='ownership'?'OWNERSHIP':relationship==='authorization'?'AUTHORIZATION':'SUBLEASE'}/>}
  </main></CustomerLayout>;
}
