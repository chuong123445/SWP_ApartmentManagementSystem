import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { AccountLayout } from '@/layouts/AccountLayout';
import { IdentityImage } from '@/components/identity/IdentityImage';
import { VerifiedCitizenPanel } from '@/components/identity/VerifiedCitizenDetails';
import { getIdentity, saveIdentity } from '@/services/identity/identityService';
import { ApiError } from '@/services/http/client';
import type { IdentityFields, IdentityProfile } from '@/types/identity';
import { useAccountVerification } from '@/hooks/useAccountVerification';
import { useAuth } from '@/hooks/useAuth';

const empty: IdentityFields = { legalName: '', documentNumber: '', dateOfBirth: '', issueDate: '', issuePlace: '', permanentAddress: '', currentAddress: '' };
export function IdentityPage() {
  const verification = useAccountVerification();
  const { user } = useAuth();
  const verified = verification.data?.vneid.status === 'VERIFIED';
  const location = useLocation();
  const returnTo = typeof location.state?.returnTo === 'string' ? location.state.returnTo : '/account/settings';
  const isFromApartment = typeof location.state?.returnTo === 'string' && location.state.returnTo.startsWith('/apartments');
  const isFromManagement = typeof location.state?.returnTo === 'string' && (location.state.returnTo === '/app' || location.state.returnTo.startsWith('/app/'));
  const returnLabel = typeof location.state?.returnLabel === 'string'
    ? location.state.returnLabel
    : isFromApartment
      ? 'Quay lại xem căn hộ'
      : isFromManagement
        ? 'Quay lại trang quản lý'
        : typeof location.state?.returnTo === 'string'
          ? 'Quay lại'
          : 'Quay lại cài đặt tài khoản';
  const [saved, setSaved] = useState<IdentityProfile | null>(null);const [fields, setFields] = useState<IdentityFields>(empty);
  const [front, setFront] = useState<File | null>(null);const [back, setBack] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);const [saving, setSaving] = useState(false);const [stale, setStale] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');const [notice, setNotice] = useState('');const [revision, setRevision] = useState(0);
  const form = useRef<HTMLFormElement>(null);const maxDate = new Date().toLocaleDateString('en-CA');
  useEffect(() => {
    // Chỉ mở hồ sơ tự khai sau khi đã biết tài khoản chưa có căn cước xác thực.
    if (!verification.data || verified) return;
    const controller = new AbortController();setLoading(true);setReady(false);setError('');setNotice('');
    getIdentity(controller.signal).then(profile => {
      if (controller.signal.aborted) return;
      setSaved(profile);setFields(profile ?? empty);setFront(null);setBack(null);setStale(false);setReady(true);
      form.current?.querySelectorAll<HTMLInputElement>('input[type=file]').forEach(input => { input.value = ''; });
    }).catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Không tải được hồ sơ.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision, verified, verification.data, user?.id]);
  const change = (field: keyof IdentityFields, value: string) => setFields(previous => ({ ...previous, [field]: value }));
  const inputClass = 'w-full min-w-0 border border-slate-300 rounded-lg px-3 py-2 mt-1';
  const fileChange = (file: File | undefined, side: 'front' | 'back') => {
    if (file && (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 5 * 1024 * 1024 || file.size === 0)) {
      (side === 'front' ? setFront : setBack)(null);
      setError('Chỉ nhận ảnh PNG/JPEG, tối đa 5 MB mỗi ảnh.');return false;
    }
    setError('');(side === 'front' ? setFront : setBack)(file ?? null);return true;
  };
  return <AccountLayout>
    <Link to={returnTo} className="text-emerald-700 underline text-sm">{returnLabel}</Link>
    <h1 className="text-2xl font-bold mt-4 mb-3">Xác thực danh tính</h1>
    <VerifiedCitizenPanel state={verification} />
    {verified && <p className="text-slate-600">Bạn đã xác thực căn cước qua VNeID. Không cần nhập lại thông tin hoặc tải ảnh căn cước.</p>}
    {!verification.loading && !verification.error && verification.data && !verified && <>
    <h2 className="text-lg font-semibold mb-2">Hồ sơ ảnh giấy tờ tự khai</h2>
    <p className="text-slate-600 mb-4">Cung cấp thông tin căn cước và địa chỉ để chuẩn bị thông tin cá nhân khi thuê nhà. Hãy nhập đúng nội dung trên giấy tờ.</p>
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
      {saved?.localFixture && <p className="font-bold mb-2">Dữ liệu mẫu — không có giá trị xác minh hoặc làm giấy tờ pháp lý.</p>}
      <p className="font-semibold">{saved ? 'Đã cung cấp hồ sơ · Chưa xác minh danh tính' : 'Chưa cung cấp hồ sơ danh tính'}</p>
      <p className="text-sm mt-1">Hiện hệ thống chỉ lưu hồ sơ, chưa hỗ trợ kiểm tra eKYC. Tải giấy tờ lên không đồng nghĩa đã xác minh danh tính. Xác thực email được thực hiện riêng.</p>
    </div>
    {loading && <p role="status">Đang tải hồ sơ danh tính...</p>}
    {error && <p role="alert" className="text-rose-700 bg-rose-50 p-3 rounded-lg mb-4">{error}<button type="button" disabled={saving} onClick={() => setRevision(v => v + 1)} className="ml-3 underline">Tải lại hồ sơ đã lưu</button></p>}
    {notice && (
      <div role="status" className="bg-emerald-50 text-emerald-800 p-3.5 rounded-lg mb-4 space-y-1">
        <p>{notice}</p>
        {typeof location.state?.returnTo === 'string' && (
          <Link to={location.state.returnTo} className="inline-block text-xs font-semibold text-emerald-800 underline">
            {isFromApartment
              ? 'Quay lại căn hộ để tiếp tục gửi yêu cầu thuê →'
              : isFromManagement
                ? 'Quay lại trang quản lý để tiếp tục thêm tài sản →'
                : 'Quay lại trang trước →'}
          </Link>
        )}
      </div>
    )}
    {!loading && ready && <form ref={form} className="bg-white border rounded-xl p-4 sm:p-6" onSubmit={async e => {
      e.preventDefault();if (saving || stale) return;setError('');setNotice('');
      if (!saved && (!front || !back)) { setError('Cần ảnh mặt trước và mặt sau căn cước.');return; }
      if (fields.issueDate < fields.dateOfBirth) { setError('Ngày cấp không được trước ngày sinh.');return; }
      setSaving(true);
      try {
        // Send writable fields explicitly; server metadata must never round-trip as input.
        const input = Object.fromEntries(Object.keys(empty).map(key => [key, fields[key as keyof IdentityFields]])) as unknown as IdentityFields;
        const profile = await saveIdentity(input, saved?.version ?? null, front, back);
        setSaved(profile);setFields(profile);setFront(null);setBack(null);
        form.current?.querySelectorAll<HTMLInputElement>('input[type=file]').forEach(input => { input.value = ''; });
        setNotice('Đã lưu hồ sơ. Danh tính của bạn chưa được xác minh.');
      } catch (e) { setError(e instanceof Error ? e.message : 'Không lưu được hồ sơ.');if (e instanceof ApiError && e.status === 409) setStale(true); }
      finally { setSaving(false); }
    }}>
      <fieldset disabled={saving || stale} className="space-y-5 min-w-0">
        <div className="grid md:grid-cols-2 gap-4">
          <div><label htmlFor="identity-name">Họ và tên trên căn cước *</label><input id="identity-name" required maxLength={100} autoComplete="name" value={fields.legalName} onChange={e => change('legalName', e.target.value)} className={inputClass} /></div>
          <div><label htmlFor="identity-number">Số căn cước (12 chữ số) *</label><input id="identity-number" required pattern="[0-9]{12}" inputMode="numeric" maxLength={12} autoComplete="off" value={fields.documentNumber} onChange={e => change('documentNumber', e.target.value)} className={inputClass} /></div>
          <div><label htmlFor="identity-birthday">Ngày sinh *</label><input id="identity-birthday" required type="date" max={maxDate} value={fields.dateOfBirth} onChange={e => change('dateOfBirth', e.target.value)} className={inputClass} /></div>
          <div><label htmlFor="identity-issued">Ngày cấp *</label><input id="identity-issued" required type="date" max={maxDate} value={fields.issueDate} onChange={e => change('issueDate', e.target.value)} className={inputClass} /></div>
        </div>
        <div><label htmlFor="identity-place">Nơi cấp / cơ quan cấp *</label><input id="identity-place" required maxLength={200} value={fields.issuePlace} onChange={e => change('issuePlace', e.target.value)} className={inputClass} /></div>
        <div><label htmlFor="identity-permanent">Địa chỉ trên căn cước *</label><textarea id="identity-permanent" required rows={2} maxLength={500} value={fields.permanentAddress} onChange={e => change('permanentAddress', e.target.value)} className={inputClass} /></div>
        <div><label htmlFor="identity-current">Địa chỉ đang sinh sống *</label><textarea id="identity-current" required rows={2} maxLength={500} value={fields.currentAddress} onChange={e => change('currentAddress', e.target.value)} className={inputClass} /></div>
        <div><h2 className="font-bold">Ảnh căn cước</h2><p className="text-sm text-slate-500 mt-1">PNG hoặc JPEG, tối đa 5 MB mỗi ảnh. Ảnh và thông tin này chỉ bạn được truy cập trong chức năng hiện tại; không xuất hiện trong hồ sơ công khai.</p>
          <div className="grid md:grid-cols-2 gap-4 mt-3">{(['front', 'back'] as const).map(side => <div key={side} className="min-w-0 border p-3 rounded-xl">
            <label htmlFor={`identity-${side}`} className="font-semibold">{side === 'front' ? 'Mặt trước' : 'Mặt sau'}{!saved && ' *'}</label>
            <input id={`identity-${side}`} type="file" accept="image/png,image/jpeg" required={!saved} className="block w-full min-w-0 max-w-full text-sm mt-2" onChange={e => { if (!fileChange(e.target.files?.[0], side)) e.target.value = ''; }} />
            <IdentityImage side={side} file={side === 'front' ? front : back} stored={!!saved} revision={saved?.version ?? -1} />
          </div>)}</div>{saved && <p className="text-sm text-slate-500 mt-2">Giữ nguyên ảnh đã lưu nếu không chọn ảnh thay thế.</p>}
        </div>
        <button type="submit" disabled={saving || stale} className="bg-emerald-600 text-white rounded-lg px-5 py-2 disabled:opacity-50">{saving ? 'Đang lưu hồ sơ...' : 'Lưu hồ sơ danh tính'}</button>
      </fieldset>
    </form>}
    </>}
  </AccountLayout>;
}
