import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { MapPin, BedDouble, Bath, CheckCircle2, ArrowLeft, ShieldCheck, X, Check } from 'lucide-react';
import { CustomerLayout } from '@/layouts/CustomerLayout';
import { useAuth } from '@/hooks/useAuth';
import { getApartment } from '@/services/apartments/apartmentService';
import { submitRentalRequest, getApartmentRentalRequests, cancelRentalRequest } from '@/services/rental/rentalService';
import { getIdentity } from '@/services/identity/identityService';
import type { ApartmentDetail } from '@/types/apartment';
import type { RentalRequest } from '@/types/rental';
import type { IdentityProfile } from '@/types/identity';
import { availabilityLabel, formatRent, requestStatusLabel } from '@/utils/format';
import { ApiError } from '@/services/http/client';
import { rightLabels } from '@/types/dossier';

export function ApartmentDetailPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const [apartment, setApartment] = useState<ApartmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [identityProfile, setIdentityProfile] = useState<IdentityProfile | null | undefined>(undefined);
  const [submitted, setSubmitted] = useState<RentalRequest | null>(null);
  const [activeRequests, setActiveRequests] = useState<RentalRequest[]>([]);
  const [checking, setChecking] = useState(true);
  const [requestError, setRequestError] = useState('');
  const [revision, setRevision] = useState(0);
  const isEmailVerified = Boolean(user && user.roles.some(role => role === 'CUSTOMER' || role === 'OWNER') && user.accountStatus === 'ACTIVE' && user.contactVerificationStatus === 'VERIFIED');
  const hasIdentity = Boolean(identityProfile && identityProfile.documentNumber);
  const customer = isEmailVerified && hasIdentity;
  useEffect(() => { setNeedsVerification(false); setShowVerificationModal(false); }, [id, user?.id]);
  useEffect(() => {
    let active = true;
    if (user?.roles.some(role => role === 'CUSTOMER' || role === 'OWNER')) {
      getIdentity().then(profile => { if (active) setIdentityProfile(profile); }).catch(() => { if (active) setIdentityProfile(null); });
    } else {
      setIdentityProfile(null);
    }
    return () => { active = false; };
  }, [user?.id, revision]);
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
    const controller = new AbortController();
    setLoading(true); setLoadError(''); setApartment(null); setSubmitted(null); setMessage(''); setError('');
    getApartment(id, controller.signal).then(setApartment).catch(err => { if (!controller.signal.aborted) setLoadError(err instanceof Error ? err.message : 'Không thể tải căn hộ.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id]);
  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || submitted || checking || requestError) return;
    let currentId = identityProfile;
    if (currentId === undefined && user?.roles.some(role => role === 'CUSTOMER' || role === 'OWNER')) {
      try {
        currentId = await getIdentity();
        setIdentityProfile(currentId);
      } catch {
        currentId = null;
      }
    }
    const idPresent = Boolean(currentId && currentId.documentNumber);
    if (!isEmailVerified || !idPresent) {
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
    <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-500 mb-6"><ArrowLeft className="w-4 h-4" />Danh sách căn hộ</Link>
    {loading && <p role="status" className="py-16 text-center text-slate-500">Đang tải thông tin căn hộ...</p>}
    {loadError && <p role="alert" className="p-6 bg-white border border-rose-200 rounded-xl text-rose-700">{loadError}</p>}
    {apartment && !loading && <div className="grid lg:grid-cols-[2fr_1fr] gap-8">
      <section className="space-y-6"><img src={apartment.images[0]} alt={apartment.title} className="w-full h-72 md:h-96 object-cover bg-emerald-50 rounded-2xl" />
        <div className="bg-white border border-slate-200 rounded-2xl p-6"><span className="inline-block bg-emerald-50 text-emerald-700 text-xs px-3 py-1 rounded-full mb-3">{availabilityLabel[apartment.availability]}</span>
          <h1 className="text-2xl font-bold text-slate-900">{apartment.title}</h1><p className="flex gap-2 text-sm text-slate-500 mt-3"><MapPin className="w-4 h-4 shrink-0" />{apartment.address}</p>
          <div className="flex flex-wrap gap-5 mt-5 text-sm text-slate-600"><span>{apartment.areaM2} m²</span><span className="flex gap-1.5 items-center"><BedDouble className="w-4 h-4" />{apartment.bedrooms === 0 ? 'Studio' : `${apartment.bedrooms} phòng ngủ`}</span><span className="flex gap-1.5 items-center"><Bath className="w-4 h-4" />{apartment.bathrooms} phòng tắm</span></div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6"><h2 className="font-bold mb-3">Thông tin căn hộ</h2><p className="text-sm text-slate-600 whitespace-pre-wrap leading-7">{apartment.description}</p><h2 className="font-bold mt-6 mb-3">Tiện ích</h2><div className="flex flex-wrap gap-2">{apartment.amenities.map((amenity, index) => <span key={index} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs">{amenity}</span>)}</div></div>
      </section>
      <aside className="space-y-5"><div className="bg-white border border-slate-200 rounded-2xl p-6 lg:sticky lg:top-24">
        <p className="text-sm text-slate-500">Giá niêm yết / tháng</p><p className="text-3xl font-bold text-emerald-700 mt-2">{formatRent(apartment.advertisedMonthlyRent)}</p>
        {apartment.lessorRelationship&&apartment.lessorRelationship!=='UNSPECIFIED'&&<p className="text-sm mt-2">Bên cho thuê: {rightLabels[apartment.lessorRelationship]}</p>}
        {apartment.rightsValidUntil&&<p className="text-sm mt-1">Quyền cho thuê đến hết: {apartment.rightsValidUntil}</p>}
        {apartment.electricityUnitPrice != null && <p className="text-sm mt-2">Điện: {formatRent(apartment.electricityUnitPrice)}/kWh</p>}
        {apartment.waterUnitPrice != null && <p className="text-sm mt-1">Nước: {formatRent(apartment.waterUnitPrice)}/m³</p>}
        <div className="my-5 border-y border-slate-100 py-4"><p className="text-xs text-slate-500 mb-1">Chủ nhà</p><p className="font-semibold">{apartment.publicOwner.displayName}</p><p className="text-xs text-slate-500 mt-1">{apartment.propertyName}</p></div>
        {error && <p role="alert" className="text-sm text-rose-700 mb-3">{error}</p>}
        {checking ? <p role="status">Đang tải trạng thái yêu cầu...</p> : requestError ? <div role="alert"><p>{requestError}</p><button onClick={() => setRevision(value => value + 1)} className="underline mt-2">Thử lại</button></div> : submitted ? <div role="status" className="bg-emerald-50 border border-emerald-200 rounded-xl p-4"><CheckCircle2 className="w-6 h-6 text-emerald-600 mb-2" /><p className="font-semibold text-emerald-800">Đã gửi yêu cầu thuê</p><p className="text-sm text-emerald-700 mt-2">{submitted.status === 'ACCEPTED' ? 'Chủ nhà đã chấp nhận yêu cầu thuê.' : 'Yêu cầu đang chờ chủ nhà xử lý.'}</p>{activeRequests.map(request => <div key={request.id} className="mt-3"><p className="text-sm">{requestStatusLabel[request.status]}</p>{request.status === 'PENDING' && <button type="button" disabled={saving} onClick={() => cancel(request)} className="border border-rose-300 text-rose-700 rounded-lg px-4 py-2 mt-2 text-sm disabled:opacity-50">{saving ? 'Đang hủy...' : 'Hủy yêu cầu thuê'}</button>}</div>)}<Link to="/my/rental-requests" className="inline-block text-sm text-emerald-800 underline mt-3">Xem yêu cầu của tôi</Link></div>
          : apartment.availability !== 'VACANT' || apartment.rentalRightsAvailable===false ? <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-4">Căn hộ hiện không còn nhận yêu cầu thuê hoặc quyền cho thuê chưa có hiệu lực/đã hết hạn.</p>
          : !user ? <Link to="/login" state={{ returnTo: `/apartments/${id}` }} className="block text-center bg-emerald-600 text-white rounded-lg px-4 py-3 text-sm font-semibold">Đăng nhập để gửi yêu cầu thuê</Link>
          : !user.roles.some(role => role === 'CUSTOMER' || role === 'OWNER') ? <p className="text-sm text-slate-500">Gửi yêu cầu thuê bằng tài khoản người tìm thuê.</p>
          : <form onSubmit={send} className="space-y-3"><label htmlFor="rental-message" className="text-sm font-semibold block">Lời nhắn cho chủ nhà</label><textarea id="rental-message" rows={5} maxLength={2000} value={message} disabled={saving} onChange={e => setMessage(e.target.value)} placeholder="Giới thiệu nhu cầu thuê, thời gian dự kiến chuyển vào..." className="w-full border border-slate-300 rounded-lg p-3 text-sm" />
            <button type="submit" disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-3 text-sm font-semibold disabled:opacity-50">{saving ? 'Đang gửi...' : 'Gửi yêu cầu thuê'}</button>
            {needsVerification && !showVerificationModal && (
              <div role="alert" className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                <p>Bạn cần xác thực tài khoản trước khi gửi yêu cầu thuê.</p>
                <div className="flex flex-wrap gap-2 pt-1 items-center">
                  {!isEmailVerified && (
                    <Link to="/account/settings/email" state={{ returnTo: `/apartments/${id}` }} className="inline-block bg-emerald-600 text-white font-semibold rounded-lg px-3 py-1.5 text-xs">
                      Xác thực email
                    </Link>
                  )}
                  {!hasIdentity && (
                    <Link to="/account/settings/identity" state={{ returnTo: `/apartments/${id}` }} className="inline-block border border-emerald-600 text-emerald-700 font-semibold rounded-lg px-3 py-1.5 text-xs bg-white">
                      Cập nhật CCCD
                    </Link>
                  )}
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 sm:p-7 max-w-lg w-full relative space-y-5 animate-in fade-in zoom-in-95">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 id="verification-modal-title" className="text-lg sm:text-xl font-bold text-slate-900">
                  {!isEmailVerified && !hasIdentity
                    ? 'Xác thực tài khoản & danh tính'
                    : !isEmailVerified
                    ? 'Xác thực email tài khoản'
                    : 'Bổ sung xác thực danh tính'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {!isEmailVerified && !hasIdentity
                    ? 'Cần hoàn tất cả 2 bước xác thực trước khi gửi yêu cầu thuê'
                    : !isEmailVerified
                    ? 'Cần xác thực email để kích hoạt quyền gửi yêu cầu thuê'
                    : 'Email đã xác minh, vui lòng bổ sung thông tin CCCD'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowVerificationModal(false)}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div role="alert" className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-1">
            <p className="font-semibold text-xs uppercase tracking-wider text-amber-800">Yêu cầu xác thực</p>
            <p className="text-xs leading-5">
              {!isEmailVerified && !hasIdentity
                ? 'Bạn cần xác thực tài khoản trước khi gửi yêu cầu thuê. Vui lòng xác thực email và hoàn thiện thông tin căn cước công dân.'
                : !isEmailVerified
                ? 'Bạn cần xác thực tài khoản trước khi gửi yêu cầu thuê. Vui lòng hoàn tất xác thực email qua mã OTP.'
                : 'Bạn cần xác thực tài khoản trước khi gửi yêu cầu thuê. Vui lòng bổ sung hồ sơ căn cước công dân để chủ nhà có đủ căn cứ pháp lý xem xét yêu cầu thuê.'}
            </p>
          </div>

          <div className="space-y-3">
            <div className={`p-4 rounded-xl border transition-all ${isEmailVerified ? 'bg-emerald-50/60 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isEmailVerified ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    {isEmailVerified ? <Check className="w-4 h-4" /> : '1'}
                  </span>
                  <div>
                    <p className="font-semibold text-sm text-slate-900">1. Xác thực email</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isEmailVerified ? `Đã xác thực: ${user?.email}` : 'Nhận mã OTP qua email để xác nhận'}
                    </p>
                  </div>
                </div>
                {isEmailVerified ? (
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Đã xác thực
                  </span>
                ) : (
                  <Link
                    to="/account/settings/email"
                    state={{ returnTo: `/apartments/${id}` }}
                    className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg shadow-xs transition-colors shrink-0"
                  >
                    Xác thực email
                  </Link>
                )}
              </div>
            </div>

            <div className={`p-4 rounded-xl border transition-all ${hasIdentity ? 'bg-emerald-50/60 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${hasIdentity ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    {hasIdentity ? <Check className="w-4 h-4" /> : '2'}
                  </span>
                  <div>
                    <p className="font-semibold text-sm text-slate-900">2. Xác thực danh tính (CCCD)</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {hasIdentity ? `Đã có hồ sơ CCCD: ${identityProfile?.documentNumber}` : 'Cung cấp số CCCD và ảnh 2 mặt'}
                    </p>
                  </div>
                </div>
                {hasIdentity ? (
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Đã hoàn tất
                  </span>
                ) : (
                  <Link
                    to="/account/settings/identity"
                    state={{ returnTo: `/apartments/${id}` }}
                    className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg shadow-xs transition-colors shrink-0"
                  >
                    Cập nhật CCCD
                  </Link>
                )}
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => setShowVerificationModal(false)}
              className="border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    )}
  </main></CustomerLayout>;
}
