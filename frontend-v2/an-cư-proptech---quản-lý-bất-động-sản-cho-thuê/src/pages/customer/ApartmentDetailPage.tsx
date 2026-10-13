import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { MapPin, BedDouble, Bath, CheckCircle2, ArrowLeft } from 'lucide-react';
import { CustomerLayout } from '@/layouts/CustomerLayout';
import { useAuth } from '@/hooks/useAuth';
import { getApartment } from '@/services/apartments/apartmentService';
import { submitRentalRequest, getApartmentRentalRequests, cancelRentalRequest } from '@/services/rental/rentalService';
import type { ApartmentDetail } from '@/types/apartment';
import type { RentalRequest } from '@/types/rental';
import { availabilityLabel, formatRent, requestStatusLabel } from '@/utils/format';

export function ApartmentDetailPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const [apartment, setApartment] = useState<ApartmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState<RentalRequest | null>(null);
  const [activeRequests, setActiveRequests] = useState<RentalRequest[]>([]);
  const [checking, setChecking] = useState(true);
  const [requestError, setRequestError] = useState('');
  const [revision, setRevision] = useState(0);
  const customer = user?.roles.includes('CUSTOMER') && user.accountStatus === 'ACTIVE' && user.contactVerificationStatus === 'VERIFIED';
  useEffect(() => {
    let active = true;
    setChecking(true); setRequestError(''); setSubmitted(null); setActiveRequests([]);
    if (!customer) { setChecking(false); return; }
    getApartmentRentalRequests(id).then(items => { if (active) { setActiveRequests(items); setSubmitted(items[0] ?? null); } })
      .catch(err => { if (active) setRequestError(err instanceof Error ? err.message : 'Không thể tải trạng thái yêu cầu.'); })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
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
    setSaving(true); setError('');
    try { const item = await submitRentalRequest(id, message); setSubmitted(item); setActiveRequests([item]); }
    catch (err) { setError(err instanceof Error ? err.message : 'Không thể gửi yêu cầu thuê.'); setRevision(value => value + 1); }
    finally { setSaving(false); }
  };
  const cancel = async (request: RentalRequest) => {
    if (saving) return;
    setSaving(true); setError('');
    try { await cancelRentalRequest(request.id, request.version); setRevision(value => value + 1); }
    catch (err) { setError(err instanceof Error ? err.message : 'Không thể hủy yêu cầu.'); setRevision(value => value + 1); }
    finally { setSaving(false); }
  };
  const verifiedCustomer = user?.roles.includes('CUSTOMER') && user.accountStatus === 'ACTIVE' && user.contactVerificationStatus === 'VERIFIED';
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
        <div className="my-5 border-y border-slate-100 py-4"><p className="text-xs text-slate-500 mb-1">Chủ nhà</p><p className="font-semibold">{apartment.publicOwner.displayName}</p><p className="text-xs text-slate-500 mt-1">{apartment.propertyName}</p></div>
        {error && <p role="alert" className="text-sm text-rose-700 mb-3">{error}</p>}
        {checking ? <p role="status">Đang tải trạng thái yêu cầu...</p> : requestError ? <div role="alert"><p>{requestError}</p><button onClick={() => setRevision(value => value + 1)} className="underline mt-2">Thử lại</button></div> : submitted ? <div role="status" className="bg-emerald-50 border border-emerald-200 rounded-xl p-4"><CheckCircle2 className="w-6 h-6 text-emerald-600 mb-2" /><p className="font-semibold text-emerald-800">Đã gửi yêu cầu thuê</p><p className="text-sm text-emerald-700 mt-2">{submitted.status === 'ACCEPTED' ? 'Chủ nhà đã chấp nhận yêu cầu thuê.' : 'Yêu cầu đang chờ chủ nhà xử lý.'}</p>{activeRequests.map(request => <div key={request.id} className="mt-3"><p className="text-sm">{requestStatusLabel[request.status]}</p>{request.status === 'PENDING' && <button type="button" disabled={saving} onClick={() => cancel(request)} className="border border-rose-300 text-rose-700 rounded-lg px-4 py-2 mt-2 text-sm disabled:opacity-50">{saving ? 'Đang hủy...' : 'Hủy yêu cầu thuê'}</button>}</div>)}<Link to="/my/rental-requests" className="inline-block text-sm text-emerald-800 underline mt-3">Xem yêu cầu của tôi</Link></div>
          : apartment.availability !== 'VACANT' ? <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-4">Căn hộ hiện không còn nhận yêu cầu thuê.</p>
          : !user ? <Link to="/login" state={{ returnTo: `/apartments/${id}` }} className="block text-center bg-emerald-600 text-white rounded-lg px-4 py-3 text-sm font-semibold">Đăng nhập để gửi yêu cầu thuê</Link>
          : !user.roles.includes('CUSTOMER') ? <p className="text-sm text-slate-500">Gửi yêu cầu thuê bằng tài khoản người tìm thuê.</p>
          : !verifiedCustomer ? <div className="text-sm text-amber-800 bg-amber-50 rounded-lg p-4">Cần xác minh email hoặc số điện thoại trước khi gửi yêu cầu.<Link to="/account/verification" className="block underline mt-2">Xem trạng thái tài khoản</Link></div>
          : <form onSubmit={send} className="space-y-3"><label htmlFor="rental-message" className="text-sm font-semibold block">Lời nhắn cho chủ nhà</label><textarea id="rental-message" rows={5} maxLength={2000} value={message} disabled={saving} onChange={e => setMessage(e.target.value)} placeholder="Giới thiệu nhu cầu thuê, thời gian dự kiến chuyển vào..." className="w-full border border-slate-300 rounded-lg p-3 text-sm" />
            <button type="submit" disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-3 text-sm font-semibold disabled:opacity-50">{saving ? 'Đang gửi...' : 'Gửi yêu cầu thuê'}</button><p className="text-xs text-slate-500 leading-5">Gửi yêu cầu chưa giữ chỗ căn hộ. Chủ nhà sẽ xem xét và liên hệ với bạn.</p></form>}
      </div></aside>
    </div>}
  </main></CustomerLayout>;
}
