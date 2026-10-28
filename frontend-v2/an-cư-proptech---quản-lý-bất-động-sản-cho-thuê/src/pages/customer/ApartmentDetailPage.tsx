import {OwnerApartmentField, OwnerApartmentPhotos} from '@/components/apartments/OwnerApartmentEditor';
import {ApartmentGallery} from '@/components/apartments/ApartmentGallery';
import {saveAssetCommand} from '@/services/property/assetManagementService';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { MapPin, BedDouble, Bath, CheckCircle2, ArrowLeft, ShieldCheck, X } from 'lucide-react';
import { CustomerLayout } from '@/layouts/CustomerLayout';
import { useAuth } from '@/hooks/useAuth';
import { getApartment } from '@/services/apartments/apartmentService';
import { submitRentalRequest, getApartmentRentalRequests, cancelRentalRequest } from '@/services/rental/rentalService';
import { getAccountVerification, type AccountVerification } from '@/services/auth/vneidService';
import type { ApartmentDetail } from '@/types/apartment';
import type { RentalRequest } from '@/types/rental';
import { availabilityLabel, formatRent, requestStatusLabel } from '@/utils/format';
import { ApiError } from '@/services/http/client';
import { rightLabels } from '@/types/dossier';

export function ApartmentDetailPage() {
  const { id = '' } = useParams();
  const { user, loading:authLoading } = useAuth();
  const [ownerNotice,setOwnerNotice]=useState('');
  const [apartment, setApartment] = useState<ApartmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verification, setVerification] = useState<{
    accountId: string; version: number; data: AccountVerification | null; error: string;
  } | null>(null);
  const [submitted, setSubmitted] = useState<RentalRequest | null>(null);
  const [activeRequests, setActiveRequests] = useState<RentalRequest[]>([]);
  const [checking, setChecking] = useState(true);
  const [requestError, setRequestError] = useState('');
  const [revision, setRevision] = useState(0);
  const canRent = Boolean(apartment&&!apartment.management&&user?.roles.some(role => role === 'CUSTOMER' || role === 'OWNER'));
  const currentVerification = verification?.accountId === user?.id && verification?.version === user?.version ? verification : null;
  const checkingVerification = canRent && !currentVerification;
  const verificationError = currentVerification?.error ?? '';
  // Cùng chính sách Backend: email HOẶC bằng chứng VNeID đã xác thực.
  // Hồ sơ CCCD tự khai và contactVerificationStatus tổng hợp không thay điều kiện này.
  const customer = canRent && user?.accountStatus === 'ACTIVE' && Boolean(
    currentVerification?.data?.emailVerified || currentVerification?.data?.vneid?.status === 'VERIFIED',
  );
  useEffect(() => { setNeedsVerification(false); setShowVerificationModal(false); }, [id, user?.id]);
  useEffect(() => {
    const controller = new AbortController();
    setVerification(null);
    if (user && canRent) {
      const accountId = user.id, version = user.version;
      getAccountVerification(controller.signal)
        .then(data => { if (!controller.signal.aborted) setVerification({ accountId, version, data, error: '' }); })
        .catch(error => { if (!controller.signal.aborted) setVerification({ accountId, version, data: null,
          error: error instanceof Error ? error.message : 'Không thể tải trạng thái xác thực tài khoản.' }); });
    }
    return () => controller.abort();
  }, [user?.id, user?.version, canRent, revision]);
  useEffect(() => {
    let active = true;let inFlight = false;
    setChecking(true);setRequestError('');setSubmitted(null);setActiveRequests([]);
    if (!customer) { setChecking(false);return; }
    const refresh = async () => {
      if (!active || inFlight) return;
      inFlight = true;
      try {
        const [items, currentApartment] = await Promise.all([getApartmentRentalRequests(id), getApartment(id)]);
        if (active) { setActiveRequests(items);setSubmitted(items[0] ?? null);setApartment(currentApartment);setRequestError(''); }
      } catch (err) { if (active) setRequestError(err instanceof Error ? err.message : 'Không thể tải trạng thái yêu cầu.'); }
      finally { inFlight = false;if (active) setChecking(false); }
    };
    void refresh();
    const visibleRefresh = () => { if (document.visibilityState === 'visible') void refresh(); };
    const timer = window.setInterval(visibleRefresh, 10000);
    window.addEventListener('focus', visibleRefresh);document.addEventListener('visibilitychange', visibleRefresh);
    return () => { active = false;window.clearInterval(timer);window.removeEventListener('focus', visibleRefresh);document.removeEventListener('visibilitychange', visibleRefresh); };
  }, [id, user?.id, customer, revision]);
  useEffect(() => {
    if(authLoading)return;
    const controller = new AbortController();
    setLoading(true); setLoadError(''); setApartment(null); setSubmitted(null); setMessage(''); setError('');
    getApartment(id, controller.signal).then(setApartment).catch(err => { if (!controller.signal.aborted) setLoadError(err instanceof Error ? err.message : 'Không thể tải căn hộ.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id,user?.id,authLoading]);
  const reloadApartment=async()=>{setApartment(await getApartment(id));setOwnerNotice('Đã lưu thay đổi.');};
  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || submitted || checking || checkingVerification || verificationError || requestError) return;
    if (!customer) {
      setError('');
      setNeedsVerification(true);
      setShowVerificationModal(true);
      return;
    }
    setSaving(true); setError('');
    try { const item = await submitRentalRequest(id, message); setSubmitted(item); setActiveRequests([item]); }
    catch (err) {
      if (err instanceof ApiError && err.code === 'CONTACT_NOT_VERIFIED') {
        setNeedsVerification(true);
        setShowVerificationModal(true);
      } else {
        setError(err instanceof Error ? err.message : 'Không thể gửi yêu cầu thuê.');
        setRevision(value => value + 1);
      }
    }
    finally { setSaving(false); }
  };
  const cancel = async (request: RentalRequest) => {
    if (saving) return;
    setSaving(true); setError('');
    try { await cancelRentalRequest(request.id, request.version); setRevision(value => value + 1); }
    catch (err) { setError(err instanceof Error ? err.message : 'Không thể hủy yêu cầu.'); setRevision(value => value + 1); }
    finally { setSaving(false); }
  };
  return <CustomerLayout><main className="max-w-7xl mx-auto px-5 py-8">
    <Link to={apartment?.management?'/account/properties':'/'} className="inline-flex items-center gap-2 text-sm text-slate-500 mb-6"><ArrowLeft className="w-4 h-4" />{apartment?.management?'Quản lý tài sản':'Danh sách căn hộ'}</Link>
    {loading && <p role="status" className="py-16 text-center text-slate-500">Đang tải thông tin căn hộ...</p>}
    {loadError && <p role="alert" className="p-6 bg-white border border-rose-200 rounded-xl text-rose-700">{loadError}</p>}
    {apartment && !loading && <div className="grid lg:grid-cols-[2fr_1fr] gap-8">
      <section className="space-y-6"><div className="space-y-3"><ApartmentGallery key={apartment.id} images={apartment.images} title={apartment.title}/>{apartment.management&&<OwnerApartmentPhotos key={`${apartment.id}-photos`} apartment={apartment} onSaved={reloadApartment}/>}</div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6"><span className="inline-block bg-emerald-50 text-emerald-700 text-xs px-3 py-1 rounded-full mb-3">{availabilityLabel[apartment.availability]}</span>
          <OwnerApartmentField key={`${apartment.id}-title`} apartment={apartment} field="title" onSaved={reloadApartment}><h1 className="text-2xl font-bold text-slate-900 break-words">{apartment.title}</h1></OwnerApartmentField><p className="flex gap-2 text-sm text-slate-500 mt-3"><MapPin className="w-4 h-4 shrink-0" />{apartment.address}</p>
          <div className="flex flex-wrap gap-5 mt-5 text-sm text-slate-600"><span>{apartment.areaM2} m²</span><span className="flex gap-1.5 items-center"><BedDouble className="w-4 h-4" />{apartment.bedrooms === 0 ? 'Studio' : `${apartment.bedrooms} phòng ngủ`}</span><span className="flex gap-1.5 items-center"><Bath className="w-4 h-4" />{apartment.bathrooms} phòng tắm</span></div>
          {apartment.management&&<div className="mt-4"><OwnerApartmentField key={`${apartment.id}-occupants`} apartment={apartment} field="maxOccupants" onSaved={reloadApartment}><span className="text-sm">Số người tối đa: {apartment.management.maxOccupants??'Chưa có'}</span></OwnerApartmentField></div>}
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
          <OwnerApartmentField key={`${apartment.id}-description`} apartment={apartment} field="description" onSaved={reloadApartment}><h2 className="font-bold">Thông tin căn hộ</h2></OwnerApartmentField>
          <p className="text-sm text-slate-600 whitespace-pre-wrap break-words leading-7">{apartment.description}</p>
          <OwnerApartmentField key={`${apartment.id}-amenities`} apartment={apartment} field="amenities" onSaved={reloadApartment}><h2 className="font-bold mt-3">Tiện ích</h2></OwnerApartmentField>
          <div className="flex flex-wrap gap-2">{apartment.amenities.map((amenity,index)=><span key={index} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs break-words">{amenity}</span>)}</div>
        </div>
      </section>
      <aside className="space-y-5"><div className="bg-white border border-slate-200 rounded-2xl p-6 lg:sticky lg:top-24">
        <p className="text-sm text-slate-500">Giá niêm yết / tháng</p><OwnerApartmentField key={`${apartment.id}-rent`} apartment={apartment} field="monthlyRent" onSaved={reloadApartment}><p className="text-3xl font-bold text-emerald-700 mt-2">{formatRent(apartment.advertisedMonthlyRent)}</p></OwnerApartmentField>
        {apartment.lessorRelationship&&apartment.lessorRelationship!=='UNSPECIFIED'&&<p className="text-sm mt-2">Bên cho thuê: {rightLabels[apartment.lessorRelationship]}</p>}
        {apartment.rightsValidUntil&&<p className="text-sm mt-1">Quyền cho thuê đến hết: {apartment.rightsValidUntil}</p>}
        {(apartment.electricityUnitPrice != null||apartment.management?.canEdit)&&<OwnerApartmentField key={`${apartment.id}-electricity`} apartment={apartment} field="electricityUnitPrice" onSaved={reloadApartment}><p className="text-sm mt-2">Điện: {apartment.electricityUnitPrice!=null?formatRent(apartment.electricityUnitPrice):'Chưa có giá'}/kWh</p></OwnerApartmentField>}
        {(apartment.waterUnitPrice != null||apartment.management?.canEdit)&&<OwnerApartmentField key={`${apartment.id}-water`} apartment={apartment} field="waterUnitPrice" onSaved={reloadApartment}><p className="text-sm mt-2">Nước: {apartment.waterUnitPrice!=null?formatRent(apartment.waterUnitPrice):'Chưa có giá'}/m³</p></OwnerApartmentField>}
        {apartment.management?.priceLockReason&&<p className="text-sm text-amber-800 mt-3">{apartment.management.priceLockReason}</p>}
        <div className="my-5 border-y border-slate-100 py-4"><p className="text-xs text-slate-500 mb-1">Chủ nhà</p><p className="font-semibold">{apartment.publicOwner.displayName}</p><p className="text-xs text-slate-500 mt-1">{apartment.propertyName}</p></div>
        {error && <p role="alert" className="text-sm text-rose-700 mb-3">{error}</p>}
        {apartment.management?<section className="space-y-4" aria-label="Quản lý căn hộ của bạn"><h2 className="font-bold text-lg">Căn hộ của bạn</h2><p className="text-sm">{apartment.management.approvalStatus==='APPROVED'?(apartment.management.verificationSource?'Đã xác thực tài sản từ VNeID':'Tài sản đã được Admin duyệt'):`Trạng thái hồ sơ: ${apartment.management.approvalStatus}`}</p><p className="text-sm">{apartment.publicationStatus==='PUBLISHED'?'Đang công khai':apartment.publicationStatus==='HIDDEN'?'Đã ẩn tin':'Tin nháp'}</p>
          {!apartment.management.canEdit&&<Link to="/account/verification" className="underline">Xác thực tài khoản để chỉnh sửa</Link>}
          {apartment.management.canEdit&&apartment.management.approvalStatus==='APPROVED'&&user?.roles.includes('OWNER')&&<button type="button" disabled={saving||(apartment.publicationStatus!=='PUBLISHED'&&apartment.rentalRightsAvailable===false)} className="block border rounded-lg px-4 py-2 disabled:opacity-50" onClick={async()=>{setSaving(true);setError('');try{await saveAssetCommand(`/owner/apartments/${id}/publication`,'POST',{version:apartment.version,publicationStatus:apartment.publicationStatus==='PUBLISHED'?'HIDDEN':'PUBLISHED'});await reloadApartment();}catch(e){setError(e instanceof Error?e.message:'Không thể đổi trạng thái công khai.');}finally{setSaving(false);}}}>{apartment.publicationStatus==='PUBLISHED'?'Ẩn tin cho thuê':'Công khai căn hộ'}</button>}
          {!apartment.management.verificationSource&&<Link to="/account/rental-properties" state={{openPropertyId:apartment.management.propertyId}} className="block underline text-sm">Hồ sơ và giấy tờ tài sản</Link>}{ownerNotice&&<p role="status" className="text-emerald-700">{ownerNotice}</p>}
        </section>:checkingVerification ? <p role="status">Đang kiểm tra xác thực tài khoản...</p>
          : verificationError ? <div role="alert" className="text-sm text-rose-700"><p>{verificationError}</p><button type="button" onClick={() => setRevision(value => value + 1)} className="underline mt-2">Tải lại trạng thái xác thực</button></div>
          : checking ? <p role="status">Đang tải trạng thái yêu cầu...</p> : requestError ? <div role="alert"><p>{requestError}</p><button onClick={() => setRevision(value => value + 1)} className="underline mt-2">Thử lại</button></div> : submitted ? <div role="status" className="bg-emerald-50 border border-emerald-200 rounded-xl p-4"><CheckCircle2 className="w-6 h-6 text-emerald-600 mb-2" /><p className="font-semibold text-emerald-800">Đã gửi yêu cầu thuê</p><p className="text-sm text-emerald-700 mt-2">{submitted.status === 'ACCEPTED' ? 'Chủ nhà đã chấp nhận yêu cầu thuê.' : 'Yêu cầu đang chờ chủ nhà xử lý.'}</p>{activeRequests.map(request => <div key={request.id} className="mt-3"><p className="text-sm">{requestStatusLabel[request.status]}</p>{request.status === 'PENDING' && <button type="button" disabled={saving} onClick={() => cancel(request)} className="border border-rose-300 text-rose-700 rounded-lg px-4 py-2 mt-2 text-sm disabled:opacity-50">{saving ? 'Đang hủy...' : 'Hủy yêu cầu thuê'}</button>}</div>)}<Link to="/my/rental-requests" className="inline-block text-sm text-emerald-800 underline mt-3">Xem yêu cầu của tôi</Link></div>
          : apartment.availability !== 'VACANT' || apartment.rentalRightsAvailable===false ? <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-4">Căn hộ hiện không còn nhận yêu cầu thuê hoặc quyền cho thuê chưa có hiệu lực/đã hết hạn.</p>
          : !user ? <Link to="/login" state={{ returnTo: `/apartments/${id}` }} className="block text-center bg-emerald-600 text-white rounded-lg px-4 py-3 text-sm font-semibold">Đăng nhập để gửi yêu cầu thuê</Link>
          : !user.roles.some(role => role === 'CUSTOMER' || role === 'OWNER') ? <p className="text-sm text-slate-500">Gửi yêu cầu thuê bằng tài khoản người tìm thuê.</p>
          : <form onSubmit={send} className="space-y-3"><label htmlFor="rental-message" className="text-sm font-semibold block">Lời nhắn cho chủ nhà</label><textarea id="rental-message" rows={5} maxLength={2000} value={message} disabled={saving} onChange={e => setMessage(e.target.value)} placeholder="Giới thiệu nhu cầu thuê, thời gian dự kiến chuyển vào..." className="w-full border border-slate-300 rounded-lg p-3 text-sm" />
            <button type="submit" disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-3 text-sm font-semibold disabled:opacity-50">{saving ? 'Đang gửi...' : 'Gửi yêu cầu thuê'}</button>
            {needsVerification && !showVerificationModal && (
              <div role="alert" className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                <p>Bạn cần xác thực tài khoản trước khi gửi yêu cầu thuê.</p>
                <div className="flex flex-wrap gap-2 pt-1 items-center">
                  <Link to="/account/verification" state={{ returnTo: `/apartments/${id}` }} className="inline-block bg-emerald-600 text-white font-semibold rounded-lg px-3 py-1.5 text-xs">
                    Xác thực tài khoản
                  </Link>
                  <button type="button" onClick={() => setShowVerificationModal(true)} className="text-xs text-slate-600 underline ml-auto">
                    Chi tiết yêu cầu
                  </button>
                </div>
              </div>
            )}
            <p className="text-xs text-slate-500 leading-5">Gửi yêu cầu chưa giữ chỗ căn hộ. Chủ nhà sẽ xem xét và liên hệ với bạn.</p></form>}
      </div></aside>
    </div>}
    {showVerificationModal && (
      <div role="dialog" aria-modal="true" aria-labelledby="verification-modal-title" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 sm:p-7 max-w-lg w-full space-y-5">
          <div className="flex items-start justify-between gap-4">
            <h2 id="verification-modal-title" className="text-lg font-bold flex items-center gap-2"><ShieldCheck className="w-5 h-5 shrink-0" />Xác thực tài khoản</h2>
            <button type="button" aria-label="Đóng" onClick={() => setShowVerificationModal(false)} className="text-slate-500 p-1"><X className="w-5 h-5" /></button>
          </div>
          <p className="text-sm text-slate-600">Bạn cần xác thực tài khoản bằng email hoặc VNeID mô phỏng trước khi gửi yêu cầu thuê.</p>
          <Link to="/account/verification" state={{ returnTo: `/apartments/${id}` }} className="block text-center bg-emerald-600 text-white rounded-lg px-4 py-3 text-sm font-semibold">Quản lý xác thực tài khoản</Link>
        </div>
      </div>
    )}
  </main></CustomerLayout>;
}
